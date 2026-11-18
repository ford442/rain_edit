/**
 * Dedicated worker that runs the water-map simulation off the main thread.
 * Backends: "js" (OffscreenCanvas raindrops) and "wasm" (Rust RGBA buffer).
 */
import Raindrops from "../vendor/raindrops.js";
import { bakeDropAtlas } from "./dropAtlas.js";
import { DEFAULT_RAIN_OPTIONS } from "./optionsCodec.js";
import { createWasmRainEngine } from "./wasmEngine.js";
import { create2DContext } from "../rendering/create2DContext.js";

/** @type {'js' | 'wasm' | null} */
let backend = null;
/** @type {Raindrops | null} */
let jsEngine = null;
/** @type {Awaited<ReturnType<typeof createWasmRainEngine>> | null} */
let wasmEngine = null;
/** @type {OffscreenCanvas | null} */
let presentCanvas = null;
/** @type {OffscreenCanvasRenderingContext2D | null} */
let presentCtx = null;
let rafId = null;
let running = false;
let width = 1;
let height = 1;
let scale = 1;

function postFrame(bitmap) {
  self.postMessage({ type: "frame", bitmap, backend }, [bitmap]);
}

function ensurePresentCanvas(w, h) {
  if (!presentCanvas || presentCanvas.width !== w || presentCanvas.height !== h) {
    presentCanvas = new OffscreenCanvas(w, h);
    presentCtx = create2DContext(presentCanvas, { label: "worker-present" });
  }
}

async function tick(now) {
  if (!running) return;
  rafId = requestAnimationFrame(tick);

  try {
    if (backend === "js" && jsEngine) {
      jsEngine.update();
      const source = jsEngine.canvas;
      ensurePresentCanvas(source.width, source.height);
      presentCtx.clearRect(0, 0, presentCanvas.width, presentCanvas.height);
      presentCtx.drawImage(source, 0, 0);
      postFrame(presentCanvas.transferToImageBitmap());
      return;
    }

    if (backend === "wasm" && wasmEngine) {
      const { buffer, width: w, height: h } = wasmEngine.step(now);
      // Copy out of wasm memory before createImageBitmap (memory may grow).
      const copy = new Uint8ClampedArray(buffer);
      const imageData = new ImageData(copy, w, h);
      const bitmap = await createImageBitmap(imageData);
      postFrame(bitmap);
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error?.message || String(error),
    });
  }
}

function stopLoop() {
  running = false;
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function startLoop() {
  if (running) return;
  running = true;
  rafId = requestAnimationFrame(tick);
}

function destroyEngines() {
  stopLoop();
  if (wasmEngine) {
    wasmEngine.destroy();
    wasmEngine = null;
  }
  jsEngine = null;
}

/**
 * @param {MessageEvent} event
 */
// Last wind/shield from the main thread; re-applied whenever an engine is
// (re)created so a backend switch keeps the environment.
const environment = { wind: { vx: 0, vy: 0 }, shield: { x: 0, y: 0, r: 0 } };

function applyEnvironment() {
  if (!wasmEngine) return;
  wasmEngine.setWind(environment.wind.vx, environment.wind.vy);
  const { x, y, r } = environment.shield;
  wasmEngine.setShield(x, y, r);
}

/** Environment support of the active engine (JS reference backend: none). */
function engineFeatures() {
  return wasmEngine ? { ...wasmEngine.features } : { wind: false, shield: false };
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;

  try {
    switch (msg.type) {
      case "init": {
        destroyEngines();
        width = msg.width | 0;
        height = msg.height | 0;
        scale = msg.scale || 1;
        backend = msg.backend === "wasm" ? "wasm" : "js";
        const options = { ...DEFAULT_RAIN_OPTIONS, ...(msg.options || {}) };
        const dropAlpha = msg.dropAlpha;
        const dropColor = msg.dropColor;

        if (backend === "wasm") {
          const atlas = bakeDropAtlas(dropAlpha, dropColor);
          wasmEngine = await createWasmRainEngine(
            width,
            height,
            scale,
            atlas,
            options,
          );
        } else {
          jsEngine = new Raindrops(
            width,
            height,
            scale,
            dropAlpha,
            dropColor,
            options,
          );
        }

        applyEnvironment();
        startLoop();
        self.postMessage({ type: "ready", backend, features: engineFeatures() });
        break;
      }

      case "setBackend": {
        if (msg.backend !== "js" && msg.backend !== "wasm") break;
        if (msg.backend === backend) break;
        const options =
          jsEngine?.options || wasmEngine?.options || DEFAULT_RAIN_OPTIONS;
        const dropAlpha = msg.dropAlpha;
        const dropColor = msg.dropColor;
        destroyEngines();
        backend = msg.backend;
        width = msg.width | 0 || width;
        height = msg.height | 0 || height;
        scale = msg.scale || scale;
        if (backend === "wasm") {
          const atlas = bakeDropAtlas(dropAlpha, dropColor);
          wasmEngine = await createWasmRainEngine(
            width,
            height,
            scale,
            atlas,
            options,
          );
        } else {
          jsEngine = new Raindrops(
            width,
            height,
            scale,
            dropAlpha,
            dropColor,
            options,
          );
        }
        applyEnvironment();
        startLoop();
        self.postMessage({ type: "ready", backend, features: engineFeatures() });
        break;
      }

      case "options": {
        if (jsEngine) Object.assign(jsEngine.options, msg.options || {});
        if (wasmEngine) wasmEngine.setOptions(msg.options || {});
        break;
      }

      case "environment": {
        if (msg.wind) environment.wind = { vx: +msg.wind.vx || 0, vy: +msg.wind.vy || 0 };
        if (msg.shield) {
          environment.shield = { x: +msg.shield.x || 0, y: +msg.shield.y || 0, r: +msg.shield.r || 0 };
        }
        applyEnvironment();
        break;
      }

      case "clearDroplets": {
        const { x, y, r } = msg;
        if (jsEngine) jsEngine.clearDroplets(x, y, r);
        if (wasmEngine) wasmEngine.clearDroplets(x, y, r);
        break;
      }

      case "splash": {
        const { x, y, count } = msg;
        if (jsEngine) jsEngine.splash(x, y, count);
        if (wasmEngine) wasmEngine.splash(x, y, count);
        break;
      }

      case "clearDrops": {
        if (jsEngine) jsEngine.clearDrops();
        if (wasmEngine) wasmEngine.clearDrops();
        break;
      }

      case "clearTexture": {
        if (jsEngine) jsEngine.clearTexture();
        if (wasmEngine) wasmEngine.clearTexture();
        break;
      }

      case "resize": {
        width = msg.width | 0;
        height = msg.height | 0;
        scale = msg.scale || scale;
        // Raindrops has no resize API; recreate JS engine when needed via setBackend.
        if (wasmEngine) wasmEngine.resize(width, height, scale);
        if (jsEngine) {
          // Recreate with same images stored on engine
          const opts = { ...jsEngine.options };
          const dropAlpha = jsEngine.dropAlpha;
          const dropColor = jsEngine.dropColor;
          jsEngine = new Raindrops(
            width,
            height,
            scale,
            dropAlpha,
            dropColor,
            opts,
          );
        }
        break;
      }

      case "stop": {
        destroyEngines();
        self.postMessage({ type: "stopped" });
        break;
      }

      default:
        break;
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error?.message || String(error),
    });
  }
};
