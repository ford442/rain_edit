// Public type surface for the legacy main-thread raindrop simulator. The
// runtime implementation is an untyped, prototype-based constructor function
// (not annotated); this declaration lets typed consumers (WaterMapSim) use it
// without checking its body. Keep in sync with `raindrops.js`'s public shape.

/** Mutable simulation options, keyed loosely since callers assign whichever subset they track. */
export interface RaindropsOptions {
  [key: string]: unknown;
}

export default class Raindrops {
  constructor(
    width: number,
    height: number,
    scale: number,
    dropAlpha: CanvasImageSource,
    dropColor: CanvasImageSource,
    options?: Partial<RaindropsOptions>,
  );

  options: RaindropsOptions;
  readonly canvas: HTMLCanvasElement;

  update(): void;
  clearDroplets(x: number, y: number, r?: number): void;
  splash(x: number, y: number, count?: number): void;
  clearDrops(): void;
  clearTexture(): void;
}
