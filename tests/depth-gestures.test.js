import assert from "node:assert/strict";
import test from "node:test";

import { InputManager } from "../src/interactions/InputManager.js";
import { WormholeGesture } from "../src/interactions/WormholeGesture.js";
import { XRayHoldGestures } from "../src/interactions/XRayHoldGestures.js";
import { ShiftLensGesture } from "../src/interactions/ShiftLensGesture.js";

class FakeClassList {
  constructor() {
    this.values = new Set();
  }
  add(...names) {
    names.forEach((n) => this.values.add(n));
  }
  remove(...names) {
    names.forEach((n) => this.values.delete(n));
  }
  contains(name) {
    return this.values.has(name);
  }
}

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
    this.activeElement = null;
  }
  addEventListener(type, listener) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }
  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }
  dispatch(type, event) {
    this.listeners.get(type)?.forEach((l) => l(event));
  }
}

function fakeEcho(rect) {
  const vars = new Map();
  return {
    dataset: {},
    _classes: new FakeClassList(),
    get classList() {
      return this._classes;
    },
    getBoundingClientRect: () => rect,
    style: {
      setProperty: (name, value) => vars.set(name, value),
      removeProperty: (name) => vars.delete(name),
      getPropertyValue: (name) => (vars.has(name) ? vars.get(name) : ""),
    },
  };
}

function harness() {
  const body = { classList: new FakeClassList(), style: { setProperty() {}, removeProperty() {} } };
  const doc = new FakeEventTarget();
  doc.body = body;
  const echoLayerEl = { querySelectorAll: () => [] };
  const win = { echoLayerEl, editorEl: null };
  const inputManager = new InputManager({ eventTarget: doc, body, storage: null, win }).start();
  return { doc, body, win, inputManager };
}

test("WormholeGesture registers a Ctrl+Alt hold and pulls/clears echoes on down/up", () => {
  const { doc, win, inputManager } = harness();
  const echo = fakeEcho({ left: 0, top: 0, width: 100, height: 100 }); // center (50,50)
  win.echoLayerEl.querySelectorAll = () => [echo];

  const gesture = new WormholeGesture({ inputManager, doc, win }).init();
  const binding = inputManager.bindings.get("wormhole");
  assert.equal(binding.combo.ctrl, true);
  assert.equal(binding.combo.alt, true);

  doc.dispatch("keydown", { altKey: true, ctrlKey: true, shiftKey: false, metaKey: false, code: "", key: "", preventDefault() {} });
  doc.dispatch("mousemove", { clientX: 60, clientY: 60 });
  assert.notEqual(echo.style.getPropertyValue("--wormhole-tz"), "");

  doc.dispatch("keyup", { key: "Control" });
  assert.equal(echo.style.getPropertyValue("--wormhole-tz"), "");
  gesture.destroy();
});

test("XRayHoldGestures registers both the plain and semantic x-ray holds", () => {
  const { doc, win, inputManager } = harness();
  new XRayHoldGestures({ inputManager, doc, win }).init();

  const xray = inputManager.bindings.get("x-ray");
  assert.equal(xray.combo.ctrlOrMeta, true);
  const semantic = inputManager.bindings.get("semantic-xray");
  assert.equal(semantic.combo.alt, true);
  assert.equal(semantic.combo.shift, true);
  assert.equal(semantic.combo.code, "KeyX");

  doc.dispatch("keydown", { ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, code: "", key: "", preventDefault() {} });
  assert.equal(doc.body.classList.contains("x-ray-active"), true);
  doc.dispatch("keyup", { key: "Control" });
  assert.equal(doc.body.classList.contains("x-ray-active"), false);
});

test("ShiftLensGesture sets __lensActive while Shift is held and clears it on the next move after release", () => {
  const { doc, win } = harness();
  const echo = fakeEcho({ left: 0, top: 0, width: 100, height: 100 });
  win.echoLayerEl.querySelectorAll = () => [echo];
  win.tabManager = { files: [{}] };

  new ShiftLensGesture({ doc, win }).init();

  doc.dispatch("mousemove", { shiftKey: true, clientX: 50, clientY: 50 });
  assert.equal(win.__lensActive, true);
  assert.equal(echo.classList.contains("shift-lens-hit"), true);

  doc.dispatch("mousemove", { shiftKey: false, clientX: 50, clientY: 50 });
  assert.equal(win.__lensActive, false);
  assert.equal(echo.classList.contains("shift-lens-hit"), false);
});
