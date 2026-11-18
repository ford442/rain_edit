// Public type surface for the WebGL rain pass. Authored declaration: the
// runtime lives in RainLayer.js; this describes the API other modules depend on.

import type { ShaderInput, ShaderLog } from "./rendering/shaderProgram.js";
import type { CreateGLContextOptions } from "./rendering/createGLContext.js";

export interface RainLayerOptions {
  /** Vertex stage: a `{ name, es300, es100 }` bundle (src/shaders/index.js) or raw GLSL. */
  vertex?: ShaderInput;
  /** Fragment stage: a `{ name, es300, es100 }` bundle or raw GLSL. */
  fragment?: ShaderInput;
  /** Texture sources keyed by uniform sampler name. */
  textures?: Record<string, TexImageSource>;
  /** Initial uniform values keyed by uniform name. */
  options?: Record<string, number | boolean | number[]>;
  /** Options forwarded to createGLContext (e.g. `preferWebGL2: false`). Ignored with `gl`. */
  context?: CreateGLContextOptions;
  /**
   * Draw inside an existing context owned by someone else (the cabinet's
   * Three.js renderer via src/rendering/Compositor.js) instead of creating one.
   */
  gl?: WebGL2RenderingContext | WebGLRenderingContext | null;
  /** "replace" (default) clears then draws; "over" blends premultiplied over the framebuffer. */
  composite?: "replace" | "over";
  onContextLost?: ((layer: RainLayer, event: Event) => void) | null;
  onContextRestored?: ((layer: RainLayer, event: Event) => void) | null;
}

export interface TextureUploadStats {
  /** "texImage2D" for source uploads, "copy" for copyFramebufferTo. */
  kind: "texImage2D" | "copy";
  count: number;
  lastMs: number;
  maxMs: number;
  averageMs: number;
}

export interface RainDiagnostics {
  api: "webgl2" | "webgl1" | null;
  ownsContext: boolean;
  composite: "replace" | "over";
  visible: boolean;
  attributes: WebGLContextAttributes | null;
  extensions: Record<string, unknown>;
  contextLost: boolean;
  running: boolean;
  destroyed: boolean;
  /** One-line summary of the last shader build failure, or null. */
  error: string | null;
  /** Structured compile/link log of the current program (null before the first build). */
  shaderLog: ShaderLog | null;
  /** Program builds so far: 1 + one per context restoration. */
  shaderBuilds: number;
  /** texImage2D CPU-side cost per sampler uniform. */
  uploads: Record<string, TextureUploadStats>;
  /** The most recent texImage2D. */
  lastTexImage2D: { name: string; ms: number; kind: "texImage2D" | "copy" } | null;
  drawingBuffer: { width: number; height: number };
  displaySize: { width: number; height: number };
}

export default class RainLayer {
  constructor(canvas: HTMLCanvasElement, options?: RainLayerOptions);

  readonly canvas: HTMLCanvasElement;
  readonly ownsContext: boolean;
  readonly composite: "replace" | "over";
  /** Mirrors setVisible() (the dock's rain toggles). */
  visible: boolean;
  /** Current uniform values (what a context restore re-applies). */
  readonly uniformValues: Record<string, number | boolean | number[]>;
  contextLost: boolean;
  /** False while the context is lost or when the shaders failed to build. */
  running: boolean;
  destroyed: boolean;
  shaderLog: ShaderLog | null;
  error: string | null;

  /** Resize the drawing buffer, accounting for device pixel ratio. */
  setSize(cssWidth: number, cssHeight: number, dpr?: number): void;
  /** Set parallax offset applied to the rain field. */
  setParallax(x: number, y: number): void;
  /** Set a single shader uniform by name. */
  setUniform(name: string, value: number | boolean | number[]): void;
  /** Apply many uniforms, skipping values that are already current. */
  setUniforms(values: Record<string, number | boolean | number[]>): void;
  /**
   * GPU-copy the current default framebuffer into a sampler (same context, so
   * it works without preserveDrawingBuffer). Returns false while lost.
   */
  copyFramebufferTo(uniformName: string): boolean;
  /** Upload/replace a texture bound to the given sampler uniform. */
  bindTexture(uniformName: string, source: TexImageSource): boolean;
  /** Render one frame. */
  render(): void;
  /** Toggle canvas visibility without tearing down GPU resources. */
  setVisible(visible: boolean): void;
  /** Snapshot of context health, shader log, and upload costs. */
  getDiagnostics(): RainDiagnostics;
  /** Release GPU resources and detach listeners. */
  destroy(): void;
}
