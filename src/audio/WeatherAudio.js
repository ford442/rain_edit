// @ts-check
/**
 * Optional ambient weather audio that follows the weather mode.
 *
 * Starts muted and never constructs an AudioContext until `enable()` is
 * called from a user gesture (the dock checkbox), per browser autoplay
 * policy. One graph, no timers of its own — `update()` is driven by
 * `WeatherSystem.update()` inside the AppClock `rain` task:
 *
 *   noise bed → bandpass → depth lowpass → bed gain ─┐
 *   thunder (decoded opus, synth fallback) → lowpass → gain → pan ─┤→ stereo pan → master → out
 *   droplet ticks (tiny noise bursts, ≤ ~2.5/s) → highpass → gain → pan ─┘
 *
 *  - **Spatial:** `setPan(x)` (normalized cursor X, 0..1) drives a
 *    `StereoPannerNode`; `setDepth(0|1|2)` treats the active tab's depth as
 *    distance — deeper tabs hear the rain more muffled and quieter.
 *  - **Thunder:** `thunder({ distance })` schedules a strike on the audio
 *    clock, delayed and darkened by distance (Atmosphere strikes call it).
 *  - **Silence:** the master gain is 0 and the context is suspended whenever
 *    the bed is disabled, the world is muted (`setWorldMuted`), or the tab is
 *    hidden. `prefers-reduced-motion` drops the droplet ticks.
 */

const THUNDER_URL = "./audio/thunder.opus";
const DEPTH_PROFILE = /** @type {const} */ ([
  { filter: 0.55, gain: 0.7 }, // depth 0: behind all rain
  { filter: 0.8, gain: 0.85 }, // depth 1: between layers
  { filter: 1.0, gain: 1.0 }, // depth 2: in front
]);
const PAN_WIDTH = 0.6;
const BED_LEVEL = 0.6;

/**
 * @typedef {object} WeatherAudioOptions
 * @property {(new () => AudioContext) | null} [AudioContextCtor]
 * @property {Document | null} [doc] visibility source (`null` = never hidden)
 * @property {Window | null} [win] for `prefers-reduced-motion`
 * @property {((url: string) => Promise<Response>) | null} [fetchFn]
 * @property {string} [thunderUrl]
 * @property {() => number} [random]
 */

/** @param {number} v @param {number} lo @param {number} hi */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class WeatherAudio {
  /** @param {WeatherAudioOptions} [options] */
  constructor({
    AudioContextCtor,
    doc = typeof document !== "undefined" ? document : null,
    win = typeof window !== "undefined" ? window : null,
    fetchFn = typeof fetch === "function" ? (url) => fetch(url) : null,
    thunderUrl = THUNDER_URL,
    random = Math.random,
  } = {}) {
    const anyWin = /** @type {any} */ (win);
    /** @type {(new () => AudioContext) | null} */
    this._AudioContextCtor =
      AudioContextCtor !== undefined
        ? AudioContextCtor
        : (anyWin?.AudioContext ?? anyWin?.webkitAudioContext ?? null);
    this._doc = doc;
    this._fetch = fetchFn;
    this._thunderUrl = thunderUrl;
    this._random = random;

    /** @type {AudioContext | null} */
    this.ctx = null;
    this.enabled = false;
    this.worldMuted = false;
    this.hidden = Boolean(doc?.hidden);
    this.reducedMotion = false;

    /** @type {GainNode | null} */ this.masterGain = null;
    /** @type {StereoPannerNode | null} */ this.panNode = null;
    /** @type {GainNode | null} */ this.gainNode = null; // bed gain
    /** @type {BiquadFilterNode | null} */ this.filterNode = null; // bed bandpass
    /** @type {BiquadFilterNode | null} */ this.depthFilter = null;
    /** @type {AudioBufferSourceNode | null} */ this.sourceNode = null;
    /** @type {AudioBuffer | null} */ this.thunderBuffer = null;
    /** @type {AudioBuffer | null} */ this._tickBuffer = null;

    this._baseGain = 0.09;
    this._filterFrequency = 1400;
    this._activity = 0;
    this._pan = 0;
    this._depth = 2;
    this._tickAcc = 0;
    this.thundersPlayed = 0;
    this.ticksPlayed = 0;

    this._onVisibility = () => {
      this.hidden = Boolean(this._doc?.hidden);
      this._syncAudible();
    };
    doc?.addEventListener("visibilitychange", this._onVisibility);

    const mq = win?.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq) {
      this.reducedMotion = mq.matches;
      mq.addEventListener?.("change", (e) => {
        this.reducedMotion = e.matches;
      });
    }
  }

  isEnabled() {
    return this.enabled;
  }

  /** True when sound can actually reach the speakers right now. */
  isAudible() {
    return this.enabled && !this.worldMuted && !this.hidden && this.ctx !== null;
  }

  /** Must be called from a user gesture the first time. */
  enable() {
    if (this.enabled) return;
    this._ensureGraph();
    if (!this.ctx) return;
    this.enabled = true;
    this._syncAudible();
  }

  disable() {
    this.enabled = false;
    this._syncAudible();
  }

  toggle() {
    if (this.enabled) this.disable();
    else this.enable();
    return this.enabled;
  }

  /** Dock "mute world": silences every layer (and Atmosphere stops lightning). @param {boolean} muted */
  setWorldMuted(muted) {
    this.worldMuted = Boolean(muted);
    this._syncAudible();
  }

  /** @param {string} _mode @param {{audio?: {gain: number, filterFrequency: number, filterQ: number}}} profile */
  setMode(_mode, profile) {
    if (!profile?.audio) return;
    this._baseGain = profile.audio.gain;
    this._filterFrequency = profile.audio.filterFrequency;
    const ctx = this.ctx;
    if (this.filterNode && ctx) {
      this.filterNode.frequency.setTargetAtTime(profile.audio.filterFrequency, ctx.currentTime, 0.6);
      this.filterNode.Q.setTargetAtTime(profile.audio.filterQ, ctx.currentTime, 0.6);
    }
    this._applyBed(0.5);
  }

  /** Normalized cursor X (0 = left edge, 1 = right edge). @param {number} x */
  setPan(x) {
    const pan = clamp((clamp(x, 0, 1) * 2 - 1) * PAN_WIDTH, -1, 1);
    if (Math.abs(pan - this._pan) < 0.01) return;
    this._pan = pan;
    if (this.panNode && this.ctx) this.panNode.pan.setTargetAtTime(pan, this.ctx.currentTime, 0.12);
  }

  /** Active tab depth (0 deep / 1 middle / 2 front) as listening distance. @param {number} depth */
  setDepth(depth) {
    const d = clamp(Math.round(depth), 0, 2);
    if (d === this._depth) return;
    this._depth = d;
    this._applyBed(0.4);
  }

  /** @param {number} activity 0..1 editor-activity signal from WeatherSystem */
  setIntensity(activity) {
    this._activity = clamp(activity, 0, 1);
    this._applyBed(0.25);
  }

  /**
   * Per-frame step (called by WeatherSystem.update): bed level + sparse
   * droplet ticks scheduled on the audio clock.
   * @param {number} dtMs @param {number} activity
   */
  update(dtMs, activity) {
    const a = clamp(activity, 0, 1);
    if (Math.abs(a - this._activity) > 0.01) this.setIntensity(a);
    if (!this.isAudible() || this.reducedMotion || this._baseGain <= 0.03) {
      this._tickAcc = 0;
      return;
    }
    // ~0.4/s at rest up to ~2.5/s while typing; quieter modes tick less.
    const rate = (0.4 + a * 2.1) * clamp(this._baseGain / 0.09, 0.3, 1.5);
    this._tickAcc += (rate * dtMs) / 1000;
    while (this._tickAcc >= 1) {
      this._tickAcc -= 1;
      this._playTick();
    }
  }

  /**
   * Schedule thunder for a lightning strike. No-op unless audible.
   * @param {{ distance?: number, intensity?: number }} [strike]
   * @returns {boolean} whether thunder was scheduled
   */
  thunder({ distance = 0.5, intensity = 1 } = {}) {
    const ctx = this.ctx;
    if (!ctx || !this.isAudible() || !this.masterGain) return false;
    const buffer = this.thunderBuffer ?? (this.thunderBuffer = synthThunder(ctx, this._random));
    const d = clamp(distance, 0, 1);
    // Sound lags light: ~0.3s overhead, ~3s at the horizon.
    const at = ctx.currentTime + 0.3 + d * 2.7;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = 0.85 + this._random() * 0.3;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 1800 - d * 1400;
    const gain = ctx.createGain();
    gain.gain.value = clamp(this._baseGain * 4 * (1 - d * 0.6) * clamp(intensity, 0, 1), 0, 0.8);
    src.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this._spatialOut());
    src.start(at);
    this.thundersPlayed++;
    return true;
  }

  getDiagnostics() {
    return {
      enabled: this.enabled,
      audible: this.isAudible(),
      worldMuted: this.worldMuted,
      hidden: this.hidden,
      state: this.ctx?.state ?? "none",
      pan: this._pan,
      depth: this._depth,
      thunderLoaded: this.thunderBuffer !== null,
      thundersPlayed: this.thundersPlayed,
      ticksPlayed: this.ticksPlayed,
    };
  }

  destroy() {
    this._doc?.removeEventListener("visibilitychange", this._onVisibility);
    try {
      this.sourceNode?.stop();
    } catch {
      // already stopped
    }
    try {
      this.ctx?.close?.();
    } catch {
      // ignore
    }
  }

  // ── internals ───────────────────────────────────────────────────────────

  _ensureGraph() {
    if (this.ctx || !this._AudioContextCtor) return;
    const ctx = new this._AudioContextCtor();
    this.ctx = ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(ctx.destination);
    // StereoPannerNode is everywhere modern; fall back to a straight wire.
    this.panNode = typeof ctx.createStereoPanner === "function" ? ctx.createStereoPanner() : null;
    if (this.panNode) {
      this.panNode.pan.value = this._pan;
      this.panNode.connect(this.masterGain);
    }

    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = this._random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = "bandpass";
    this.filterNode.frequency.value = this._filterFrequency;
    this.filterNode.Q.value = 0.6;
    this.depthFilter = ctx.createBiquadFilter();
    this.depthFilter.type = "lowpass";
    this.depthFilter.frequency.value = 8000 * DEPTH_PROFILE[this._depth].filter;
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0;

    noise.connect(this.filterNode);
    this.filterNode.connect(this.depthFilter);
    this.depthFilter.connect(this.gainNode);
    this.gainNode.connect(this._spatialOut());
    noise.start();
    this.sourceNode = noise;

    this._tickBuffer = synthTick(ctx, this._random);
    this._loadThunder(ctx);
  }

  /** Where per-layer chains connect: the stereo panner, or master directly. */
  _spatialOut() {
    return /** @type {AudioNode} */ (this.panNode ?? this.masterGain);
  }

  /** @param {AudioContext} ctx */
  _loadThunder(ctx) {
    if (!this._fetch) return;
    this._fetch(this._thunderUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((bytes) => ctx.decodeAudioData(bytes))
      .then((decoded) => {
        this.thunderBuffer = decoded;
      })
      .catch((err) => {
        // Opus unsupported or offline: the synthesized rumble stands in.
        console.info("[WeatherAudio] thunder sample unavailable; using synth", err?.message ?? err);
      });
  }

  /** @param {number} timeConstant */
  _applyBed(timeConstant) {
    const ctx = this.ctx;
    if (!ctx || !this.gainNode) return;
    const depth = DEPTH_PROFILE[this._depth];
    const target = this._baseGain * (BED_LEVEL + this._activity * 0.4) * depth.gain;
    this.gainNode.gain.setTargetAtTime(target, ctx.currentTime, timeConstant);
    this.depthFilter?.frequency.setTargetAtTime(8000 * depth.filter, ctx.currentTime, timeConstant);
  }

  /** Master gain + context suspension follow enabled / muted / hidden. */
  _syncAudible() {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;
    const audible = this.isAudible();
    if (audible) {
      if (ctx.state === "suspended") ctx.resume?.().catch(() => {});
      this._applyBed(0.25);
      this.masterGain.gain.setTargetAtTime(1, ctx.currentTime, 0.25);
    } else {
      this.masterGain.gain.cancelScheduledValues?.(ctx.currentTime);
      this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
      if (ctx.state === "running") ctx.suspend?.().catch(() => {});
    }
  }

  _playTick() {
    const ctx = this.ctx;
    if (!ctx || !this._tickBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this._tickBuffer;
    src.playbackRate.value = 0.7 + this._random() * 0.8;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2500 + this._random() * 2500;
    const gain = ctx.createGain();
    gain.gain.value = this._baseGain * (0.25 + this._random() * 0.35) * DEPTH_PROFILE[this._depth].gain;
    src.connect(hp);
    hp.connect(gain);
    gain.connect(this._spatialOut());
    src.start(ctx.currentTime + this._random() * 0.05);
    this.ticksPlayed++;
  }
}

/**
 * Fallback thunder: ~3s of brown noise with a fast attack, a few rolling
 * swells, and a long tail. Used until (or instead of) the opus sample.
 * @param {BaseAudioContext} ctx @param {() => number} random
 */
export function synthThunder(ctx, random = Math.random) {
  const seconds = 3;
  const n = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < n; i++) {
    brown = (brown + (random() * 2 - 1) * 0.02) / 1.02;
    const t = i / ctx.sampleRate;
    const env = Math.min(1, t / 0.04) * Math.exp(-t * 1.3) * (0.7 + 0.3 * Math.sin(t * 7.3) * Math.sin(t * 2.1));
    data[i] = brown * 3.5 * env;
  }
  return buffer;
}

/**
 * One droplet "tick": 12ms of decaying white noise.
 * @param {BaseAudioContext} ctx @param {() => number} random
 */
export function synthTick(ctx, random = Math.random) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * 0.012));
  const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (random() * 2 - 1) * Math.exp((-i / n) * 6);
  return buffer;
}

export default WeatherAudio;
