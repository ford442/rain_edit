/**
 * Optional ambient rain bed that follows the weather mode.
 *
 * Starts muted and never touches AudioContext until `enable()` is called
 * from a user gesture (the dock checkbox), per browser autoplay policy.
 * A single filtered looping noise buffer stands in for rain "hiss"; gain
 * and filter targets come from each weather mode's `audio` profile.
 */
export class WeatherAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.gainNode = null;
    this.filterNode = null;
    this.sourceNode = null;
    this._baseGain = 0.09;
  }

  isEnabled() {
    return this.enabled;
  }

  enable() {
    if (this.enabled) return;
    this._ensureGraph();
    if (!this.ctx) return;
    this.enabled = true;
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.gainNode.gain.setTargetAtTime(this._baseGain * 0.6, this.ctx.currentTime, 0.25);
  }

  disable() {
    this.enabled = false;
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }
  }

  toggle() {
    if (this.enabled) this.disable();
    else this.enable();
    return this.enabled;
  }

  _ensureGraph() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = "bandpass";
    this.filterNode.frequency.value = 1400;
    this.filterNode.Q.value = 0.6;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0;

    noise.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    noise.start();
    this.sourceNode = noise;
  }

  /** @param {string} mode @param {{audio?: {gain: number, filterFrequency: number, filterQ: number}}} profile */
  setMode(mode, profile) {
    if (!profile?.audio) return;
    this._baseGain = profile.audio.gain;
    if (this.filterNode && this.ctx) {
      this.filterNode.frequency.setTargetAtTime(
        profile.audio.filterFrequency,
        this.ctx.currentTime,
        0.6,
      );
      this.filterNode.Q.setTargetAtTime(profile.audio.filterQ, this.ctx.currentTime, 0.6);
    }
    if (this.enabled && this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(this._baseGain * 0.6, this.ctx.currentTime, 0.5);
    }
  }

  /** @param {number} activity 0..1 editor-activity signal from WeatherSystem */
  setIntensity(activity) {
    if (!this.enabled || !this.gainNode || !this.ctx) return;
    const target = this._baseGain * (0.6 + Math.max(0, Math.min(1, activity)) * 0.4);
    this.gainNode.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
  }

  destroy() {
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
}

export default WeatherAudio;
