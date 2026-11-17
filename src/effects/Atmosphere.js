import * as app from "../appContext.js";

const STORM_DECAY = 4;
const STORM_INTENSE = 80;

/**
 * Editor "atmosphere": diagnostics and typing drive the page mood.
 *
 *  - Monaco markers set a base hue (cyan calm / orange warnings / red errors)
 *    and an intensity surge (`updateFromMarkers()`).
 *  - Typed characters accumulate in `stormCharCount`, decaying each second.
 *  - A 1 Hz tick blends both into `--dynamic-hue` breathing, heat distortion,
 *    reference-card storm intensity, rain streaks, the hyper-focus vignette,
 *    and lightning during intense storms.
 *
 * Rain density itself is owned by `WeatherSystem`; this only reacts to it.
 */
export class Atmosphere {
  /**
   * @param {{
   *   editor: import("monaco-editor").editor.IStandaloneCodeEditor,
   *   monaco: typeof import("monaco-editor"),
   *   echoLayerEl?: HTMLElement | null,
   *   referenceLayer?: HTMLElement | null,
   *   vignetteLayer?: HTMLElement | null,
   *   lightningLayer?: HTMLElement | null,
   *   ctx?: Partial<typeof app>,
   *   doc?: Document,
   * }} deps
   */
  constructor({
    editor,
    monaco,
    echoLayerEl = null,
    referenceLayer = null,
    vignetteLayer = null,
    lightningLayer = null,
    ctx = app,
    doc = document,
  }) {
    this.editor = editor;
    this.monaco = monaco;
    this.echoLayerEl = echoLayerEl;
    this.referenceLayer = referenceLayer;
    this.vignetteLayer = vignetteLayer;
    this.lightningLayer = lightningLayer;
    this.ctx = ctx;
    this.doc = doc;
    this.hue = 180;
    this.intensity = 0;
    this.stormCharCount = 0;
    /** @type {ReturnType<typeof setInterval> | null} */
    this._interval = null;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._lightningTimer = null;
  }

  start() {
    if (this._interval) return this;
    this._interval = setInterval(() => this._tick(), 1000);
    this._scheduleLightning();
    return this;
  }

  stop() {
    if (this._interval) clearInterval(this._interval);
    if (this._lightningTimer) clearTimeout(this._lightningTimer);
    this._interval = null;
    this._lightningTimer = null;
  }

  /** @param {number} chars */
  registerTyping(chars) {
    this.stormCharCount += chars;
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

  /** One lightning flash. */
  flash() {
    const layer = this.lightningLayer;
    if (!layer) return;
    layer.style.opacity = String(0.6 + Math.random() * 0.4);
    setTimeout(() => {
      layer.style.opacity = "0";
    }, 50 + Math.random() * 100);
  }

  /** Ambient lightning every 10–30s. */
  _scheduleLightning() {
    this._lightningTimer = setTimeout(() => {
      this.flash();
      this._scheduleLightning();
    }, 10000 + Math.random() * 20000);
  }

  _tick() {
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
    const time = Date.now() / 1000;
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
      // 20% chance of lightning per second during an intense storm.
      if (totalIntensity > STORM_INTENSE && Math.random() < 0.2) this.flash();
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
