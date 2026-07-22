import {
  createGLContext,
  getGLContextInfo,
  resizeCanvasToDisplaySize,
} from "./rendering/createGLContext.js";
import vertSrc from "./shaders/simple.vert?glslify";
import fragSrc from "./shaders/water.frag?glslify";


function prepareShaderSource(api, type, source) {
  if (api !== "webgl2" || /^\s*#version\s+300\s+es/m.test(source)) {
    return source;
  }

  let compatibleSource = source;
  if (type === "vertex") {
    compatibleSource = compatibleSource
      .replace(/\battribute\b/g, "in")
      .replace(/\bvarying\b/g, "out");
  } else {
    compatibleSource = compatibleSource
      .replace(/\bvarying\b/g, "in")
      .replace(/\btexture2D\s*\(/g, "texture(")
      .replace(/\bgl_FragColor\b/g, "rainFragmentColor")
      .replace(/\bvoid\s+main\s*\(/, "out vec4 rainFragmentColor;\nvoid main(");
  }

  return `#version 300 es\n${compatibleSource}`;
}


function createShader(gl, api, type, source) {
  const shader = gl.createShader(type);
  const shaderType = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
  gl.shaderSource(shader, prepareShaderSource(api, shaderType, source));
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`${api} ${shaderType} shader compile error: ${error}`);
  }
  return shader;
}


function createProgram(gl, api, vertexSource, fragmentSource) {
  const vertexShader = createShader(
    gl,
    api,
    gl.VERTEX_SHADER,
    vertexSource,
  );
  const fragmentShader = createShader(
    gl,
    api,
    gl.FRAGMENT_SHADER,
    fragmentSource,
  );
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.bindAttribLocation(program, 0, "a_position");
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`${api} program link error: ${error}`);
  }
  return program;
}


export default class RainLayer {
  constructor(
    canvas,
    {
      vertex = vertSrc,
      fragment = fragSrc,
      textures = {},
      options = {},
      context = {},
      onContextLost = null,
      onContextRestored = null,
    } = {},
  ) {
    this.canvas = canvas;
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

    this.gl = createGLContext(canvas, {
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

    this.contextInfo = getGLContextInfo(this.gl);
    this._initializeResources();
    this.running = true;
  }

  _initializeResources() {
    const gl = this.gl;
    if (!gl) return;

    this.program = createProgram(
      gl,
      this.contextInfo?.api ?? "webgl1",
      this.vertexSrc,
      this.fragmentSrc,
    );
    this._initBuffers();
    this.textures = {};
    this._setupDefaultUniforms();

    for (const [name, source] of Object.entries(this.textureSources)) {
      this._uploadTexture(name, source);
    }
    for (const [name, value] of Object.entries(this.uniformValues)) {
      this._applyUniform(name, value);
    }
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
      this._initializeResources();
      this.contextLost = false;
      this.running = true;
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
    try {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
      return true;
    } catch {
      return false;
    }
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
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
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
  }

  setVisible(visible) {
    this.canvas.style.display = visible ? "block" : "none";
  }

  getDiagnostics() {
    return {
      ...this.contextInfo,
      contextLost: this.contextLost,
      running: this.running,
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
