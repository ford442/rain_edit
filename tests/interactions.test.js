import assert from "node:assert/strict";
import test from "node:test";

import { InputManager, isTypingTarget } from "../src/interactions/InputManager.js";
import { registerLensBindings } from "../src/interactions/lensBindings.js";


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


function harness() {
  const styles = new Map();
  const body = {
    classList: new FakeClassList(),
    style: {
      setProperty: (name, value) => styles.set(name, value),
    },
  };
  const doc = new FakeEventTarget();
  const manager = new InputManager({
    eventTarget: doc,
    body,
    storage: null,
    win: { editorEl: undefined, echoLayerEl: undefined },
  }).start();
  return { doc, body, styles, manager };
}


function key(overrides = {}) {
  return {
    altKey: false,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    code: "",
    key: "",
    target: null,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...overrides,
  };
}


test("Alt+M activates and releases the obscured magnifier", () => {
  const h = harness();
  registerLensBindings(h.manager, { doc: { body: h.body, addEventListener() {} } });

  const down = key({ altKey: true, code: "KeyM", key: "m" });
  h.doc.dispatch("keydown", down);
  assert.equal(h.body.classList.contains("magnifier-active"), true);
  assert.equal(h.body.classList.contains("obscured-magnifier-active"), true);
  assert.equal(down.defaultPrevented, true);

  h.doc.dispatch("keyup", key({ key: "m" }));
  assert.equal(h.body.classList.contains("magnifier-active"), false);
  assert.equal(h.body.classList.contains("obscured-magnifier-active"), false);
});


test("lens group is mutually exclusive", () => {
  const h = harness();
  registerLensBindings(h.manager, { doc: { body: h.body, addEventListener() {} } });

  // Activate magnifier, then magnetic separation (same "lens" group).
  h.doc.dispatch("keydown", key({ altKey: true, code: "KeyM", key: "m" }));
  h.doc.dispatch("keydown", key({ altKey: true, shiftKey: true, code: "KeyM", key: "m" }));

  assert.equal(h.body.classList.contains("obscured-magnifier-active"), false, "magnifier released");
  assert.equal(h.body.classList.contains("magnetic-sep-active"), true, "separation active");
});


test("scoped release: releasing Alt does not tear down an unrelated combo", () => {
  const h = harness();
  h.manager.register({
    id: "beam",
    combo: { key: "b" },
    type: "hold",
    onDown: () => h.body.classList.add("beam"),
    onUp: () => h.body.classList.remove("beam"),
  });
  h.manager.register({
    id: "alt-hold",
    combo: { alt: true, code: "KeyF" },
    type: "hold",
    onDown: () => h.body.classList.add("altmode"),
    onUp: () => h.body.classList.remove("altmode"),
  });

  h.doc.dispatch("keydown", key({ key: "b" }));
  h.doc.dispatch("keydown", key({ altKey: true, code: "KeyF", key: "f" }));
  assert.equal(h.body.classList.contains("beam"), true);
  assert.equal(h.body.classList.contains("altmode"), true);

  // Releasing Alt must only release the Alt-triggered mode, not the "b" hold.
  h.doc.dispatch("keyup", key({ key: "Alt" }));
  assert.equal(h.body.classList.contains("altmode"), false, "alt mode released");
  assert.equal(h.body.classList.contains("beam"), true, "unrelated beam still held");
});


test("typing in Monaco never triggers a world interaction", () => {
  const h = harness();
  h.manager.register({
    id: "isolate",
    combo: { key: "i" },
    type: "hold",
    onDown: () => h.body.classList.add("isolate"),
    onUp: () => h.body.classList.remove("isolate"),
  });

  const monacoTarget = { closest: (sel) => (sel === ".monaco-editor" ? {} : null) };
  h.doc.dispatch("keydown", key({ key: "i", target: monacoTarget }));
  assert.equal(h.body.classList.contains("isolate"), false);

  // Same key outside the editor does trigger it.
  h.doc.dispatch("keydown", key({ key: "i", target: { tagName: "BODY" } }));
  assert.equal(h.body.classList.contains("isolate"), true);
});


test("no two bindings share the same combo", () => {
  const h = harness();
  registerLensBindings(h.manager, { doc: { body: h.body, addEventListener() {} } });
  h.manager.register({ id: "a", combo: { alt: true, code: "KeyD" }, type: "hold" });
  h.manager.register({ id: "b", combo: { alt: true, shift: true, code: "KeyD" }, type: "hold" });

  const seen = new Set();
  for (const binding of h.manager.bindings.values()) {
    const sig = h.manager.formatCombo(binding.combo);
    assert.equal(seen.has(sig), false, `duplicate combo: ${sig}`);
    seen.add(sig);
  }
});


test("isTypingTarget recognizes editor-family targets", () => {
  assert.equal(isTypingTarget({ tagName: "INPUT" }), true);
  assert.equal(isTypingTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isTypingTarget({ isContentEditable: true }), true);
  assert.equal(isTypingTarget({ tagName: "DIV", closest: () => ({}) }), true);
  assert.equal(isTypingTarget({ tagName: "DIV", closest: () => null }), false);
});
