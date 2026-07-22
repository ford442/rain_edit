import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_RAIN_OPTIONS,
  packOptionsForWasm,
} from "../src/rain/optionsCodec.js";
import {
  normalizeBackend,
  persistRainSimBackend,
  readRainSimOverride,
  resolveRainSimBackend,
  workerSimSupported,
} from "../src/rain/resolveBackend.js";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("normalizeBackend accepts known rain sim ids", () => {
  assert.equal(normalizeBackend("WASM"), "wasm");
  assert.equal(normalizeBackend("JS"), "js");
  assert.equal(normalizeBackend("main"), "main");
  assert.equal(normalizeBackend("auto"), "auto");
  assert.equal(normalizeBackend("nope"), "auto");
});

test("readRainSimOverride prefers URL over storage", () => {
  const storage = {
    getItem() {
      return "js";
    },
  };
  assert.equal(readRainSimOverride("?rainSim=wasm", storage), "wasm");
  assert.equal(readRainSimOverride("", storage), "js");
  assert.equal(readRainSimOverride("", { getItem: () => null }), "auto");
});

test("persistRainSimBackend writes normalized value", () => {
  const store = new Map();
  const storage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
  };
  assert.equal(persistRainSimBackend("WASM", storage), "wasm");
  assert.equal(store.get("rain-edit:rainSimBackend"), "wasm");
});

test("resolveRainSimBackend falls back to main when workers missing", () => {
  // In Node, Worker/OffscreenCanvas are typically absent → main.
  if (!workerSimSupported()) {
    assert.equal(resolveRainSimBackend("wasm"), "main");
    assert.equal(resolveRainSimBackend("js"), "main");
    assert.equal(resolveRainSimBackend("auto"), "main");
    assert.equal(resolveRainSimBackend("main"), "main");
  } else {
    assert.equal(resolveRainSimBackend("main"), "main");
  }
});

test("packOptionsForWasm emits 22 f32s in crate order", () => {
  const packed = packOptionsForWasm({
    ...DEFAULT_RAIN_OPTIONS,
    rainChance: 0.5,
    raining: false,
  });
  assert.equal(packed.length, 22);
  assert.equal(packed[3], 0.5);
  assert.equal(packed[9], 0);
  assert.equal(packed[0], DEFAULT_RAIN_OPTIONS.minR);
});

test("checked-in rain_sim.wasm artifact exists for Vite ?url imports", () => {
  const wasmPath = join(root, "src/rain/wasm/rain_sim.wasm");
  assert.equal(existsSync(wasmPath), true);
  assert.ok(statSync(wasmPath).size > 1000);
});
