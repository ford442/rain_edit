import assert from "node:assert/strict";
import test from "node:test";
import {
  WEATHER_MODES,
  DEFAULT_WEATHER_MODE,
  computeWeatherTargets,
  normalizeWeatherMode,
  persistWeatherMode,
  readWeatherModeOverride,
} from "../src/rain/weatherModes.js";
import { WeatherSystem } from "../src/rain/WeatherSystem.js";

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
