import assert from "node:assert/strict";
import test from "node:test";
import { WeatherAudio, synthThunder, synthTick } from "../src/audio/WeatherAudio.js";

function param(value = 0) {
  return {
    value,
    setTargetAtTime(v) { this.value = v; },
    setValueAtTime(v) { this.value = v; },
    cancelScheduledValues() {},
  };
}
function node(extra = {}) {
  return { connections: [], connect(n) { this.connections.push(n); return n; }, ...extra };
}

/** Minimal Web Audio fake recording what the graph does. */
function makeFakeContext() {
  const created = [];
  class FakeAudioContext {
    constructor() {
      this.sampleRate = 8000;
      this.currentTime = 10;
      this.state = "running";
      this.destination = node();
      this.started = [];
      created.push(this);
    }
    createGain() { return node({ gain: param(1) }); }
    createStereoPanner() { return node({ pan: param(0) }); }
    createBiquadFilter() { return node({ type: "", frequency: param(350), Q: param(1) }); }
    createBuffer(_ch, length, sampleRate) {
      const data = new Float32Array(length);
      return { length, sampleRate, getChannelData: () => data };
    }
    createBufferSource() {
      const ctx = this;
      return node({
        buffer: null,
        loop: false,
        playbackRate: param(1),
        start(at = 0) { ctx.started.push({ src: this, at }); },
        stop() {},
      });
    }
    decodeAudioData() { return Promise.resolve({ decoded: true }); }
    resume() { this.state = "running"; return Promise.resolve(); }
    suspend() { this.state = "suspended"; return Promise.resolve(); }
    close() {}
  }
  return { FakeAudioContext, created };
}

function fakeDoc() {
  const listeners = {};
  return {
    hidden: false,
    addEventListener: (t, cb) => (listeners[t] = cb),
    removeEventListener: () => {},
    fire(t) { listeners[t]?.(); },
  };
}

function makeAudio({ reduced = false, fetchFn = null } = {}) {
  const { FakeAudioContext, created } = makeFakeContext();
  const doc = fakeDoc();
  const audio = new WeatherAudio({
    AudioContextCtor: FakeAudioContext,
    doc,
    win: { matchMedia: () => ({ matches: reduced, addEventListener() {} }) },
    fetchFn,
    random: () => 0.5,
  });
  return { audio, created, doc };
}

test("no AudioContext exists until enable() (gesture-gated)", () => {
  const { audio, created } = makeAudio();
  audio.setMode("storm", { audio: { gain: 0.16, filterFrequency: 2200, filterQ: 0.8 } });
  audio.setPan(1);
  audio.update(16, 1);
  assert.equal(audio.thunder(), false);
  assert.equal(created.length, 0);
  audio.enable();
  assert.equal(created.length, 1);
  assert.ok(audio.isAudible());
  assert.equal(audio.masterGain.gain.value, 1);
});

test("hidden tab and mute world both silence the graph and suspend the context", () => {
  const { audio, created, doc } = makeAudio();
  audio.enable();
  const ctx = created[0];

  doc.hidden = true;
  doc.fire("visibilitychange");
  assert.equal(audio.isAudible(), false);
  assert.equal(audio.masterGain.gain.value, 0);
  assert.equal(ctx.state, "suspended");
  assert.equal(audio.thunder({ distance: 0 }), false);

  doc.hidden = false;
  doc.fire("visibilitychange");
  assert.equal(ctx.state, "running");
  assert.equal(audio.masterGain.gain.value, 1);

  audio.setWorldMuted(true);
  assert.equal(audio.masterGain.gain.value, 0);
  assert.equal(ctx.state, "suspended");
  const ticks = audio.ticksPlayed;
  audio.update(5000, 1);
  assert.equal(audio.ticksPlayed, ticks, "no droplet ticks while muted");
  audio.setWorldMuted(false);
  assert.ok(audio.isAudible());

  audio.disable();
  assert.equal(audio.masterGain.gain.value, 0);
});

test("thunder is delayed and darkened by distance", () => {
  const { audio, created } = makeAudio();
  audio.enable();
  const ctx = created[0];
  const before = ctx.started.length;
  assert.equal(audio.thunder({ distance: 0 }), true);
  assert.equal(audio.thunder({ distance: 1 }), true);
  const [near, far] = ctx.started.slice(before);
  assert.ok(Math.abs(near.at - (ctx.currentTime + 0.3)) < 1e-9);
  assert.ok(Math.abs(far.at - (ctx.currentTime + 3.0)) < 1e-9);
  const lowpassOf = (s) => s.src.connections[0];
  assert.ok(lowpassOf(near).frequency.value > lowpassOf(far).frequency.value);
  assert.equal(audio.thundersPlayed, 2);
});

test("droplet ticks are sparse, rise with activity, and stop under reduced motion", () => {
  const { audio } = makeAudio();
  audio.enable();
  audio.update(10_000, 0);
  const calm = audio.ticksPlayed;
  audio.update(10_000, 1);
  const busy = audio.ticksPlayed - calm;
  assert.ok(calm >= 3 && calm <= 5, `calm ticks ${calm}`);
  assert.ok(busy > calm && busy <= 26, `busy ticks ${busy}`);

  const reduced = makeAudio({ reduced: true }).audio;
  reduced.enable();
  reduced.update(10_000, 1);
  assert.equal(reduced.ticksPlayed, 0);
});

test("cursor X pans the stereo field and tab depth muffles the bed", () => {
  const { audio } = makeAudio();
  audio.enable();
  audio.setPan(0);
  assert.ok(Math.abs(audio.panNode.pan.value + 0.6) < 1e-9);
  audio.setPan(1);
  assert.ok(Math.abs(audio.panNode.pan.value - 0.6) < 1e-9);
  const front = audio.depthFilter.frequency.value;
  audio.setDepth(0);
  assert.ok(audio.depthFilter.frequency.value < front);
  assert.equal(audio.getDiagnostics().depth, 0);
});

test("the opus thunder sample replaces the synth once decoded; failures keep the synth", async () => {
  const ok = makeAudio({
    fetchFn: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }),
  });
  ok.audio.enable();
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(ok.audio.thunderBuffer, { decoded: true });

  const info = console.info;
  console.info = () => {};
  try {
    const bad = makeAudio({ fetchFn: async () => ({ ok: false, status: 404 }) });
    bad.audio.enable();
    await new Promise((r) => setImmediate(r));
    assert.equal(bad.audio.thunderBuffer, null);
    assert.equal(bad.audio.thunder(), true, "synth fallback still rumbles");
  } finally {
    console.info = info;
  }
});

test("synth buffers are finite and the right length", () => {
  const { FakeAudioContext } = makeFakeContext();
  const ctx = new FakeAudioContext();
  const thunder = synthThunder(ctx, () => 0.9);
  assert.equal(thunder.length, 3 * ctx.sampleRate);
  assert.ok(thunder.getChannelData(0).every(Number.isFinite));
  assert.equal(synthTick(ctx).length, Math.floor(ctx.sampleRate * 0.012));
});
