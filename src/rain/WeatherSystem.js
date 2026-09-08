import {
  WEATHER_MODES,
  computeWeatherTargets,
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

/**
 * Drives rain intensity / drop rate / refraction strength from editor
 * activity and a small weather-mode state machine (drizzle / steady /
 * storm / clearing). Only ever writes to the existing `raindrops.options`
 * proxy and RainLayer uniforms — no new shaders, no GL context churn.
 */
export class WeatherSystem {
  constructor({ mode } = {}) {
    this.mode = normalizeWeatherMode(mode ?? readWeatherModeOverride());
    this._activity = 0;
    this._typingKick = 0;
    this._cursorKick = 0;
    this._focused = true;
    this._manualMultiplier = 1;
    this._sceneMultiplier = 1;
    this._lastTime = 0;
    this._listeners = new Set();

    this.raindrops = null;
    this.bgLayer = null;
    this.fgLayer = null;
    this.audio = null;

    this._current = computeWeatherTargets(this.mode, 0);
  }

  /** Attach (or re-attach) the sim / render / audio objects this drives. */
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

  getActivity() {
    return this._activity;
  }

  /** @param {(mode: string) => void} callback @returns {() => void} unsubscribe */
  onModeChange(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

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

  /** Manual "Storm Intensity" dock slider (0-100, default 30 == 1x). */
  setManualIntensity(sliderValue) {
    const v = Number.isFinite(sliderValue) ? sliderValue : 30;
    this._manualMultiplier = Math.max(0, v) / 30;
  }

  /** Scene-driven multiplier on rain chance only (e.g. calmer while the 3D cabinet is open). */
  setSceneMultiplier(factor) {
    this._sceneMultiplier = Number.isFinite(factor) && factor > 0 ? factor : 1;
  }

  /** Call once per keystroke/content-change with the number of characters involved. */
  registerTyping(charCount = 1) {
    this._typingKick = Math.min(1, this._typingKick + Math.max(0, charCount) * 0.12);
  }

  registerCursorMove() {
    this._cursorKick = Math.min(1, this._cursorKick + 0.15);
  }

  registerFocus(hasFocus) {
    this._focused = Boolean(hasFocus);
  }

  /**
   * Advance the damped simulation and apply the result. Call once per
   * animation frame with no argument (elapsed time is measured internally);
   * an explicit `dtMs` is accepted for deterministic tests.
   */
  update(dtMs) {
    const now = performance.now();
    if (!Number.isFinite(dtMs)) {
      dtMs = this._lastTime ? Math.min(200, now - this._lastTime) : 16;
    }
    this._lastTime = now;

    const kickDecay = Math.exp(-dtMs / KICK_DECAY_TAU_MS);
    this._typingKick *= kickDecay;
    this._cursorKick *= kickDecay;

    const instantActivity = this._focused
      ? Math.min(1, this._typingKick * 0.85 + this._cursorKick * 0.35)
      : 0;

    const activityAlpha = 1 - Math.exp(-dtMs / ACTIVITY_TAU_MS);
    this._activity += (instantActivity - this._activity) * activityAlpha;

    const targets = computeWeatherTargets(this.mode, this._activity);
    targets.rainChance = Math.min(
      1,
      targets.rainChance * this._manualMultiplier * this._sceneMultiplier,
    );
    targets.dropletsRate *= this._manualMultiplier;

    const paramAlpha = 1 - Math.exp(-dtMs / PARAM_TAU_MS);
    for (const key of Object.keys(targets)) {
      const cur = this._current[key] ?? targets[key];
      this._current[key] = cur + (targets[key] - cur) * paramAlpha;
    }

    this._apply();
    this.audio?.setIntensity(this._activity);
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
      audioEnabled: this.audio?.isEnabled?.() ?? false,
      current: { ...this._current },
    };
  }
}

export default WeatherSystem;
