import {
  createGLContext,
  getGLContextInfo,
  resizeCanvasToDisplaySize,
} from "./rendering/createGLContext.js";
import { buildProgram, formatShaderLog } from "./rendering/shaderProgram.js";
import { RAIN_VERTEX, WATER_FRONT } from "./shaders/index.js";

const now = () => globalThis.performance?.now?.() ?? Date.now();

function detectApi(gl) {
  return typeof WebGL2RenderingContext !== "undefined" &&
    gl instanceof WebGL2RenderingContext
    ? "webgl2"
    : "webgl1";
}

const sameValue = (a, b) =>
  a === b ||
  (Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((v, i) => v === b[i]));


/**
 * One fullscreen rain pass.
 *
 * By default the layer owns its canvas's context (created through
 * `createGLContext`) and replaces the canvas contents each frame. Pass `gl`
 * to draw inside a context someone else owns (the cabinet's Three.js
 * renderer, via `src/rendering/Compositor.js`), and `composite: "over"` to
 * blend over what that owner already drew instead of clearing it.
 */
export default class RainLayer {
  constructor(
    canvas,
    {
      vertex = RAIN_VERTEX,
      fragment = WATER_FRONT,
      textures = {},
      options = {},
      context = {},
      gl = null,
      composite = "replace",
      onContextLost = null,
      onContextRestored = null,
    } = {},
  ) {
    this.canvas = canvas;
    /** False when drawing into an injected, externally owned context. */
    this.ownsContext = !gl;
    /** "replace" clears then draws; "over" blends premultiplied over the framebuffer. */
    this.composite = composite;
    /** Mirrors setVisible(); the dock's front/back rain toggles. */
    this.visible = true;
    /** Framebuffer-copy texture sizes, keyed by sampler name. */
    this._copySizes = {};
    this.vertexSrc = vertex;
    this.fragmentSrc = fragment;
    this.textureSources = { ...textures };
    this.uniformValues = { ...options };
    this.textures = {};
    this.uniforms = {};
    this.program = null;
    this.vbo = null;
    this.contextLost = false;
    this.running = false;
    this.destroyed = false;
    /** Structured compile/link log of the most recent program build. */
    this.shaderLog = null;
    /** Number of program builds (1 + one per context restoration). */
    this.shaderBuilds = 0;
    /** Summary of the last build failure, or null. */
    this.error = null;
    /** Per-sampler upload timing: { kind: "texImage2D" | "copy", count, lastMs, maxMs, totalMs }. */
    this.uploadStats = {};
    /** The most recent upload: { name, ms, kind }. */
    this.lastUpload = null;
    this.onContextLost = onContextLost;
    this.onContextRestored = onContextRestored;

    this._handleContextLost = this._handleContextLost.bind(this);
    this._handleContextRestored = this._handleContextRestored.bind(this);
    canvas.addEventListener("webglcontextlost", this._handleContextLost, false);
    canvas.addEventListener(
      "webglcontextrestored",
      this._handleContextRestored,
      false,
    );

    this.gl = gl ?? createGLContext(canvas, {
      ...context,
      attributes: {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false,
        ...context.attributes,
      },
      label: context.label ?? `RainLayer#${canvas.id || "canvas"}`,
    });

    if (!this.gl) {
      console.error("[RainLayer] WebGL is unavailable.");
      return;
    }

    this.contextInfo = getGLContextInfo(this.gl) ?? {
      api: detectApi(this.gl),
      attributes: this.gl.getContextAttributes?.() ?? null,
      extensions: {},
    };
    this.running = this._initializeResources();
  }

  /** Build program + buffers + textures. Returns false if shaders failed. */
  _initializeResources() {
    const gl = this.gl;
    if (!gl) return false;

    const { program, log } = buildProgram(gl, this.contextInfo?.api ?? "webgl1", {
      vertex: this.vertexSrc,
      fragment: this.fragmentSrc,
    });
    this.shaderBuilds += 1;
    this.shaderLog = log;
    this.program = program;
    this.error = log.error;
    if (!program) {
      console.error(
        `[RainLayer#${this.canvas.id || "canvas"}] ${log.error}\n${formatShaderLog(log)}`,
      );
      return false;
    }
    this._initBuffers();
    this.textures = {};
    this._copySizes = {};
    this._setupDefaultUniforms();

    for (const [name, source] of Object.entries(this.textureSources)) {
      this._uploadTexture(name, source);
    }
    for (const [name, value] of Object.entries(this.uniformValues)) {
      this._applyUniform(name, value);
    }
    return true;
  }

  _initBuffers() {
    const gl = this.gl;
    if (!gl) return;
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
  }

  _setupDefaultUniforms() {
    const gl = this.gl;
    if (!gl) return;
    gl.useProgram(this.program);
    const getUniform = (name) => gl.getUniformLocation(this.program, name);
    this.uniforms = {
      u_resolution: getUniform("u_resolution"),
      u_parallax: getUniform("u_parallax"),
      u_brightness: getUniform("u_brightness"),
      u_textureFg: getUniform("u_textureFg"),
      u_textureBg: getUniform("u_textureBg"),
      u_waterMap: getUniform("u_waterMap"),
      u_renderShine: getUniform("u_renderShine"),
      u_renderShadow: getUniform("u_renderShadow"),
      u_minRefraction: getUniform("u_minRefraction"),
      u_refractionDelta: getUniform("u_refractionDelta"),
      u_alphaMultiply: getUniform("u_alphaMultiply"),
      u_alphaSubtract: getUniform("u_alphaSubtract"),
      u_parallaxFg: getUniform("u_parallaxFg"),
      u_parallaxBg: getUniform("u_parallaxBg"),
      u_textureRatio: getUniform("u_textureRatio"),
      u_textureShine: getUniform("u_textureShine"),
    };
  }

  _handleContextLost(event) {
    event.preventDefault();
    if (this.destroyed || this.contextLost) return;
    this.contextLost = true;
    this.running = false;
    this.onContextLost?.(this, event);
  }

  _handleContextRestored(event) {
    if (this.destroyed) return;
    try {
      this.contextInfo = getGLContextInfo(this.gl) ?? this.contextInfo;
      this.contextLost = false;
      this.running = this._initializeResources();
      this.onContextRestored?.(this, event);
    } catch (error) {
      console.error("[RainLayer] Failed to rebuild restored context.", error);
    }
  }

  setSize(cssWidth, cssHeight, dpr = globalThis.devicePixelRatio || 1) {
    return resizeCanvasToDisplaySize(
      this.canvas,
      cssWidth,
      cssHeight,
      dpr,
    );
  }

  setParallax(x, y) {
    this.setUniform("u_parallax", [x, y]);
  }

  setUniform(name, value) {
    this.uniformValues[name] = value;
    this._applyUniform(name, value);
  }

  /** Apply many uniforms, skipping values that are already current. */
  setUniforms(values) {
    for (const [name, value] of Object.entries(values)) {
      if (!sameValue(this.uniformValues[name], value)) this.setUniform(name, value);
    }
  }

  _applyUniform(name, value) {
    const gl = this.gl;
    if (!gl || this.contextLost || !this.program) return;
    const uniform = this.uniforms[name];
    if (uniform === null || uniform === undefined) return;
    gl.useProgram(this.program);
    if (typeof value === "boolean") gl.uniform1i(uniform, value ? 1 : 0);
    else if (typeof value === "number") gl.uniform1f(uniform, value);
    else if (Array.isArray(value) && value.length === 2) {
      gl.uniform2f(uniform, value[0], value[1]);
    }
  }

  bindTexture(uniformName, source) {
    this.textureSources[uniformName] = source;
    return this._uploadTexture(uniformName, source);
  }

  _uploadTexture(uniformName, source) {
    const gl = this.gl;
    if (!gl || this.contextLost || !source) return false;

    this._bindTextureForWrite(uniformName);
    this._resetUnpackState();
    const start = now();
    try {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
    } catch {
      return false;
    }
    this._recordUpload(uniformName, now() - start);
    return true;
  }

  /**
   * Copy the context's current default framebuffer (what the owner just drew
   * this frame) into the sampler `uniformName`. A GPU-side copy inside one
   * context: no canvas readback, no cross-context upload, and it works with
   * `preserveDrawingBuffer: false` because it runs before the frame is
   * presented.
   */
  copyFramebufferTo(uniformName) {
    const gl = this.gl;
    if (!gl || this.contextLost) return false;
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    delete this.textureSources[uniformName]; // re-copied every frame, never cached
    this._bindTextureForWrite(uniformName);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const start = now();
    const size = this._copySizes[uniformName];
    if (size && size.width === width && size.height === height) {
      gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, width, height);
    } else {
      gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, width, height, 0);
      this._copySizes[uniformName] = { width, height };
    }
    this._recordUpload(uniformName, now() - start, "copy");
    return true;
  }

  _bindTextureForWrite(uniformName) {
    const gl = this.gl;
    let texture = this.textures[uniformName];
    if (!texture) {
      texture = gl.createTexture();
      this.textures[uniformName] = texture;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  /**
   * Unpack defaults for texImage2D. A shared context's owner (Three.js sets
   * UNPACK_FLIP_Y_WEBGL per texture) may have left these changed.
   */
  _resetUnpackState() {
    const gl = this.gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    if (this.contextInfo?.api === "webgl2") {
      gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
      gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
      gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
    }
  }

  /** Draw state this pass relies on, set explicitly (contexts may be shared). */
  _resetDrawState() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (this.contextInfo?.api === "webgl2") gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.colorMask(true, true, true, true);
    if (this.composite === "over") {
      // The pass outputs colour the page compositor treats as premultiplied
      // (premultipliedAlpha: true), so "over" in-context is ONE, 1-srcAlpha:
      // identical to the browser stacking a separate rain canvas on top.
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    } else {
      gl.disable(gl.BLEND);
    }
  }

  _recordUpload(name, ms, kind = "texImage2D") {
    const stats = (this.uploadStats[name] ??= {
      kind,
      count: 0,
      lastMs: 0,
      maxMs: 0,
      totalMs: 0,
    });
    stats.count += 1;
    stats.lastMs = ms;
    stats.maxMs = Math.max(stats.maxMs, ms);
    stats.totalMs += ms;
    stats.kind = kind;
    this.lastUpload = { name, ms, kind };
  }

  _bindTexturesForDraw() {
    const gl = this.gl;
    if (!gl) return;
    gl.useProgram(this.program);
    let textureUnit = 0;
    for (const [name, texture] of Object.entries(this.textures)) {
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      const location = gl.getUniformLocation(this.program, name);
      if (location !== null) gl.uniform1i(location, textureUnit);
      textureUnit += 1;
    }
  }

  render() {
    const gl = this.gl;
    if (!gl || !this.running || this.contextLost || !this.program) return;
    this._resetDrawState();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if (this.composite !== "over") {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    if (this.uniforms.u_resolution) {
      gl.uniform2f(
        this.uniforms.u_resolution,
        this.canvas.width,
        this.canvas.height,
      );
    }
    this._bindTexturesForDraw();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (this.composite === "over") gl.disable(gl.BLEND);
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.canvas.style.display = visible ? "block" : "none";
  }

  getDiagnostics() {
    const uploads = {};
    for (const [name, stats] of Object.entries(this.uploadStats)) {
      uploads[name] = {
        kind: stats.kind,
        count: stats.count,
        lastMs: stats.lastMs,
        maxMs: stats.maxMs,
        averageMs: stats.count ? stats.totalMs / stats.count : 0,
      };
    }
    return {
      api: this.contextInfo?.api ?? null,
      ownsContext: this.ownsContext,
      composite: this.composite,
      visible: this.visible,
      attributes: this.contextInfo?.attributes ?? null,
      extensions: this.contextInfo?.extensions ?? {},
      contextLost: this.contextLost,
      running: this.running,
      destroyed: this.destroyed,
      error: this.error,
      shaderLog: this.shaderLog,
      shaderBuilds: this.shaderBuilds,
      uploads,
      lastTexImage2D: this.lastUpload ? { ...this.lastUpload } : null,
      drawingBuffer: {
        width: this.canvas.width,
        height: this.canvas.height,
      },
      displaySize: {
        width: this.canvas.clientWidth,
        height: this.canvas.clientHeight,
      },
    };
  }

  destroy() {
    this.destroyed = true;
    this.running = false;
    this.canvas.removeEventListener("webglcontextlost", this._handleContextLost);
    this.canvas.removeEventListener(
      "webglcontextrestored",
      this._handleContextRestored,
    );

    const gl = this.gl;
    if (!gl || this.contextLost) return;
    Object.values(this.textures).forEach((texture) => gl.deleteTexture(texture));
    if (this.vbo) gl.deleteBuffer(this.vbo);
    if (this.program) gl.deleteProgram(this.program);
  }
}
