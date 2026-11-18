// @ts-check
import {
  WEATHER_MODES,
  computeWeatherTargets,
  computeWind,
  normalizeWeatherMode,
  persistWeatherMode,
  readWeatherModeOverride,
} from "./weatherModes.js";

// Keeps typing feel responsive (goal: visible modulation within ~200-400ms)
// while still smoothing out per-keystroke jitter.
const ACTIVITY_TAU_MS = 200;
const PARAM_TAU_MS = 240;
// How quickly a typing/cursor "kick" fades back to zero absent further input.
const KICK_DECAY_TAU_MS = 900;
// Editor shield: how fast it raises/lowers on focus, and how many small
// centre-biased clears per second it posts at full strength.
const SHIELD_TAU_MS = 400;
const SHIELD_CLEARS_PER_SEC = 30;
const SHIELD_MIN_STRENGTH = 0.02;

/**
 * @typedef {import("./weatherModes.js").WeatherMode} WeatherMode
 * @typedef {import("./weatherModes.js").WeatherParams} WeatherParams
 * @typedef {import("./weatherModes.js").WeatherProfile} WeatherProfile
 * @typedef {{ left: number, top: number, width: number, height: number }} ShieldRect
 * @typedef {{ x: number, y: number, r: number }} ShieldCircle
 *
 * @typedef {object} WeatherSim The slice of WaterMapSim this drives.
 * @property {Record<string, any>} options
 * @property {(x: number, y: number, r?: number) => void} [clearDroplets]
 * @property {(vx: number, vy: number) => void} [setWind]
 * @property {(x: number, y: number, r: number) => void} [setShield]
 *
 * @typedef {{ setUniform(name: string, value: number): void }} WeatherLayer
 *
 * @typedef {object} WeatherAudioSink
 * @property {(mode: string, profile: WeatherProfile) => void} setMode
 * @property {(dtMs: number, activity: number) => void} [update]
 * @property {(activity: number) => void} [setIntensity]
 * @property {() => boolean} [isEnabled]
 */

/**
 * One small clear inside the editor's shield ellipse, biased toward its
 * centre (sum of two uniforms → triangular distribution).
 * @param {ShieldRect} rect
 * @param {() => number} random
 * @returns {ShieldCircle}
 */
export function sampleShieldClear(rect, random) {
  const gx = (random() + random() - 1) * 0.42;
  const gy = (random() + random() - 1) * 0.42;
  return {
    x: rect.left + rect.width * (0.5 + gx),
    y: rect.top + rect.height * (0.5 + gy),
    r: 14 + random() * 12,
  };
}

/**
 * The circular deflection field handed to backends with shield collision
 * (wasm `rain_sim_set_shield`), scaled by shield strength.
 * @param {ShieldRect} rect
 * @param {number} strength 0..1
 * @returns {ShieldCircle}
 */
export function shieldCircle(rect, strength) {
  const s = Math.max(0, Math.min(1, strength));
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    r: (Math.min(rect.width, rect.height) / 2) * s,
  };
}

/**
 * Drives rain intensity / drop rate / refraction strength from editor
 * activity and a small weather-mode state machine (drizzle / steady /
 * storm / clearing). Only ever writes to the existing `raindrops.options`
 * proxy and RainLayer uniforms — no new shaders, no GL context churn.
 *
 * It also owns two spatial fields:
 *  - the **editor shield**: while the editor is focused, rain calms inside
 *    the rect from `setShieldSource()` (small stochastic clears, plus a
 *    deflection circle on backends that support `setShield`);
 *  - **wind**: lateral momentum from the weather mode, for backends that
 *    support `setWind` (the JS reference backend ignores it).
 */
export class WeatherSystem {
  /** @param {{ mode?: string, random?: () => number }} [options] */
  constructor({ mode, random = Math.random } = {}) {
    /** @type {WeatherMode} */
    this.mode = normalizeWeatherMode(mode ?? readWeatherModeOverride());
    this._random = random;
    this._activity = 0;
    this._typingKick = 0;
    this._cursorKick = 0;
    this._focused = true;
    this._manualMultiplier = 1;
    this._sceneMultiplier = 1;
    this._lastTime = 0;
    /** @type {Set<(mode: WeatherMode) => void>} */
    this._listeners = new Set();

    /** @type {(() => ShieldRect | null) | null} */
    this._shieldSource = null;
    this._shieldStrength = 0;
    this._shieldAccumulator = 0;
    /** @type {ShieldCircle | null} last circle pushed to `setShield` */
    this._shieldSent = null;
    this._windSent = 0;
    this._wind = 0;

    /** @type {WeatherSim | null} */
    this.raindrops = null;
    /** @type {WeatherLayer | null} */
    this.bgLayer = null;
    /** @type {WeatherLayer | null} */
    this.fgLayer = null;
    /** @type {WeatherAudioSink | null} */
    this.audio = null;

    /** @type {WeatherParams} */
    this._current = computeWeatherTargets(this.mode, 0);
  }

  /**
   * Attach (or re-attach) the sim / render / audio objects this drives.
   * @param {{ raindrops?: WeatherSim, bgLayer?: WeatherLayer, fgLayer?: WeatherLayer, audio?: WeatherAudioSink }} [targets]
   */
  attach({ raindrops, bgLayer, fgLayer, audio } = {}) {
    if (raindrops) this.raindrops = raindrops;
    if (bgLayer) this.bgLayer = bgLayer;
    if (fgLayer) this.fgLayer = fgLayer;
    if (audio) {
      this.audio = audio;
      this.audio.setMode(this.mode, WEATHER_MODES[this.mode]);
    }
  }

  getMode() {
    return this.mode;
  }

  getProfile() {
    return WEATHER_MODES[this.mode];
  }

  getActivity() {
    return this._activity;
  }

  /** 0..1 — how raised the editor shield currently is. */
  getShieldStrength() {
    return this._shieldStrength;
  }

  /** @param {(mode: WeatherMode) => void} callback @returns {() => void} unsubscribe */
  onModeChange(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /** @param {string} mode @param {{ persist?: boolean }} [options] */
  setMode(mode, { persist = true } = {}) {
    const normalized = normalizeWeatherMode(mode);
    if (normalized === this.mode) return this.mode;
    this.mode = normalized;
    if (persist) persistWeatherMode(normalized);
    if (this.audio) this.audio.setMode(normalized, WEATHER_MODES[normalized]);
    for (const callback of this._listeners) {
      try {
        callback(normalized);
      } catch (error) {
        console.error("[WeatherSystem] mode listener failed", error);
      }
    }
    return this.mode;
  }

  /** Manual "Storm Intensity" dock slider (0-100, default 30 == 1x). @param {number} sliderValue */
  setManualIntensity(sliderValue) {
    const v = Number.isFinite(sliderValue) ? sliderValue : 30;
    this._manualMultiplier = Math.max(0, v) / 30;
  }

  /** Scene-driven multiplier on rain chance only (e.g. calmer while the 3D cabinet is open). @param {number} factor */
  setSceneMultiplier(factor) {
    this._sceneMultiplier = Number.isFinite(factor) && factor > 0 ? factor : 1;
  }

  /**
   * Where the editor shield sits. Sampled once per `update()`; return null
   * to drop the shield (e.g. editor hidden).
   * @param {(() => ShieldRect | null) | null} source
   */
  setShieldSource(source) {
    this._shieldSource = source;
  }

  /** Call once per keystroke/content-change with the number of characters involved. */
  registerTyping(charCount = 1) {
    this._typingKick = Math.min(1, this._typingKick + Math.max(0, charCount) * 0.12);
  }

  registerCursorMove() {
    this._cursorKick = Math.min(1, this._cursorKick + 0.15);
  }

  /** @param {boolean} hasFocus */
  registerFocus(hasFocus) {
    this._focused = Boolean(hasFocus);
  }

  /**
   * Advance the damped simulation and apply the result. Call once per
   * animation frame with no argument (elapsed time is measured internally);
   * an explicit `dtMs` is accepted for deterministic tests.
   * @param {number} [dtMs]
   */
  update(dtMs) {
    const now = performance.now();
    const dt = Number.isFinite(dtMs)
      ? /** @type {number} */ (dtMs)
      : this._lastTime
        ? Math.min(200, now - this._lastTime)
        : 16;
    this._lastTime = now;

    const kickDecay = Math.exp(-dt / KICK_DECAY_TAU_MS);
    this._typingKick *= kickDecay;
    this._cursorKick *= kickDecay;

    const instantActivity = this._focused
      ? Math.min(1, this._typingKick * 0.85 + this._cursorKick * 0.35)
      : 0;

    const activityAlpha = 1 - Math.exp(-dt / ACTIVITY_TAU_MS);
    this._activity += (instantActivity - this._activity) * activityAlpha;

    const targets = computeWeatherTargets(this.mode, this._activity);
    targets.rainChance = Math.min(
      1,
      targets.rainChance * this._manualMultiplier * this._sceneMultiplier,
    );
    targets.dropletsRate *= this._manualMultiplier;

    const paramAlpha = 1 - Math.exp(-dt / PARAM_TAU_MS);
    for (const key of /** @type {(keyof WeatherParams)[]} */ (Object.keys(targets))) {
      const cur = this._current[key] ?? targets[key];
      this._current[key] = cur + (targets[key] - cur) * paramAlpha;
    }
    this._wind += (computeWind(this.mode, this._activity) - this._wind) * paramAlpha;

    this._apply();
    this._applyShield(dt);
    this._applyWind();
    if (this.audio?.update) this.audio.update(dt, this._activity);
    else this.audio?.setIntensity?.(this._activity);
    return this._current;
  }

  _apply() {
    const c = this._current;
    if (this.raindrops?.options) {
      this._setIfChanged(this.raindrops.options, "rainChance", c.rainChance, 0.002);
      this._setIfChanged(this.raindrops.options, "dropletsRate", c.dropletsRate, 0.5);
      this._setIfChanged(this.raindrops.options, "maxDrops", Math.round(c.maxDrops), 1);
      this._setIfChanged(this.raindrops.options, "trailRate", c.trailRate, 0.01);
      this._setIfChanged(this.raindrops.options, "globalTimeScale", c.globalTimeScale, 0.01);
    }
    for (const layer of [this.bgLayer, this.fgLayer]) {
      if (!layer) continue;
      layer.setUniform("u_alphaMultiply", c.u_alphaMultiply);
      layer.setUniform("u_alphaSubtract", c.u_alphaSubtract);
      layer.setUniform("u_minRefraction", c.u_minRefraction);
      layer.setUniform("u_refractionDelta", c.u_refractionDelta);
    }
  }

  /** @param {number} dt */
  _applyShield(dt) {
    const rect = this._shieldSource ? this._shieldSource() : null;
    const usable = rect && rect.width > 0 && rect.height > 0 ? rect : null;
    const target = usable && this._focused ? 1 : 0;
    this._shieldStrength += (target - this._shieldStrength) * (1 - Math.exp(-dt / SHIELD_TAU_MS));
    if (this._shieldStrength < SHIELD_MIN_STRENGTH && target === 0) this._shieldStrength = 0;

    const drops = this.raindrops;
    if (!drops) return;
    if (usable && this._shieldStrength > 0) {
      this._shieldAccumulator += (SHIELD_CLEARS_PER_SEC * this._shieldStrength * dt) / 1000;
      while (this._shieldAccumulator >= 1) {
        this._shieldAccumulator -= 1;
        const c = sampleShieldClear(usable, this._random);
        drops.clearDroplets?.(c.x, c.y, c.r);
      }
    } else {
      this._shieldAccumulator = 0;
    }

    if (!drops.setShield) return;
    const circle = usable && this._shieldStrength > 0 ? shieldCircle(usable, this._shieldStrength) : null;
    const sent = this._shieldSent;
    const changed = circle
      ? !sent || Math.abs(sent.x - circle.x) > 1 || Math.abs(sent.y - circle.y) > 1 || Math.abs(sent.r - circle.r) > 1
      : sent !== null;
    if (!changed) return;
    this._shieldSent = circle;
    if (circle) drops.setShield(circle.x, circle.y, circle.r);
    else drops.setShield(0, 0, 0);
  }

  _applyWind() {
    const drops = this.raindrops;
    if (!drops?.setWind || Math.abs(this._wind - this._windSent) < 0.01) return;
    this._windSent = this._wind;
    drops.setWind(this._wind, 0);
  }

  /**
   * @param {Record<string, any>} obj
   * @param {string} key
   * @param {number} value
   * @param {number} epsilon
   */
  _setIfChanged(obj, key, value, epsilon) {
    if (Math.abs((obj[key] ?? 0) - value) > epsilon) obj[key] = value;
  }

  getDiagnostics() {
    return {
      mode: this.mode,
      activity: this._activity,
      focused: this._focused,
      manualMultiplier: this._manualMultiplier,
      sceneMultiplier: this._sceneMultiplier,
      shieldStrength: this._shieldStrength,
      wind: this._wind,
      audioEnabled: this.audio?.isEnabled?.() ?? false,
      current: { ...this._current },
    };
  }
}

export default WeatherSystem;
