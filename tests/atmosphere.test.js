import assert from "node:assert/strict";
import test from "node:test";
import { Atmosphere } from "../src/rain/Atmosphere.js";
import { WeatherSystem } from "../src/rain/WeatherSystem.js";

function fakeEl() {
  const classes = new Set();
  return {
    style: {
      opacity: "0",
      props: {},
      setProperty(k, v) {
        this.props[k] = v;
      },
    },
    classList: {
      toggle(c, on) {
        if (on ?? !classes.has(c)) classes.add(c);
        else classes.delete(c);
      },
      contains: (c) => classes.has(c),
    },
  };
}

function fakeClock() {
  const tasks = new Map();
  return {
    tasks,
    has: (id) => tasks.has(id),
    register: (task) => tasks.set(task.id, task),
    unregister: (id) => tasks.delete(id),
    /** Advance `ms` in 16ms frames. */
    run(ms, t0 = 0) {
      let t = t0;
      for (let left = ms; left > 0; left -= 16) {
        t += 16;
        for (const task of tasks.values()) task.update?.(16, t);
      }
    },
  };
}

function makeAtmosphere({ mode = "steady", reduced = false, random = () => 0.5 } = {}) {
  const weatherSystem = new WeatherSystem({ mode });
  const typed = [];
  const origTyping = weatherSystem.registerTyping.bind(weatherSystem);
  weatherSystem.registerTyping = (n) => {
    typed.push(n);
    origTyping(n);
  };
  const lightningLayer = fakeEl();
  const doc = { documentElement: fakeEl(), body: fakeEl() };
  const win = {
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
  };
  const atmosphere = new Atmosphere({
    editor: /** @type {any} */ ({}),
    monaco: /** @type {any} */ ({}),
    weatherSystem,
    lightningLayer: /** @type {any} */ (lightningLayer),
    ctx: {},
    doc: /** @type {any} */ (doc),
    win: /** @type {any} */ (win),
    random,
  });
  return { atmosphere, weatherSystem, lightningLayer, doc, typed };
}

test("registerTyping feeds both the storm charge and WeatherSystem", () => {
  const { atmosphere, typed } = makeAtmosphere();
  atmosphere.registerTyping(5);
  atmosphere.registerTyping(0); // deletion still counts as activity
  assert.equal(atmosphere.stormCharCount, 5);
  assert.deepEqual(typed, [5, 1]);
});

test("ambient lightning is spaced by the mode's profile on the clock, and thunder listeners fire", () => {
  const { atmosphere, lightningLayer } = makeAtmosphere({ mode: "steady" });
  const clock = fakeClock();
  atmosphere.start(clock);
  const strikes = [];
  atmosphere.onStrike((s) => strikes.push(s));

  // random() = 0.5 → gap = 10s + 0.5 * 20s = 20s.
  clock.run(16 * 1240); // 19.84s
  assert.equal(strikes.length, 0);
  clock.run(16 * 20);
  assert.equal(strikes.length, 1);
  assert.equal(strikes[0].cause, "ambient");
  assert.ok(Math.abs(strikes[0].distance - 0.6) < 1e-9);

  atmosphere.strike("surge");
  assert.ok(Number(lightningLayer.style.opacity) > 0, "flash is lit");
  clock.run(16 * 8); // flash lasts 50 + 0.5 * 100 = 100ms
  assert.equal(lightningLayer.style.opacity, "0", "flash decays on the clock, not a timer");
});

test("drizzle has no ambient lightning; switching mode reschedules", () => {
  const { atmosphere, weatherSystem } = makeAtmosphere({ mode: "drizzle" });
  const clock = fakeClock();
  atmosphere.start(clock);
  clock.run(60_000);
  assert.equal(atmosphere.strikes, 0);
  weatherSystem.setMode("storm", { persist: false });
  clock.run(10_100); // storm gap with random 0.5 = 5s + 5s
  assert.equal(atmosphere.strikes, 1);
});

test("mute world stops strikes and flashes; stopping the clock task stops lightning", () => {
  const { atmosphere, lightningLayer } = makeAtmosphere({ mode: "storm" });
  const clock = fakeClock();
  atmosphere.start(clock);
  atmosphere.setMuted(true);
  assert.ok(lightningLayer.classList.contains("lightning-muted"));
  assert.equal(atmosphere.strike(), null);
  clock.run(60_000);
  assert.equal(atmosphere.strikes, 0);

  atmosphere.setMuted(false);
  atmosphere.stop(clock);
  assert.equal(clock.has("atmosphere"), false);
  clock.run(60_000);
  assert.equal(atmosphere.strikes, 0);
});

test("prefers-reduced-motion keeps strikes (thunder) but never flashes", () => {
  const { atmosphere, lightningLayer } = makeAtmosphere({ reduced: true });
  const heard = [];
  atmosphere.onStrike((s) => heard.push(s));
  atmosphere.strike("surge");
  assert.equal(heard.length, 1);
  assert.equal(lightningLayer.style.opacity, "0");
});

test("the 1 Hz mood step writes --dynamic-hue from clock time", () => {
  const { atmosphere, doc } = makeAtmosphere();
  const clock = fakeClock();
  atmosphere.start(clock);
  clock.run(990);
  assert.equal(doc.documentElement.style.props["--dynamic-hue"], undefined);
  clock.run(20);
  assert.equal(typeof doc.documentElement.style.props["--dynamic-hue"], "string");
});
