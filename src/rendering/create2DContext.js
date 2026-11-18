// @ts-check
/**
 * The single 2D canvas context factory, the 2D counterpart of
 * `createGLContext`. Every `getContext("2d")` in src/ goes through here so
 * the attribute policy lives in one place (tests/architecture.test.js).
 *
 * Policy (see docs/rendering-contexts.md):
 * - `alpha: true` everywhere today: every 2D surface either composites over
 *   DOM layers (matrix, dust, fog, radar) or carries meaning in its alpha
 *   channel (water map, drop atlas, cabinet labels, veil mask).
 * - `desynchronized: false` by default. Matrix and dust opt in only behind the
 *   `?desync2d=1` / `localStorage['rain-edit:desync2d']` experiment.
 * - `willReadFrequently: true` only where the canvas is read back with
 *   `getImageData` (drop atlas sprites, veil hit-test mask).
 *
 * Works for `HTMLCanvasElement` and `OffscreenCanvas` (the rain worker).
 */

/**
 * @typedef {object} Canvas2DAttributes
 * @property {boolean} [alpha]
 * @property {boolean} [desynchronized]
 * @property {boolean} [willReadFrequently]
 * @property {PredefinedColorSpace} [colorSpace]
 */

/**
 * @typedef {object} Canvas2DInfo
 * @property {string} label
 * @property {Canvas2DAttributes} requested
 * @property {Canvas2DAttributes | null} attributes What the browser granted
 *   (`getContextAttributes()`), or null where unsupported.
 */

/** @typedef {CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D} Context2D */

export const DEFAULT_2D_ATTRIBUTES = Object.freeze({
  alpha: true,
  desynchronized: false,
  willReadFrequently: false,
});

export const DESYNC_2D_STORAGE_KEY = "rain-edit:desync2d";

/** @type {WeakMap<object, Canvas2DInfo>} */
const contextInfo = new WeakMap();

/**
 * @overload
 * @param {HTMLCanvasElement} canvas
 * @param {{ attributes?: Canvas2DAttributes, label?: string }} [options]
 * @returns {CanvasRenderingContext2D | null}
 */
/**
 * @overload
 * @param {OffscreenCanvas} canvas
 * @param {{ attributes?: Canvas2DAttributes, label?: string }} [options]
 * @returns {OffscreenCanvasRenderingContext2D | null}
 */
/**
 * @param {HTMLCanvasElement | OffscreenCanvas} canvas
 * @param {{ attributes?: Canvas2DAttributes, label?: string }} [options]
 * @returns {Context2D | null}
 */
export function create2DContext(canvas, { attributes = {}, label = "2D" } = {}) {
  const requested = { ...DEFAULT_2D_ATTRIBUTES, ...attributes };
  /** @type {Context2D | null} */
  let ctx = null;
  try {
    ctx = /** @type {Context2D | null} */ (canvas.getContext("2d", requested));
  } catch (error) {
    console.warn(`[${label}] 2d context creation failed.`, error);
  }
  if (!ctx) return null;
  // A canvas returns its existing context on later calls (attributes from the
  // first call win), so keep the first label/request.
  if (!contextInfo.has(ctx)) {
    const granted =
      "getContextAttributes" in ctx && typeof ctx.getContextAttributes === "function"
        ? /** @type {Canvas2DAttributes} */ (ctx.getContextAttributes())
        : null;
    contextInfo.set(ctx, { label, requested, attributes: granted });
  }
  return ctx;
}

/**
 * @param {Context2D | null | undefined} ctx
 * @returns {Canvas2DInfo | null}
 */
export function get2DContextInfo(ctx) {
  return ctx ? contextInfo.get(ctx) ?? null : null;
}

/**
 * Whether the `desynchronized` experiment is on for matrix/dust:
 * `?desync2d=1|0` wins, else `localStorage['rain-edit:desync2d'] === "1"`.
 *
 * @param {string} [search]
 * @param {{ getItem(key: string): string | null } | null} [storage]
 * @returns {boolean}
 */
export function resolveDesync2D(search = "", storage = null) {
  const fromQuery = new URLSearchParams(search).get("desync2d");
  if (fromQuery === "1" || fromQuery === "0") return fromQuery === "1";
  try {
    return storage?.getItem(DESYNC_2D_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
