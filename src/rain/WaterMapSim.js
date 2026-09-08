// @ts-check
import Raindrops from "../vendor/raindrops.js";
import { DEFAULT_RAIN_OPTIONS } from "./optionsCodec.js";
import RainSimWorker from "./rainSimWorker.js?worker";
import {
  persistRainSimBackend,
  readRainSimOverride,
  resolveRainSimBackend,
  workerSimSupported,
} from "./resolveBackend.js";

/** @typedef {import('./optionsCodec.js').RainOptions} RainOptions */
/** @typedef {'main' | 'js' | 'wasm'} RainSimBackend */
/** @typedef {'auto' | RainSimBackend} RainSimPreference */

/**
 * @typedef {
 *   | { type: 'ready', backend: RainSimBackend }
 *   | { type: 'frame', bitmap: ImageBitmap, backend: RainSimBackend }
 *   | { type: 'error', message?: string }
 *   | { type: 'stopped' }
 * } WorkerOutMessage
 */

/**
 * Drop-in replacement for vendor Raindrops.
 * Prefer an off-main-thread worker (JS OffscreenCanvas or Rust WASM);
 * fall back to the legacy main-thread simulator when workers are unavailable.
 */
export class WaterMapSim {
  /**
   * @param {number} width
   * @param {number} height
   * @param {number} scale
   * @param {CanvasImageSource} dropAlpha
   * @param {CanvasImageSource} dropColor
   * @param {Partial<RainOptions>} [options]
   * @param {{ preference?: RainSimPreference }} [config]
   */
  static async create(
    width,
    height,
    scale,
    dropAlpha,
    dropColor,
    options = {},
    config = {},
  ) {
    const preference =
      config.preference ?? readRainSimOverride();
    const resolved = resolveRainSimBackend(preference);
    const sim = new WaterMapSim(
      width,
      height,
      scale,
      dropAlpha,
      dropColor,
      options,
      resolved,
      preference,
    );
    await sim._start();
    return sim;
  }

  /**
   * @param {number} width
   * @param {number} height
   * @param {number} scale
   * @param {CanvasImageSource} dropAlpha
   * @param {CanvasImageSource} dropColor
   * @param {Partial<RainOptions>} [options]
   * @param {RainSimBackend} [backend]
   * @param {RainSimPreference} [preference]
   */
  constructor(
    width,
    height,
    scale,
    dropAlpha,
    dropColor,
    options = {},
    backend = "main",
    preference = backend,
  ) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.dropAlpha = dropAlpha;
    this.dropColor = dropColor;
    this.backend = backend;
    this.preference = preference;
    /** @type {Raindrops | null} */
    this._mainEngine = null;
    /** @type {Worker | null} */
    this._worker = null;
    /** @type {ImageBitmap | null} */
    this._frame = null;
    this._placeholder = document.createElement("canvas");
    this._placeholder.width = Math.max(1, width | 0);
    this._placeholder.height = Math.max(1, height | 0);
    this._ready = false;
    this._destroyed = false;
    this._lastSimMainMs = 0;
    this._frameCount = 0;

    const opts = { ...DEFAULT_RAIN_OPTIONS, ...options };
    /** @type {RainOptions} */
    this._optionsTarget = opts;
    this.options = this._makeOptionsProxy(opts);
  }

  /**
   * @param {RainOptions} target
   * @returns {RainOptions}
   */
  _makeOptionsProxy(target) {
    this._optionsTarget = target;
    return new Proxy(target, {
      set: (obj, prop, value) => {
        /** @type {Record<string | symbol, unknown>} */ (obj)[prop] = value;
        this._postOptions();
        return true;
      },
    });
  }

  /** Texture source for WebGL uploads (ImageBitmap or placeholder canvas). */
  get canvas() {
    return this._frame || this._placeholder;
  }

  /** Main-thread time spent inside update() last call (ms). Worker backends ≈ 0. */
  get lastMainThreadSimMs() {
    return this._lastSimMainMs;
  }

  async _start() {
    if (this.backend === "main" || !workerSimSupported()) {
      this.backend = "main";
      this._mainEngine = new Raindrops(
        this.width,
        this.height,
        this.scale,
        this.dropAlpha,
        this.dropColor,
        this._optionsTarget,
      );
      Object.assign(this._mainEngine.options, this._optionsTarget);
      this.options = this._makeOptionsProxy(
        /** @type {RainOptions} */ (this._mainEngine.options),
      );
      this._ready = true;
      return;
    }

    await this._bootWorker(this.backend);
  }

  /** @param {RainSimBackend} backend */
  async _bootWorker(backend) {
    this._teardownWorker();
    this.backend = backend;
    const worker = new RainSimWorker();
    this._worker = worker;
    const dropAlphaBmp = await createImageBitmap(this.dropAlpha);
    const dropColorBmp = await createImageBitmap(this.dropColor);

    let settled = false;
    /** @type {Promise<RainSimBackend>} */
    const ready = new Promise((resolve, reject) => {
      /** @param {MessageEvent<WorkerOutMessage>} event */
      const onMessage = (event) => {
        const msg = event.data;
        if (!msg) return;
        if (msg.type === "ready") {
          settled = true;
          this._ready = true;
          resolve(msg.backend);
        } else if (msg.type === "frame") {
          if (this._frame && typeof this._frame.close === "function") {
            try {
              this._frame.close();
            } catch {
              // already closed
            }
          }
          this._frame = msg.bitmap;
          this._frameCount += 1;
          if (this._placeholder.width !== msg.bitmap.width) {
            this._placeholder.width = msg.bitmap.width;
          }
          if (this._placeholder.height !== msg.bitmap.height) {
            this._placeholder.height = msg.bitmap.height;
          }
        } else if (msg.type === "error") {
          if (!settled) {
            settled = true;
            reject(new Error(msg.message || "rain sim worker error"));
          } else {
            console.warn("[WaterMapSim] worker error:", msg.message);
          }
        }
      };
      worker.onmessage = onMessage;
      worker.onerror = (err) => {
        if (!settled) {
          settled = true;
          reject(err?.error || new Error("rain sim worker failed"));
        }
      };
    });

    worker.postMessage(
      {
        type: "init",
        backend,
        width: this.width,
        height: this.height,
        scale: this.scale,
        options: { ...this._optionsTarget },
        dropAlpha: dropAlphaBmp,
        dropColor: dropColorBmp,
      },
      [dropAlphaBmp, dropColorBmp],
    );

    try {
      await ready;
    } catch (error) {
      console.warn(
        "[WaterMapSim] Worker backend failed; falling back to main-thread JS.",
        error,
      );
      this._teardownWorker();
      this.backend = "main";
      this._mainEngine = new Raindrops(
        this.width,
        this.height,
        this.scale,
        this.dropAlpha,
        this.dropColor,
        this._optionsTarget,
      );
      Object.assign(this._mainEngine.options, this._optionsTarget);
      this.options = this._makeOptionsProxy(
        /** @type {RainOptions} */ (this._mainEngine.options),
      );
      this._ready = true;
    }
  }

  _teardownWorker() {
    if (this._worker) {
      try {
        this._worker.postMessage({ type: "stop" });
      } catch {
        // ignore
      }
      this._worker.terminate();
      this._worker = null;
    }
    if (this._frame && typeof this._frame.close === "function") {
      try {
        this._frame.close();
      } catch {
        // ignore
      }
    }
    this._frame = null;
    this._ready = false;
  }

  _postOptions() {
    if (this._worker) {
      this._worker.postMessage({
        type: "options",
        options: { ...this._optionsTarget },
      });
    }
  }

  update() {
    const t0 = performance.now();
    if (this._mainEngine) {
      this._mainEngine.update();
    }
    // Worker backends simulate on their own rAF; main thread work is ≈ 0.
    this._lastSimMainMs = performance.now() - t0;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} [r]
   */
  clearDroplets(x, y, r = 30) {
    if (this._mainEngine) {
      this._mainEngine.clearDroplets(x, y, r);
      return;
    }
    this._worker?.postMessage({ type: "clearDroplets", x, y, r });
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} [count]
   */
  splash(x, y, count = 5) {
    if (this._mainEngine) {
      this._mainEngine.splash(x, y, count);
      return;
    }
    this._worker?.postMessage({ type: "splash", x, y, count });
  }

  clearDrops() {
    if (this._mainEngine) {
      this._mainEngine.clearDrops();
      return;
    }
    this._worker?.postMessage({ type: "clearDrops" });
  }

  clearTexture() {
    if (this._mainEngine) {
      this._mainEngine.clearTexture();
      return;
    }
    this._worker?.postMessage({ type: "clearTexture" });
  }

  /**
   * Hot-swap backend for visual parity comparisons.
   * @param {RainSimPreference} preference
   */
  async setBackend(preference) {
    const normalized = persistRainSimBackend(preference);
    const resolved = resolveRainSimBackend(normalized);
    this.preference = normalized;
    if (resolved === this.backend) return this.backend;

    if (resolved === "main") {
      this._teardownWorker();
      this._mainEngine = new Raindrops(
        this.width,
        this.height,
        this.scale,
        this.dropAlpha,
        this.dropColor,
        { ...this._optionsTarget },
      );
      this.options = this._makeOptionsProxy(
        /** @type {RainOptions} */ (this._mainEngine.options),
      );
      this.backend = "main";
      this._ready = true;
      return this.backend;
    }

    this._mainEngine = null;
    await this._bootWorker(resolved);
    return this.backend;
  }

  getDiagnostics() {
    return {
      backend: this.backend,
      preference: this.preference,
      ready: this._ready,
      frameCount: this._frameCount,
      lastMainThreadSimMs: this._lastSimMainMs,
      width: this.width,
      height: this.height,
      workerSupported: workerSimSupported(),
    };
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._teardownWorker();
    this._mainEngine = null;
  }
}

export default WaterMapSim;
