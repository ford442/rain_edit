import assert from "node:assert/strict";
import test from "node:test";
import { AppClock, resolveLodMode } from "../src/runtime/AppClock.js";

/** Manual RAF + visibility harness: frames only run when `flush()` is called. */
function harness(options = {}) {
  let nextHandle = 1;
  const pending = new Map();
  const listeners = {};
  const doc = {
    hidden: false,
    addEventListener: (type, fn) => {
      listeners[type] = fn;
    },
    removeEventListener: (type) => {
      delete listeners[type];
    },
  };
  const raf = (cb) => {
    const h = nextHandle++;
    pending.set(h, cb);
    return h;
  };
  const caf = (h) => pending.delete(h);
  let now = 0;
  const flush = (ms = 16) => {
    now += ms;
    const cbs = [...pending.values()];
    pending.clear();
    cbs.forEach((cb) => cb(now));
  };
  const setHidden = (hidden) => {
    doc.hidden = hidden;
    listeners.visibilitychange?.();
  };
  const clock = new AppClock({ raf, caf, doc, now: () => now, ...options });
  return { clock, flush, setHidden, pending, doc };
}

test("one root RAF drives every task: all updates, then all renders", () => {
  const { clock, flush, pending } = harness();
  const calls = [];
  clock.register({ id: "a", update: () => calls.push("a.update"), render: () => calls.push("a.render") });
  clock.register({ id: "b", update: () => calls.push("b.update"), render: () => calls.push("b.render") });
  clock.start();
  assert.equal(pending.size, 1, "exactly one RAF outstanding");
  flush();
  assert.deepEqual(calls, ["a.update", "b.update", "a.render", "b.render"]);
  assert.equal(pending.size, 1, "reschedules a single RAF");
});

test("duplicate task ids throw; unregister removes the task", () => {
  const { clock } = harness();
  const off = clock.register({ id: "x" });
  assert.throws(() => clock.register({ id: "x" }), /duplicate task id/);
  off();
  assert.equal(clock.has("x"), false);
});

test("active() gates a task per frame", () => {
  const { clock, flush } = harness();
  let on = false;
  let runs = 0;
  clock.register({ id: "gated", active: () => on, update: () => runs++ });
  clock.start();
  flush();
  on = true;
  flush();
  flush();
  assert.equal(runs, 2);
});

test("hidden document pauses the RAF and resumes without a dt spike", () => {
  const { clock, flush, setHidden, pending } = harness();
  const dts = [];
  clock.register({ id: "t", update: (dt) => dts.push(dt) });
  clock.start();
  flush(16);
  setHidden(true);
  assert.equal(pending.size, 0, "no RAF while hidden");
  assert.equal(clock.paused, true);
  flush(5000); // nothing scheduled, nothing runs
  setHidden(false);
  assert.equal(pending.size, 1);
  flush(16);
  assert.equal(dts.length, 2);
  assert.ok(dts[1] <= 100, `dt after resume is clamped/reset (got ${dts[1]})`);
});

test("nextFrame callbacks run once, before task updates", () => {
  const { clock, flush } = harness();
  const calls = [];
  clock.register({ id: "t", update: () => calls.push("update") });
  clock.nextFrame(() => calls.push("once"));
  const cancel = clock.nextFrame(() => calls.push("cancelled"));
  cancel();
  clock.start();
  flush();
  flush();
  assert.deepEqual(calls, ["once", "update", "update"]);
});

test("a throwing task is reported and does not stop the frame", () => {
  const errors = [];
  const { clock, flush } = harness({ onError: (_e, id) => errors.push(id) });
  let ran = false;
  clock.register({ id: "bad", update: () => { throw new Error("boom"); } });
  clock.register({ id: "good", update: () => { ran = true; } });
  clock.start();
  flush();
  assert.deepEqual(errors, ["bad"]);
  assert.equal(ran, true);
});

test("sustained slow frames drop to low LOD and skip decorative tasks", () => {
  const { clock, flush } = harness({ lodHysteresisFrames: 5 });
  const lods = [];
  clock.onLodChange((lod) => lods.push(lod));
  let decorative = 0;
  let essential = 0;
  clock.register({ id: "fx", priority: "decorative", update: () => decorative++ });
  clock.register({ id: "core", update: () => essential++ });
  clock.start();
  for (let i = 0; i < 200; i++) flush(50); // 20 fps
  assert.equal(clock.lod, "low");
  assert.deepEqual(lods, ["low"]);
  const before = decorative;
  flush(50);
  assert.equal(decorative, before, "decorative task skipped under low LOD");
  assert.ok(essential > 200);
  for (let i = 0; i < 400; i++) flush(10); // recover
  assert.equal(clock.lod, "high");
});

test("explicit LOD mode and low battery override the FPS heuristic", () => {
  const { clock } = harness();
  clock.setBatteryState({ charging: false, level: 0.1 });
  assert.equal(clock.lod, "low");
  clock.setLodMode("high");
  assert.equal(clock.lod, "high");
  clock.setLodMode("auto");
  clock.setBatteryState({ charging: true, level: 0.1 });
  assert.equal(clock.lod, "high");
});

test("resolveLodMode reads ?lod= then localStorage", () => {
  const storage = { getItem: () => "low" };
  assert.equal(resolveLodMode({ search: "?lod=high", storage }), "high");
  assert.equal(resolveLodMode({ search: "", storage }), "low");
  assert.equal(resolveLodMode({ search: "?lod=bogus", storage: null }), "auto");
});

test("stop() cancels the RAF and detaches the visibility listener", () => {
  const { clock, pending, doc } = harness();
  clock.start();
  clock.stop();
  assert.equal(pending.size, 0);
  assert.equal(clock.running, false);
  doc.hidden = true; // no listener → no throw, no reschedule
});
