// @ts-check
import * as app from "../appContext.js";

const STORM_DECAY = 4;
const STORM_INTENSE = 80;
const TICK_MS = 1000;

/**
 * @typedef {object} LightningStrike
 * @property {number} intensity 0..1 flash strength
 * @property {number} distance  0..1 (0 = overhead) — drives thunder delay/volume
 * @property {"ambient" | "surge"} cause
 */

/**
 * @typedef {object} AtmosphereDeps
 * @property {import("monaco-editor").editor.IStandaloneCodeEditor} editor
 * @property {typeof import("monaco-editor")} monaco
 * @property {import("./WeatherSystem.js").WeatherSystem} weatherSystem
 * @property {HTMLElement | null} [echoLayerEl]
 * @property {HTMLElement | null} [referenceLayer]
 * @property {HTMLElement | null} [vignetteLayer]
 * @property {HTMLElement | null} [lightningLayer]
 * @property {any} [ctx] appContext-shaped bag (referenceManager, raindrops)
 * @property {Document} [doc]
 * @property {Window | null} [win] for `prefers-reduced-motion`
 * @property {() => number} [random]
 */

/**
 * Editor "atmosphere": diagnostics, typing and the weather mode drive the
 * page mood. Owns the hue, lightning, vignette, and heat shimmer.
 *
 *  - Monaco markers set a base hue (cyan calm / orange warnings / red errors)
 *    and an intensity surge (`updateFromMarkers()`).
 *  - `registerTyping()` accumulates a storm charge (decaying each second) and
 *    forwards the keystroke to `WeatherSystem`, so one call drives both.
 *  - A 1 Hz step (counted on the AppClock, not a timer) blends both into
 *    `--dynamic-hue` breathing, heat distortion, reference-card storm
 *    intensity, rain streaks and the hyper-focus vignette.
 *  - Lightning: ambient strikes spaced by the weather mode's `lightning`
 *    profile, plus surges while typing hard. Each strike notifies
 *    `onStrike()` listeners (WeatherAudio thunder follows).
 *
 * Runs as the AppClock `atmosphere` task, so a hidden tab stops lightning
 * for free. `setMuted(true)` ("mute world") stops strikes entirely;
 * `prefers-reduced-motion` keeps strikes (thunder) but never flashes.
 * Rain density itself is owned by `WeatherSystem`; this only reacts to it.
 */
export class Atmosphere {
  /** @param {AtmosphereDeps} deps */
  constructor({
    editor,
    monaco,
    weatherSystem,
    echoLayerEl = null,
    referenceLayer = null,
    vignetteLayer = null,
    lightningLayer = null,
    ctx = app,
    doc = document,
    win = typeof window !== "undefined" ? window : null,
    random = Math.random,
  }) {
    this.editor = editor;
    this.monaco = monaco;
    this.weatherSystem = weatherSystem;
    this.echoLayerEl = echoLayerEl;
    this.referenceLayer = referenceLayer;
    this.vignetteLayer = vignetteLayer;
    this.lightningLayer = lightningLayer;
    this.ctx = ctx;
    this.doc = doc;
    this._random = random;
    this.hue = 180;
    this.intensity = 0;
    this.stormCharCount = 0;
    this.muted = false;
    this.reducedMotion = false;
    this._tickAcc = 0;
    /** ms until the next ambient strike (Infinity = this mode has none). */
    this._untilStrike = this._nextGap();
    /** ms the current flash stays lit. */
    this._flashRemaining = 0;
    this.strikes = 0;
    /** @type {Set<(strike: LightningStrike) => void>} */
    this._strikeListeners = new Set();
    /** @type {(() => void) | null} */
    this._unsubscribeMode = null;

    const mq = win?.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq) {
      this.reducedMotion = mq.matches;
      mq.addEventListener?.("change", (e) => {
        this.reducedMotion = e.matches;
        if (e.matches) this._setFlash(0);
      });
    }
  }

  /**
   * Register on the clock. Lightning stops whenever the clock does
   * (hidden tab) — there is no timer to leak.
   * @param {import("../runtime/AppClock.js").AppClock} clock
   */
  start(clock) {
    if (clock.has("atmosphere")) return this;
    clock.register({ id: "atmosphere", update: (dt, t) => this.update(dt, t) });
    this._unsubscribeMode = this.weatherSystem.onModeChange(() => {
      this._untilStrike = this._nextGap();
    });
    return this;
  }

  /** @param {import("../runtime/AppClock.js").AppClock} clock */
  stop(clock) {
    clock.unregister("atmosphere");
    this._unsubscribeMode?.();
    this._unsubscribeMode = null;
    this._setFlash(0);
  }

  /** @param {(strike: LightningStrike) => void} cb @returns {() => void} */
  onStrike(cb) {
    this._strikeListeners.add(cb);
    return () => this._strikeListeners.delete(cb);
  }

  /** "Mute world": no strikes, no flash, no lightning CSS. @param {boolean} muted */
  setMuted(muted) {
    this.muted = Boolean(muted);
    this.lightningLayer?.classList.toggle("lightning-muted", this.muted);
    if (this.muted) this._setFlash(0);
    else this._untilStrike = this._nextGap();
  }

  /**
   * One editor content change: storm charge here, activity in WeatherSystem.
   * @param {number} chars
   */
  registerTyping(chars) {
    this.stormCharCount += Math.max(0, chars);
    this.weatherSystem.registerTyping(chars || 1);
  }

  updateFromMarkers() {
    const { editor, monaco } = this;
    const model = editor.getModel();
    if (!model) return;
    let errors = 0;
    let warnings = 0;
    monaco.editor.getModelMarkers({ resource: model.uri }).forEach((m) => {
      if (m.severity === monaco.MarkerSeverity.Error) errors++;
      if (m.severity === monaco.MarkerSeverity.Warning) warnings++;
    });

    if (errors > 0) {
      this.hue = 0;
      this.intensity = Math.min(50, errors * 10);
    } else if (warnings > 0) {
      this.hue = 40;
      this.intensity = Math.min(20, warnings * 5);
    } else {
      this.hue = 180;
      this.intensity = 0;
    }
  }

  /**
   * Fire one lightning strike now (no-op while muted).
   * @param {LightningStrike["cause"]} [cause]
   * @returns {LightningStrike | null}
   */
  strike(cause = "ambient") {
    if (this.muted) return null;
    /** @type {LightningStrike} */
    const strike = {
      intensity: 0.6 + this._random() * 0.4,
      distance: cause === "surge" ? this._random() * 0.4 : 0.2 + this._random() * 0.8,
      cause,
    };
    this.strikes++;
    if (!this.reducedMotion) {
      this._setFlash(strike.intensity);
      this._flashRemaining = 50 + this._random() * 100;
    }
    for (const cb of this._strikeListeners) {
      try {
        cb(strike);
      } catch (error) {
        console.error("[Atmosphere] strike listener failed", error);
      }
    }
    return strike;
  }

  /**
   * AppClock update: flash decay, ambient lightning, and the 1 Hz mood step.
   * @param {number} dt @param {number} t
   */
  update(dt, t) {
    if (this._flashRemaining > 0) {
      this._flashRemaining -= dt;
      if (this._flashRemaining <= 0) this._setFlash(0);
    }

    if (!this.muted) {
      this._untilStrike -= dt;
      if (this._untilStrike <= 0) {
        this.strike("ambient");
        this._untilStrike = this._nextGap();
      }
    }

    this._tickAcc += dt;
    if (this._tickAcc >= TICK_MS) {
      // Catch-up after a long frame runs one step, not a burst.
      this._tickAcc %= TICK_MS;
      this._tick(t);
    }
  }

  getDiagnostics() {
    return {
      hue: this.hue,
      stormCharCount: this.stormCharCount,
      muted: this.muted,
      reducedMotion: this.reducedMotion,
      untilStrikeMs: this._untilStrike,
      strikes: this.strikes,
    };
  }

  _nextGap() {
    const profile = this.weatherSystem.getProfile().lightning;
    if (!profile) return Infinity;
    return profile.minGapMs + this._random() * (profile.maxGapMs - profile.minGapMs);
  }

  /** @param {number} opacity */
  _setFlash(opacity) {
    if (this.lightningLayer) this.lightningLayer.style.opacity = String(opacity);
    if (opacity === 0) this._flashRemaining = 0;
  }

  /** @param {number} t clock time (ms) */
  _tick(t) {
    if (this.stormCharCount > 0) {
      this.stormCharCount = Math.max(0, this.stormCharCount - STORM_DECAY);
    }

    // Errors/warnings own the hue; otherwise typing shifts it toward magenta.
    let baseHue = this.hue;
    let breathIntensity = 10;
    if (this.hue === 180) {
      baseHue = 180 + Math.min(120, this.stormCharCount * 1.5);
      breathIntensity = 10 + Math.min(30, this.stormCharCount);
    }
    const time = t / 1000;
    const breathSpeed = 1 + Math.min(2, this.stormCharCount * 0.05);
    const finalHue = baseHue + Math.sin(time * breathSpeed) * breathIntensity;
    this.doc.documentElement.style.setProperty("--dynamic-hue", String(finalHue));

    const totalIntensity = this.stormCharCount + this.intensity;
    const heat = totalIntensity > 150;
    if (this.echoLayerEl) this.echoLayerEl.classList.toggle("heat-active", heat);
    if (this.referenceLayer) this.referenceLayer.classList.toggle("heat-active", heat);

    const referenceManager = this.ctx.referenceManager;
    if (referenceManager) referenceManager.setStormIntensity(totalIntensity);

    const raindrops = this.ctx.raindrops;
    if (raindrops) {
      // 20% chance of a close strike per second during an intense storm.
      if (totalIntensity > STORM_INTENSE && this._random() < 0.2) this.strike("surge");
      if (referenceManager) {
        referenceManager.toggleRainStreaks(raindrops.options.rainChance > 0.5);
      }
    }

    if (this.vignetteLayer) {
      this.vignetteLayer.style.opacity = this.doc.body.classList.contains("focus-readable")
        ? "0"
        : String(Math.min(1, totalIntensity / 60));
    }
  }
}
