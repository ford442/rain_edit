import assert from "node:assert/strict";
import test from "node:test";
import {
  WEATHER_MODES,
  DEFAULT_WEATHER_MODE,
  computeWeatherTargets,
  computeWind,
  normalizeWeatherMode,
  persistWeatherMode,
  readWeatherModeOverride,
} from "../src/rain/weatherModes.js";
import { WeatherSystem, sampleShieldClear, shieldCircle } from "../src/rain/WeatherSystem.js";

test("normalizeWeatherMode accepts known modes and falls back to default", () => {
  assert.equal(normalizeWeatherMode("STORM"), "storm");
  assert.equal(normalizeWeatherMode("drizzle"), "drizzle");
  assert.equal(normalizeWeatherMode("clearing"), "clearing");
  assert.equal(normalizeWeatherMode("nonsense"), DEFAULT_WEATHER_MODE);
  assert.equal(normalizeWeatherMode(undefined), DEFAULT_WEATHER_MODE);
});

test("readWeatherModeOverride prefers URL over storage, then falls back", () => {
  const storage = { getItem: () => "storm" };
  assert.equal(readWeatherModeOverride("?weather=drizzle", storage), "drizzle");
  assert.equal(readWeatherModeOverride("", storage), "storm");
  assert.equal(readWeatherModeOverride("", { getItem: () => null }), DEFAULT_WEATHER_MODE);
});

test("persistWeatherMode normalizes and writes through", () => {
  const store = new Map();
  const storage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
  };
  assert.equal(persistWeatherMode("STORM", storage), "storm");
  assert.equal(store.get("rain-edit:weatherMode"), "storm");
});

test("computeWeatherTargets lerps between a mode's calm and active sets", () => {
  const calmTargets = computeWeatherTargets("storm", 0);
  const activeTargets = computeWeatherTargets("storm", 1);
  const midTargets = computeWeatherTargets("storm", 0.5);

  assert.equal(calmTargets.rainChance, WEATHER_MODES.storm.calm.rainChance);
  assert.equal(activeTargets.rainChance, WEATHER_MODES.storm.active.rainChance);
  assert.ok(midTargets.rainChance > calmTargets.rainChance);
  assert.ok(midTargets.rainChance < activeTargets.rainChance);
});

test("computeWeatherTargets clamps activity to 0..1", () => {
  const over = computeWeatherTargets("steady", 5);
  const under = computeWeatherTargets("steady", -5);
  assert.equal(over.rainChance, WEATHER_MODES.steady.active.rainChance);
  assert.equal(under.rainChance, WEATHER_MODES.steady.calm.rainChance);
});

function fakeLayer() {
  return {
    values: {},
    setUniform(name, value) {
      this.values[name] = value;
    },
  };
}

test("WeatherSystem starts at the steady mode's calm values", () => {
  const ws = new WeatherSystem();
  assert.equal(ws.getMode(), "steady");
  assert.equal(ws.getActivity(), 0);
  const diag = ws.getDiagnostics();
  assert.equal(diag.current.rainChance, WEATHER_MODES.steady.calm.rainChance);
});

test("WeatherSystem.setMode switches mode, persists, and notifies listeners", () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
  };
  try {
    const ws = new WeatherSystem();
    let notified = null;
    ws.onModeChange((mode) => {
      notified = mode;
    });
    ws.setMode("storm");
    assert.equal(ws.getMode(), "storm");
    assert.equal(notified, "storm");
    assert.equal(store.get("rain-edit:weatherMode"), "storm");

    // No-op when already in that mode: listener must not fire again.
    notified = null;
    ws.setMode("storm");
    assert.equal(notified, null);
  } finally {
    delete globalThis.localStorage;
  }
});

test("WeatherSystem.update writes damped values into raindrops.options and layer uniforms", () => {
  const ws = new WeatherSystem({ mode: "steady" });
  const raindrops = { options: { rainChance: 0, dropletsRate: 0 } };
  const bgLayer = fakeLayer();
  const fgLayer = fakeLayer();
  ws.attach({ raindrops, bgLayer, fgLayer });

  ws.update();
  assert.ok(raindrops.options.rainChance > 0);
  assert.ok(raindrops.options.rainChance <= WEATHER_MODES.steady.calm.rainChance);
  assert.ok(typeof bgLayer.values.u_alphaMultiply === "number");
  assert.ok(typeof fgLayer.values.u_refractionDelta === "number");
});

test("WeatherSystem activity rises when typing is registered and modulates rainChance upward", () => {
  const ws = new WeatherSystem({ mode: "steady" });
  const raindrops = { options: {} };
  ws.attach({ raindrops });

  // Settle to calm baseline first.
  for (let i = 0; i < 30; i++) ws.update(16);
  const calmRainChance = raindrops.options.rainChance;
  assert.ok(ws.getActivity() < 0.05);

  ws.registerTyping(10);
  for (let i = 0; i < 30; i++) ws.update(16);

  assert.ok(ws.getActivity() > 0.3, `expected activity to rise, got ${ws.getActivity()}`);
  assert.ok(
    raindrops.options.rainChance > calmRainChance,
    "typing should push rainChance above the calm baseline",
  );
});

test("WeatherSystem.setManualIntensity scales rainChance/dropletsRate, default slider value is a no-op", () => {
  const ws = new WeatherSystem({ mode: "steady" });
  const raindrops = { options: {} };
  ws.attach({ raindrops });

  ws.setManualIntensity(30); // matches the dock slider's default value
  for (let i = 0; i < 30; i++) ws.update(16);
  const baseline = raindrops.options.rainChance;
  assert.ok(Math.abs(baseline - WEATHER_MODES.steady.calm.rainChance) < 0.01);

  ws.setManualIntensity(60); // 2x
  for (let i = 0; i < 30; i++) ws.update(16);
  assert.ok(raindrops.options.rainChance > baseline * 1.5);
});

test("WeatherSystem.setSceneMultiplier only scales rainChance", () => {
  const ws = new WeatherSystem({ mode: "steady" });
  const raindrops = { options: {} };
  ws.attach({ raindrops });
  for (let i = 0; i < 30; i++) ws.update(16);
  const baselineRainChance = raindrops.options.rainChance;
  const baselineDropletsRate = raindrops.options.dropletsRate;

  ws.setSceneMultiplier(0.4);
  for (let i = 0; i < 30; i++) ws.update(16);

  assert.ok(raindrops.options.rainChance < baselineRainChance);
  assert.ok(Math.abs(raindrops.options.dropletsRate - baselineDropletsRate) < 1);
});

test("WeatherSystem.attach pushes the current mode's audio profile", () => {
  const ws = new WeatherSystem({ mode: "storm" });
  const calls = [];
  const audio = {
    setMode(mode, profile) {
      calls.push([mode, profile]);
    },
  };
  ws.attach({ audio });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "storm");
  assert.equal(calls[0][1], WEATHER_MODES.storm);
});


function shieldSim() {
  return {
    options: {},
    clears: [],
    shields: [],
    winds: [],
    clearDroplets(x, y, r) {
      this.clears.push({ x, y, r });
    },
    setShield(x, y, r) {
      this.shields.push({ x, y, r });
    },
    setWind(vx, vy) {
      this.winds.push([vx, vy]);
    },
  };
}

const EDITOR = { left: 100, top: 50, width: 800, height: 400 };

test("sampleShieldClear stays inside the editor rect, biased to the centre", () => {
  let seed = 1;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 200; i++) {
    const c = sampleShieldClear(EDITOR, random);
    assert.ok(c.x >= EDITOR.left + EDITOR.width * 0.08 && c.x <= EDITOR.left + EDITOR.width * 0.92);
    assert.ok(c.y >= EDITOR.top + EDITOR.height * 0.08 && c.y <= EDITOR.top + EDITOR.height * 0.92);
    assert.ok(c.r >= 14 && c.r <= 26);
  }
  assert.deepEqual(sampleShieldClear(EDITOR, () => 0.5), { x: 500, y: 250, r: 20 });
});

test("shieldCircle is centred on the rect and scales with strength", () => {
  assert.deepEqual(shieldCircle(EDITOR, 1), { x: 500, y: 250, r: 200 });
  assert.equal(shieldCircle(EDITOR, 0.5).r, 100);
  assert.equal(shieldCircle(EDITOR, 4).r, 200);
});

test("editor shield ramps up while focused, posts ~30 clears/s, and drops on blur", () => {
  const ws = new WeatherSystem({ mode: "steady", random: () => 0.5 });
  const sim = shieldSim();
  ws.attach({ raindrops: sim });
  ws.setShieldSource(() => EDITOR);

  for (let i = 0; i < 125; i++) ws.update(16); // 2s
  assert.ok(ws.getShieldStrength() > 0.95, `strength ${ws.getShieldStrength()}`);
  const before = sim.clears.length;
  for (let i = 0; i < 125; i++) ws.update(16); // 2s at full strength
  const perSec = (sim.clears.length - before) / 2;
  assert.ok(perSec > 27 && perSec < 32, `clears/s ${perSec}`);
  assert.ok(sim.clears.every((c) => c.x === 500 && c.y === 250));
  const last = sim.shields.at(-1);
  assert.ok(last.r > 190 && last.x === 500, "deflection circle follows the editor");

  ws.registerFocus(false);
  for (let i = 0; i < 125; i++) ws.update(16);
  assert.equal(ws.getShieldStrength(), 0);
  assert.deepEqual(sim.shields.at(-1), { x: 0, y: 0, r: 0 }, "shield removed on blur");
  const afterBlur = sim.clears.length;
  ws.update(16);
  assert.equal(sim.clears.length, afterBlur);
});

test("editor shield ignores an empty rect and works on sims without setShield", () => {
  const ws = new WeatherSystem({ mode: "steady" });
  const clears = [];
  ws.attach({ raindrops: { options: {}, clearDroplets: (x, y, r) => clears.push(r) } });
  ws.setShieldSource(() => ({ left: 0, top: 0, width: 0, height: 0 }));
  for (let i = 0; i < 60; i++) ws.update(16);
  assert.equal(clears.length, 0);
  assert.equal(ws.getShieldStrength(), 0);
});

test("wind follows the mode and activity and is only posted when it changes", () => {
  assert.equal(computeWind("drizzle", 0), 0);
  assert.ok(computeWind("storm", 1) > computeWind("storm", 0));
  assert.ok(computeWind("storm", 0) > computeWind("steady", 0));

  const ws = new WeatherSystem({ mode: "storm" });
  const sim = shieldSim();
  ws.attach({ raindrops: sim });
  for (let i = 0; i < 60; i++) ws.update(16);
  const [vx, vy] = sim.winds.at(-1);
  assert.ok(Math.abs(vx - WEATHER_MODES.storm.wind.calm) < 0.02);
  assert.equal(vy, 0);
  const posted = sim.winds.length;
  for (let i = 0; i < 30; i++) ws.update(16);
  assert.equal(sim.winds.length, posted, "steady wind is not re-posted every frame");
});

test("WeatherSystem.update drives audio.update(dt, activity) when available", () => {
  const ws = new WeatherSystem({ mode: "steady" });
  const calls = [];
  ws.attach({ audio: { setMode() {}, update: (dt, a) => calls.push([dt, a]) } });
  ws.update(20);
  assert.deepEqual(calls, [[20, 0]]);
});

test("every weather mode defines wind and a lightning profile (or null)", () => {
  for (const [name, profile] of Object.entries(WEATHER_MODES)) {
    assert.equal(typeof profile.wind.calm, "number", name);
    assert.ok(profile.lightning === null || profile.lightning.minGapMs < profile.lightning.maxGapMs, name);
  }
});
