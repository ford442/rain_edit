// Public type surface for the WebGL rain pass. Authored declaration: the
// runtime lives in RainLayer.js; this describes the API other modules depend on.

export interface RainLayerOptions {
  vertex?: string;
  fragment?: string;
  /** Texture sources keyed by uniform sampler name. */
  textures?: Record<string, TexImageSource>;
  /** Initial uniform values keyed by uniform name. */
  options?: Record<string, number | number[]>;
  /** Options forwarded to createGLContext. */
  context?: Record<string, unknown>;
  onContextLost?: (() => void) | null;
  onContextRestored?: (() => void) | null;
}

export interface RainDiagnostics {
  api: "webgl2" | "webgl" | null;
  contextLost: boolean;
  running: boolean;
  destroyed: boolean;
  [key: string]: unknown;
}

export default class RainLayer {
  constructor(canvas: HTMLCanvasElement, options?: RainLayerOptions);

  readonly canvas: HTMLCanvasElement;
  contextLost: boolean;
  running: boolean;
  destroyed: boolean;

  /** Resize the drawing buffer, accounting for device pixel ratio. */
  setSize(cssWidth: number, cssHeight: number, dpr?: number): void;
  /** Set parallax offset applied to the rain field. */
  setParallax(x: number, y: number): void;
  /** Set a single shader uniform by name. */
  setUniform(name: string, value: number | number[]): void;
  /** Upload/replace a texture bound to the given sampler uniform. */
  bindTexture(uniformName: string, source: TexImageSource): void;
  /** Render one frame. */
  render(): void;
  /** Toggle canvas visibility without tearing down GPU resources. */
  setVisible(visible: boolean): void;
  /** Snapshot of context health for debugging. */
  getDiagnostics(): RainDiagnostics;
  /** Release GPU resources and detach listeners. */
  destroy(): void;
}
