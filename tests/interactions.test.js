import assert from "node:assert/strict";
import test from "node:test";

import { InputManager, isTypingTarget } from "../src/interactions/InputManager.js";
import { registerLensBindings } from "../src/interactions/lensBindings.js";
import { LENSES } from "../src/interactions/lenses/catalog.js";
import { audit, MAX_LENSES } from "../scripts/audit-lenses.mjs";


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
    dataset: {},
    style: {
      setProperty: (name, value) => styles.set(name, value),
      removeProperty: (name) => styles.delete(name),
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
  assert.equal(h.body.classList.contains("loupe-active"), true);

  assert.equal(down.defaultPrevented, true);

  h.doc.dispatch("keyup", key({ key: "m" }));
  assert.equal(h.body.classList.contains("loupe-active"), false);

});


test("lens group is mutually exclusive", () => {
  const h = harness();
  registerLensBindings(h.manager, { doc: { body: h.body, addEventListener() {} } });

  h.doc.dispatch("keydown", key({ altKey: true, code: "KeyM", key: "m" })); // magnifier
  assert.equal(h.body.dataset.lens, "magnifier");
  assert.equal(h.body.dataset.lensKind, "loupe");
  assert.equal(h.styles.get("--lens-radius"), "140px");

  h.doc.dispatch("keydown", key({ altKey: true, shiftKey: true, code: "KeyM", key: "M" })); // magnetic separation
  assert.equal(h.body.dataset.lens, "magnetic-separation");
  assert.equal(h.body.dataset.lensKind, "separate");
  assert.equal(h.styles.has("--lens-radius"), false, "previous lens vars cleared");
  assert.equal(h.styles.get("--lens-amount"), "0.6");
});


test("lens catalog stays small, unique, and collision-free", async () => {
  assert.ok(LENSES.length <= MAX_LENSES, `catalog has ${LENSES.length} lenses`);
  const { errors } = await audit();
  assert.deepEqual(errors, []);
});


test("InputManager rejects duplicate combos unless both opt into sharing", () => {
  const h = harness();
  h.manager.register({ id: "a", combo: { alt: true, code: "KeyQ" } });
  assert.throws(
    () => h.manager.register({ id: "b", combo: { alt: true, code: "KeyQ" } }),
    /combo alt\+code:KeyQ for "b" already bound to "a"/,
  );
  // Single-char keys compare case-insensitively.
  h.manager.register({ id: "c", combo: { key: "v" } });
  assert.throws(() => h.manager.register({ id: "d", combo: { key: "V" } }), /already bound/);
  // Explicit opt-in on both sides allows a shared modifier hold.
  h.manager.register({ id: "e", combo: { key: "Alt" }, sharedCombo: true });
  h.manager.register({ id: "f", combo: { key: "Alt" }, sharedCombo: true });
  assert.throws(() => h.manager.register({ id: "g", combo: { key: "Alt" } }), /already bound/);
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


test("isTypingTarget recognizes editor-family targets", () => {
  assert.equal(isTypingTarget({ tagName: "INPUT" }), true);
  assert.equal(isTypingTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isTypingTarget({ isContentEditable: true }), true);
  assert.equal(isTypingTarget({ tagName: "DIV", closest: () => ({}) }), true);
  assert.equal(isTypingTarget({ tagName: "DIV", closest: () => null }), false);
});

test("focus mode (focus-readable) applies dimming to rain layers", async () => {
  const classList = new FakeClassList();
  classList.add("focus-readable");
  assert.equal(classList.contains("focus-readable"), true);

  // Actually verify CSS dimming
  const fs = await import("fs");
  const path = await import("path");
  const cssPath = path.resolve("./src/styles_base/shell-and-editor.css");
  const cssContent = fs.readFileSync(cssPath, "utf8");

  // Verify rain and vignette are dimmed to 0.2
  assert.match(cssContent, /body\.focus-readable #rain-front,\nbody\.focus-readable #rain-back,\nbody\.focus-readable #vignette-layer \{\n\s*opacity: 0.2 !important;/);

  // Verify .echo-document layers are partly visible
  assert.match(cssContent, /body\.focus-readable \.echo-document \{\n\s*opacity: 0.5 !important;/);

  // Verify container glow is transparent
  assert.match(cssContent, /body\.focus-readable #container \{[^]*?box-shadow:[^]*?inset 0 0 20px transparent !important;/);
});
