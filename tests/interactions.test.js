import assert from "node:assert/strict";
import test from "node:test";

import { MagneticRepulsion } from "../src/interactions/MagneticRepulsion.js";
import { MagnifierLens } from "../src/interactions/MagnifierLens.js";


class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.forEach((name) => this.values.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }

  contains(name) {
    return this.values.has(name);
  }
}


class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type, event) {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}


function createHarness() {
  const styles = new Map();
  return {
    eventTarget: new FakeEventTarget(),
    body: {
      classList: new FakeClassList(),
      style: {
        setProperty(name, value) {
          styles.set(name, value);
        },
      },
    },
    styles,
  };
}


function shortcut({ shiftKey = false } = {}) {
  return {
    altKey: true,
    shiftKey,
    ctrlKey: false,
    metaKey: false,
    code: "KeyM",
    key: "m",
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
}


test("Alt+M activates and releases the obscured magnifier", () => {
  const harness = createHarness();
  const magnifier = new MagnifierLens(harness).init();
  const event = shortcut();

  harness.eventTarget.dispatch("keydown", event);
  assert.deepEqual(magnifier.getState(), { active: true, obscured: true });
  assert.equal(event.defaultPrevented, true);

  harness.eventTarget.dispatch("mousemove", { clientX: 120, clientY: 80 });
  assert.equal(harness.styles.get("--lens-x"), "120px");
  assert.equal(harness.styles.get("--lens-y"), "80px");

  harness.eventTarget.dispatch("keyup", { key: "m" });
  assert.deepEqual(magnifier.getState(), { active: false, obscured: false });

  magnifier.destroy();
  assert.equal(harness.eventTarget.listeners.get("keydown").size, 0);
});


test("Alt+Shift+M activates magnetic repulsion without obscured mode", () => {
  const harness = createHarness();
  const magnifier = new MagnifierLens(harness).init();
  const repulsion = new MagneticRepulsion(harness).init();
  const event = shortcut({ shiftKey: true });

  harness.eventTarget.dispatch("keydown", event);
  assert.deepEqual(magnifier.getState(), { active: true, obscured: false });
  assert.deepEqual(repulsion.getState(), { active: true });
  assert.equal(event.defaultPrevented, true);

  harness.eventTarget.dispatch("mousemove", { clientX: 44, clientY: 55 });
  assert.equal(harness.styles.get("--mouse-x"), "44px");
  assert.equal(harness.styles.get("--mouse-y"), "55px");

  harness.eventTarget.dispatch("keyup", { key: "m" });
  assert.deepEqual(magnifier.getState(), { active: false, obscured: false });
  assert.deepEqual(repulsion.getState(), { active: false });

  magnifier.destroy();
  repulsion.destroy();
});
