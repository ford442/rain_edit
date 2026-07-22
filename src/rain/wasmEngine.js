import { packOptionsForWasm } from "./optionsCodec.js";
import wasmUrl from "./wasm/rain_sim.wasm?url";

const EXPORTS = [
  "alloc",
  "dealloc",
  "rain_sim_create",
  "rain_sim_destroy",
  "rain_sim_resize",
  "rain_sim_pixels_ptr",
  "rain_sim_pixels_len",
  "rain_sim_set_options",
  "rain_sim_set_atlas",
  "rain_sim_clear_droplets",
  "rain_sim_splash",
  "rain_sim_clear_texture",
  "rain_sim_clear_drops",
  "rain_sim_step",
  "rain_sim_drop_count",
];

/**
 * WASM water-map backend. Writes RGBA8 into wasm linear memory each step.
 */
export class WasmRainEngine {
  /**
   * @param {number} width
   * @param {number} height
   * @param {number} scale
   * @param {Uint8ClampedArray | null} atlas
   * @param {object} options
   */
  constructor(width, height, scale, atlas, options = {}) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.options = options;
    this._atlas = atlas;
    this._ready = false;
    this._exports = null;
    this._memory = null;
    this._sim = 0;
    this._optionsPtr = 0;
    this._pixelView = null;
  }

  async init() {
    const response = await fetch(wasmUrl);
    const bytes = await response.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {});
    const exports = instance.exports;
    for (const name of EXPORTS) {
      if (typeof exports[name] !== "function") {
        throw new Error(`rain-sim wasm missing export: ${name}`);
      }
    }
    this._exports = exports;
    this._memory = exports.memory;
    this._sim = exports.rain_sim_create(this.width, this.height, this.scale);
    this._optionsPtr = exports.alloc(22 * 4);
    this._applyOptions();
    if (this._atlas && this._atlas.length) {
      const atlasPtr = exports.alloc(this._atlas.length);
      new Uint8Array(this._memory.buffer, atlasPtr, this._atlas.length).set(
        this._atlas,
      );
      exports.rain_sim_set_atlas(this._sim, atlasPtr, this._atlas.length);
      exports.dealloc(atlasPtr, this._atlas.length);
    }
    this._ready = true;
    return this;
  }

  _applyOptions() {
    const packed = packOptionsForWasm(this.options);
    new Float32Array(this._memory.buffer, this._optionsPtr, 22).set(packed);
    this._exports.rain_sim_set_options(this._sim, this._optionsPtr);
  }

  setOptions(options) {
    this.options = { ...this.options, ...options };
    if (this._ready) this._applyOptions();
  }

  resize(width, height, scale) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    this._exports.rain_sim_resize(this._sim, width, height, scale);
    this._pixelView = null;
  }

  clearDroplets(x, y, r = 30) {
    this._exports.rain_sim_clear_droplets(this._sim, x, y, r);
  }

  splash(x, y, count = 5) {
    this._exports.rain_sim_splash(this._sim, x, y, count);
  }

  clearDrops() {
    this._exports.rain_sim_clear_drops(this._sim);
  }

  clearTexture() {
    this._exports.rain_sim_clear_texture(this._sim);
  }

  /**
   * Advance simulation and return a view of the RGBA buffer (valid until next step).
   * @param {number} nowMs
   * @returns {{ buffer: Uint8ClampedArray, width: number, height: number }}
   */
  step(nowMs) {
    this._exports.rain_sim_step(this._sim, nowMs);
    const ptr = this._exports.rain_sim_pixels_ptr(this._sim);
    const len = this._exports.rain_sim_pixels_len(this._sim);
    // Memory may have grown; always rebind.
    this._pixelView = new Uint8ClampedArray(this._memory.buffer, ptr, len);
    return {
      buffer: this._pixelView,
      width: this.width,
      height: this.height,
    };
  }

  destroy() {
    if (!this._ready) return;
    if (this._sim) this._exports.rain_sim_destroy(this._sim);
    if (this._optionsPtr) this._exports.dealloc(this._optionsPtr, 22 * 4);
    this._sim = 0;
    this._optionsPtr = 0;
    this._ready = false;
  }
}

export async function createWasmRainEngine(
  width,
  height,
  scale,
  atlas,
  options,
) {
  const engine = new WasmRainEngine(width, height, scale, atlas, options);
  await engine.init();
  return engine;
}
