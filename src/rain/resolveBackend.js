/**
 * Resolve which water-map simulation backend to use.
 *
 * Priority: explicit override (URL ?rainSim= / localStorage) → capability probe.
 *
 * Values:
 * - "main"  — legacy main-thread Raindrops (always available)
 * - "js"    — OffscreenCanvas worker with the JS raindrops engine
 * - "wasm"  — Worker + Rust WASM pixel sim
 * - "auto"  — prefer wasm worker, else js worker, else main
 */

export const RAIN_SIM_STORAGE_KEY = "rain-edit:rainSimBackend";

export function workerSimSupported() {
  return (
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof createImageBitmap === "function"
  );
}

export function readRainSimOverride(
  search = typeof location !== "undefined" ? location.search : "",
  storage = typeof localStorage !== "undefined" ? localStorage : null,
) {
  try {
    const params = new URLSearchParams(search);
    const fromUrl = params.get("rainSim");
    if (fromUrl) return normalizeBackend(fromUrl);
  } catch {
    // ignore
  }
  try {
    const fromStorage = storage?.getItem(RAIN_SIM_STORAGE_KEY);
    if (fromStorage) return normalizeBackend(fromStorage);
  } catch {
    // ignore
  }
  return "auto";
}

export function normalizeBackend(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (v === "main" || v === "js" || v === "wasm" || v === "auto") return v;
  return "auto";
}

export function persistRainSimBackend(
  value,
  storage = typeof localStorage !== "undefined" ? localStorage : null,
) {
  const normalized = normalizeBackend(value);
  try {
    storage?.setItem(RAIN_SIM_STORAGE_KEY, normalized);
  } catch {
    // ignore quota / private mode
  }
  return normalized;
}

/**
 * @param {'auto' | 'main' | 'js' | 'wasm'} preference
 * @returns {'main' | 'js' | 'wasm'}
 */
export function resolveRainSimBackend(preference = "auto") {
  const pref = normalizeBackend(preference);
  if (pref === "main") return "main";
  if (!workerSimSupported()) return "main";
  if (pref === "js") return "js";
  if (pref === "wasm") return "wasm";
  // auto: prefer wasm when WebAssembly is present
  if (typeof WebAssembly !== "undefined") return "wasm";
  return "js";
}
