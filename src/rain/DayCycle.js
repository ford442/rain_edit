// @ts-check
/**
 * Time-of-day for the storm: a 0..1 phase (0 = midnight, 0.25 = dawn,
 * 0.5 = noon, 0.75 = dusk) that ramps slowly toward its target and writes
 *
 *  - `--sky-0` / `--sky-1` (page background gradient) and `--glass-tint`
 *    (dock glass) CSS custom properties,
 *  - the `u_brightness` uniform on both RainLayers,
 *  - an optional texture-set swap (e.g. sunlit textures by day), only once
 *    that set's images have fully loaded — never a hitch on the frame.
 *
 * Modes: a preset (`dawn` / `day` / `dusk` / `night`) or `clock`, which
 * follows the local wall clock. Choose with the dock **Time** select,
 * `?time=dusk`, or `localStorage['rain-edit:timeOfDay']`. `night` is the
 * default and matches the app's original look exactly (brightness 1,
 * original background colours, no texture swap).
 *
 * Runs as the AppClock `day-cycle` task; nothing here owns a timer.
 */

export const TIME_STORAGE_KEY = "rain-edit:timeOfDay";

/** @typedef {"dawn" | "day" | "dusk" | "night"} TimePreset */
/** @typedef {TimePreset | "clock"} TimeMode */
/** @typedef {[number, number, number]} RGB */
/**
 * @typedef {object} SkyKeyframe
 * @property {number} phase
 * @property {number} brightness  RainLayer `u_brightness`
 * @property {RGB} sky0           top-left of the page gradient
 * @property {RGB} sky1           bottom-right of the page gradient
 * @property {RGB} glass          dock glass tint (alpha comes from CSS)
 * @property {string} textures    texture-set key (see `textureSets`)
 */
/**
 * @typedef {object} SkyState
 * @property {number} phase
 * @property {number} brightness
 * @property {RGB} sky0
 * @property {RGB} sky1
 * @property {RGB} glass
 * @property {string} textures
 */

/** @type {Readonly<Record<TimePreset, number>>} */
export const TIME_PRESETS = Object.freeze({
  night: 0,
  dawn: 0.25,
  day: 0.5,
  dusk: 0.75,
});

export const TIME_MODES = /** @type {readonly TimeMode[]} */ (
  Object.freeze(["clock", "dawn", "day", "dusk", "night"])
);
/** @type {TimeMode} */
export const DEFAULT_TIME_MODE = "night";

/**
 * Sorted by phase. Night (0 and 1) is the original look.
 * @type {readonly SkyKeyframe[]}
 */
export const SKY_KEYFRAMES = Object.freeze([
  { phase: 0, brightness: 1.0, sky0: [8, 12, 18], sky1: [3, 4, 8], glass: [10, 14, 22], textures: "rain" },
  { phase: 0.25, brightness: 1.08, sky0: [58, 36, 62], sky1: [16, 18, 40], glass: [20, 14, 30], textures: "rain" },
  { phase: 0.5, brightness: 1.22, sky0: [46, 70, 96], sky1: [18, 30, 48], glass: [14, 24, 38], textures: "sun" },
  { phase: 0.75, brightness: 1.04, sky0: [72, 34, 30], sky1: [20, 10, 26], glass: [26, 12, 18], textures: "rain" },
  { phase: 1, brightness: 1.0, sky0: [8, 12, 18], sky1: [3, 4, 8], glass: [10, 14, 22], textures: "rain" },
]);

// Ramp speed: phase units per second when chasing a preset (a full half-day
// swing takes ~6s), and the CSS write threshold.
const RAMP_PER_SEC = 0.08;
const CSS_EPSILON = 0.002;

/** @param {number} p */
export function wrapPhase(p) {
  return ((p % 1) + 1) % 1;
}

/**
 * @param {unknown} value
 * @returns {TimeMode}
 */
export function normalizeTimeMode(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return /** @type {readonly string[]} */ (TIME_MODES).includes(v)
    ? /** @type {TimeMode} */ (v)
    : DEFAULT_TIME_MODE;
}

/**
 * `?time=` wins over storage; otherwise the default (night).
 * @param {string} [search]
 * @param {Pick<Storage, "getItem"> | null} [storage]
 * @returns {TimeMode}
 */
export function readTimeModeOverride(
  search = typeof location !== "undefined" ? location.search : "",
  storage = typeof localStorage !== "undefined" ? localStorage : null,
) {
  try {
    const fromUrl = new URLSearchParams(search).get("time");
    if (fromUrl) return normalizeTimeMode(fromUrl);
  } catch {
    // ignore
  }
  try {
    const stored = storage?.getItem(TIME_STORAGE_KEY);
    if (stored) return normalizeTimeMode(stored);
  } catch {
    // ignore
  }
  return DEFAULT_TIME_MODE;
}

/**
 * Wall-clock phase for `clock` mode.
 * @param {Date} date
 */
export function phaseFromDate(date) {
  return (date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600) / 24;
}

/**
 * Signed shortest step from `from` to `to` around the phase circle.
 * @param {number} from @param {number} to
 */
export function phaseDelta(from, to) {
  let d = wrapPhase(to) - wrapPhase(from);
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  return d;
}

/** @param {RGB} a @param {RGB} b @param {number} t @returns {RGB} */
function mixRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Interpolate the sky at a phase. Texture set switches at the midpoint
 * between keyframes.
 * @param {number} phase
 * @param {readonly SkyKeyframe[]} [keyframes]
 * @returns {SkyState}
 */
export function computeSky(phase, keyframes = SKY_KEYFRAMES) {
  const p = wrapPhase(phase);
  let i = 0;
  while (i < keyframes.length - 2 && p >= keyframes[i + 1].phase) i++;
  const a = keyframes[i];
  const b = keyframes[i + 1];
  const span = b.phase - a.phase || 1;
  const t = Math.max(0, Math.min(1, (p - a.phase) / span));
  return {
    phase: p,
    brightness: a.brightness + (b.brightness - a.brightness) * t,
    sky0: mixRgb(a.sky0, b.sky0, t),
    sky1: mixRgb(a.sky1, b.sky1, t),
    glass: mixRgb(a.glass, b.glass, t),
    textures: t < 0.5 ? a.textures : b.textures,
  };
}

/** @param {RGB} c */
const rgbCss = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
/** @param {RGB} c */
const rgbTriplet = (c) => `${c[0]}, ${c[1]}, ${c[2]}`;

/**
 * @typedef {{ setUniform(name: string, value: number): void }} BrightnessLayer
 * @typedef {{ bg: HTMLImageElement, fg: HTMLImageElement }} TextureSet
 *
 * @typedef {object} DayCycleOptions
 * @property {TimeMode} [mode]
 * @property {HTMLElement | null} [root] where CSS vars are written
 * @property {() => Date} [now]
 * @property {Record<string, TextureSet>} [textureSets] keyed by `SkyKeyframe.textures`
 * @property {(set: TextureSet, key: string) => void} [onTextures]
 * @property {boolean} [persist] write mode changes to localStorage
 */

export class DayCycle {
  /** @param {DayCycleOptions} [options] */
  constructor({
    mode,
    root = typeof document !== "undefined" ? document.documentElement : null,
    now = () => new Date(),
    textureSets = {},
    onTextures,
    persist = true,
  } = {}) {
    /** @type {TimeMode} */
    this.mode = normalizeTimeMode(mode ?? readTimeModeOverride());
    this.root = root;
    this._now = now;
    this.textureSets = textureSets;
    this.onTextures = onTextures;
    this._persist = persist;
    /** @type {BrightnessLayer[]} */
    this._layers = [];
    // Start exactly on the target so the first frame doesn't sweep.
    this.phase = this.targetPhase();
    /** @type {SkyState} */
    this.sky = computeSky(this.phase);
    this._lastCssPhase = -1;
    this._textureKey = "rain";
    /** @type {Set<(mode: TimeMode) => void>} */
    this._listeners = new Set();
  }

  /** @param {...(BrightnessLayer | null | undefined)} layers */
  attachLayers(...layers) {
    this._layers = /** @type {BrightnessLayer[]} */ (layers.filter(Boolean));
    this._applyUniforms();
  }

  getMode() {
    return this.mode;
  }

  /** @param {(mode: TimeMode) => void} cb @returns {() => void} */
  onModeChange(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  /** @param {string} mode */
  setMode(mode) {
    const next = normalizeTimeMode(mode);
    if (next === this.mode) return this.mode;
    this.mode = next;
    if (this._persist) {
      try {
        localStorage.setItem(TIME_STORAGE_KEY, next);
      } catch {
        // storage blocked
      }
    }
    for (const cb of this._listeners) cb(next);
    return next;
  }

  targetPhase() {
    return this.mode === "clock" ? phaseFromDate(this._now()) : TIME_PRESETS[this.mode];
  }

  /**
   * Ramp toward the target phase and apply. AppClock `update`.
   * @param {number} dtMs
   */
  update(dtMs) {
    const delta = phaseDelta(this.phase, this.targetPhase());
    const maxStep = (RAMP_PER_SEC * Math.max(0, dtMs)) / 1000;
    this.phase = wrapPhase(this.phase + Math.max(-maxStep, Math.min(maxStep, delta)));
    this.sky = computeSky(this.phase);
    const settled = Math.abs(delta) <= maxStep;
    const moved = Math.abs(phaseDelta(this._lastCssPhase, this.phase));
    // Throttle writes while ramping, but always land the exact target.
    if (this._lastCssPhase < 0 || moved > CSS_EPSILON || (settled && moved > 0)) {
      this._applyCss();
      this._applyUniforms();
    }
    this._maybeSwapTextures();
    return this.sky;
  }

  /** Write the current sky immediately (first frame / tests). */
  apply() {
    this._applyCss();
    this._applyUniforms();
    this._maybeSwapTextures();
  }

  _applyCss() {
    this._lastCssPhase = this.phase;
    const style = this.root?.style;
    if (!style) return;
    style.setProperty("--sky-0", rgbCss(this.sky.sky0));
    style.setProperty("--sky-1", rgbCss(this.sky.sky1));
    style.setProperty("--glass-tint", rgbTriplet(this.sky.glass));
    style.setProperty("--day-phase", this.phase.toFixed(3));
  }

  _applyUniforms() {
    for (const layer of this._layers) layer.setUniform("u_brightness", this.sky.brightness);
  }

  _maybeSwapTextures() {
    const key = this.sky.textures;
    if (key === this._textureKey || !this.onTextures) return;
    const set = this.textureSets[key];
    if (!set || !isLoaded(set.bg) || !isLoaded(set.fg)) return;
    this._textureKey = key;
    this.onTextures(set, key);
  }

  getDiagnostics() {
    return {
      mode: this.mode,
      phase: this.phase,
      target: this.targetPhase(),
      brightness: this.sky.brightness,
      textures: this._textureKey,
    };
  }
}

/** @param {HTMLImageElement | undefined} img */
function isLoaded(img) {
  return Boolean(img && img.complete && img.naturalWidth > 0);
}
