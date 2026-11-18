// @ts-check
/**
 * Shared-context compositing: run the front rain refraction pass *inside* a
 * host's WebGL2 context, directly after the host renders its frame.
 *
 * The host is the 3D cabinet (Three.js `WebGLRenderer`, whose context comes
 * from `createGLContext`). Per frame, inside one AppClock tick:
 *
 *   1. host.renderFrame()          Three draws the cabinet to its canvas
 *   2. host.resetGLState()         GL defaults before raw GL (VAO, blend, FBO)
 *   3. pass.copyFramebufferTo()    GPU copy of that frame → refraction source
 *   4. pass.bindTexture(waterMap)  water map from the WASM/JS sim
 *   5. pass.render()               drops blended "over" the cabinet frame
 *   6. host.resetGLState()         invalidate Three's state cache
 *
 * Nothing crosses a context boundary: no `texImage2D(cabinetCanvas)` into the
 * rain contexts, and `preserveDrawingBuffer` stays false because the copy
 * happens before the browser presents the frame. See
 * docs/rendering-contexts.md ("Cabinet-to-rain compositing").
 */

/** @typedef {import("./createGLContext.js").GLContext} GLContext */

/**
 * @typedef {object} CompositorHost
 * @property {() => HTMLCanvasElement} getRendererCanvas
 * @property {() => GLContext} getGLContext
 * @property {() => void} renderFrame
 * @property {() => void} resetGLState
 */

/**
 * The slice of RainLayer the compositor drives.
 * @typedef {object} CompositorPass
 * @property {boolean} running
 * @property {(uniformName: string) => boolean} copyFramebufferTo
 * @property {(uniformName: string, source: TexImageSource) => unknown} bindTexture
 * @property {(values: Record<string, unknown>) => void} setUniforms
 * @property {() => void} render
 * @property {() => Record<string, any>} getDiagnostics
 * @property {() => void} destroy
 */

/**
 * @typedef {object} CreatePassOptions
 * @property {() => void} onContextRestored Must be forwarded to the pass so
 *   the host's state cache is reset after the pass rebuilds its resources.
 */

const now = () => globalThis.performance?.now?.() ?? Date.now();

/** Sampler the host frame is copied into (water.frag refracts u_textureFg). */
export const HOST_FRAME_SAMPLER = "u_textureFg";
export const WATER_MAP_SAMPLER = "u_waterMap";

export class Compositor {
  /**
   * @param {{
   *   host: CompositorHost,
   *   createPass: (canvas: HTMLCanvasElement, gl: GLContext, options: CreatePassOptions) => CompositorPass,
   * }} deps
   */
  constructor({ host, createPass }) {
    this.host = host;
    this.createPass = createPass;
    /** @type {CompositorPass | null} */
    this._pass = null;
    this.stats = { frames: 0, lastMs: 0, maxMs: 0, totalMs: 0 };
  }

  /** The pass, created on first use inside the host's context. */
  get pass() {
    if (!this._pass) {
      this._pass = this.createPass(this.host.getRendererCanvas(), this.host.getGLContext(), {
        onContextRestored: () => this.host.resetGLState(),
      });
      // Building the pass (program, buffer, uniforms) changed GL state behind
      // the host's cache.
      this.host.resetGLState();
    }
    return this._pass;
  }

  /** True when the pass can draw this frame (built, context healthy). */
  get ready() {
    return this.pass.running;
  }

  /**
   * Render the host and composite the rain over it. Returns false without
   * touching the host when the pass cannot run, so the caller can fall back.
   *
   * @param {{ waterMap: TexImageSource, uniforms: Record<string, unknown> }} input
   */
  frame(input) {
    if (!this.ready) return false;
    this.host.renderFrame();
    return this.composite(input);
  }

  /**
   * Steps 2–6 only: composite over whatever the host drew this task.
   * @param {{ waterMap: TexImageSource, uniforms: Record<string, unknown> }} input
   */
  composite({ waterMap, uniforms }) {
    const pass = this.pass;
    if (!pass.running) return false;
    const start = now();
    this.host.resetGLState();
    pass.copyFramebufferTo(HOST_FRAME_SAMPLER);
    pass.bindTexture(WATER_MAP_SAMPLER, waterMap);
    pass.setUniforms(uniforms);
    pass.render();
    this.host.resetGLState();
    const ms = now() - start;
    const s = this.stats;
    s.frames += 1;
    s.lastMs = ms;
    s.maxMs = Math.max(s.maxMs, ms);
    s.totalMs += ms;
    return true;
  }

  getDiagnostics() {
    const s = this.stats;
    return {
      frames: s.frames,
      lastMs: s.lastMs,
      maxMs: s.maxMs,
      averageMs: s.frames ? s.totalMs / s.frames : 0,
      pass: this._pass ? this._pass.getDiagnostics() : null,
    };
  }

  destroy() {
    this._pass?.destroy();
    this._pass = null;
  }
}
