import assert from "node:assert/strict";
import test from "node:test";
import {
  DayCycle,
  SKY_KEYFRAMES,
  TIME_PRESETS,
  computeSky,
  normalizeTimeMode,
  phaseDelta,
  phaseFromDate,
  readTimeModeOverride,
  wrapPhase,
} from "../src/rain/DayCycle.js";

function fakeRoot() {
  const props = {};
  return { props, style: { setProperty: (k, v) => (props[k] = v) } };
}
function fakeLayer() {
  return { values: {}, setUniform(k, v) { this.values[k] = v; } };
}
const loaded = () => ({ complete: true, naturalWidth: 64 });
const loading = () => ({ complete: false, naturalWidth: 0 });

test("time modes normalize, and ?time= beats storage", () => {
  assert.equal(normalizeTimeMode("DUSK"), "dusk");
  assert.equal(normalizeTimeMode("clock"), "clock");
  assert.equal(normalizeTimeMode("teatime"), "night");
  const storage = { getItem: () => "dawn" };
  assert.equal(readTimeModeOverride("?time=dusk", storage), "dusk");
  assert.equal(readTimeModeOverride("", storage), "dawn");
  assert.equal(readTimeModeOverride("", { getItem: () => null }), "night");
});

test("phase helpers wrap and take the short way round", () => {
  assert.equal(wrapPhase(1.25), 0.25);
  assert.equal(wrapPhase(-0.25), 0.75);
  assert.ok(Math.abs(phaseDelta(0.9, 0.1) - 0.2) < 1e-9);
  assert.ok(Math.abs(phaseDelta(0.1, 0.9) + 0.2) < 1e-9);
  assert.equal(phaseFromDate(new Date(2026, 0, 1, 18, 0, 0)), 0.75);
});

test("computeSky hits keyframes exactly and night is the original look", () => {
  const night = computeSky(TIME_PRESETS.night);
  assert.equal(night.brightness, 1);
  assert.deepEqual(night.sky0, [8, 12, 18]);
  assert.deepEqual(night.sky1, [3, 4, 8]);
  assert.deepEqual(night.glass, [10, 14, 22]);
  assert.equal(night.textures, "rain");
  const day = computeSky(0.5);
  assert.equal(day.brightness, SKY_KEYFRAMES[2].brightness);
  assert.equal(day.textures, "sun");
  const between = computeSky(0.375);
  assert.ok(between.brightness > computeSky(0.25).brightness && between.brightness < day.brightness);
  assert.deepEqual(computeSky(1), computeSky(0));
});

test("DayCycle ramps slowly toward a preset and writes CSS vars + u_brightness", () => {
  const root = fakeRoot();
  const bg = fakeLayer();
  const fg = fakeLayer();
  const cycle = new DayCycle({ mode: "night", root, persist: false });
  cycle.attachLayers(bg, fg);
  cycle.apply();
  assert.equal(root.props["--sky-0"], "rgb(8, 12, 18)");
  assert.equal(root.props["--glass-tint"], "10, 14, 22");
  assert.equal(bg.values.u_brightness, 1);

  cycle.setMode("day");
  cycle.update(1000);
  assert.ok(Math.abs(cycle.phase - 0.08) < 1e-9, "~0.08 phase per second, no snap");
  for (let i = 0; i < 400; i++) cycle.update(16);
  assert.equal(cycle.phase, 0.5);
  assert.equal(fg.values.u_brightness, computeSky(0.5).brightness);
  assert.equal(root.props["--day-phase"], "0.500");
});

test("DayCycle goes backwards across midnight when that is shorter", () => {
  const cycle = new DayCycle({ mode: "dawn", root: fakeRoot(), persist: false });
  cycle.setMode("dusk"); // 0.25 → 0.75 is exactly half: either way is fine
  cycle.setMode("night");
  cycle.update(500);
  assert.ok(cycle.phase < 0.25 && cycle.phase > 0.2);
});

test("clock mode follows the injected wall clock", () => {
  let now = new Date(2026, 5, 1, 6, 0, 0);
  const cycle = new DayCycle({ mode: "clock", root: fakeRoot(), now: () => now, persist: false });
  assert.equal(cycle.phase, 0.25, "starts on target, no sweep");
  now = new Date(2026, 5, 1, 7, 12, 0);
  for (let i = 0; i < 100; i++) cycle.update(16);
  assert.ok(Math.abs(cycle.phase - 0.3) < 1e-9);
});

test("texture sets swap only once their images are fully loaded", () => {
  const swaps = [];
  const sun = { bg: loading(), fg: loaded() };
  const cycle = new DayCycle({
    mode: "day",
    root: fakeRoot(),
    persist: false,
    textureSets: { rain: { bg: loaded(), fg: loaded() }, sun },
    onTextures: (_set, key) => swaps.push(key),
  });
  cycle.update(16);
  assert.deepEqual(swaps, [], "sun bg still loading → no hitchy swap");
  sun.bg = loaded();
  cycle.update(16);
  assert.deepEqual(swaps, ["sun"]);
  cycle.update(16);
  assert.deepEqual(swaps, ["sun"], "no re-swap every frame");
  cycle.setMode("night");
  for (let i = 0; i < 400; i++) cycle.update(16);
  assert.deepEqual(swaps, ["sun", "rain"]);
});

test("setMode notifies listeners only on change", () => {
  const cycle = new DayCycle({ mode: "night", root: fakeRoot(), persist: false });
  const seen = [];
  cycle.onModeChange((m) => seen.push(m));
  cycle.setMode("night");
  cycle.setMode("Dusk");
  assert.deepEqual(seen, ["dusk"]);
});
