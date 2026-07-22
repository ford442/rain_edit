import assert from "node:assert/strict";
import test from "node:test";
import {
  applyViewMode,
  buildSession,
  clampDepth,
  detectViewMode,
  normalizeSession,
  serializeTabFile,
  sessionHasDirtyTabs,
  VIEW_MODE_TOGGLES,
} from "../src/workspace/sessionSchema.js";

test("clampDepth keeps values in 0..2", () => {
  assert.equal(clampDepth(-3), 0);
  assert.equal(clampDepth(1.9), 1);
  assert.equal(clampDepth(9), 2);
  assert.equal(clampDepth("nope"), 1);
});

test("normalizeSession upgrades legacy tab arrays", () => {
  const session = normalizeSession([
    { fileId: 3, name: "a.js", language: "javascript", vpsPath: "/x" },
  ]);
  assert.equal(session.version, 1);
  assert.equal(session.tabs.length, 1);
  assert.equal(session.tabs[0].name, "a.js");
  assert.equal(session.tabs[0].depth, 1);
  assert.equal(session.tabs[0].vpsPath, "/x");
  assert.equal(session.activeId, 3);
});

test("normalizeSession round-trips buildSession", () => {
  const raw = buildSession({
    activeId: 2,
    viewMode: "orbit",
    tabs: [
      {
        id: 2,
        name: "storm.js",
        language: "javascript",
        depth: 2,
        dirty: true,
        content: "console.log(1)",
      },
    ],
    reference: { markdown: "# Hello", cards: [{ index: 0, left: "10%" }] },
  });
  const again = normalizeSession(JSON.parse(JSON.stringify(raw)));
  assert.equal(again.viewMode, "orbit");
  assert.equal(again.tabs[0].dirty, true);
  assert.equal(again.tabs[0].content, "console.log(1)");
  assert.equal(again.reference.cards[0].left, "10%");
  assert.equal(sessionHasDirtyTabs(again), true);
});

test("serializeTabFile reads model.getValue and depth", () => {
  const file = {
    id: 1,
    name: "x.js",
    language: "javascript",
    depth: 0,
    dirty: false,
    model: { getValue: () => "abc" },
  };
  const serialized = serializeTabFile(file);
  assert.equal(serialized.content, "abc");
  assert.equal(serialized.depth, 0);
});

test("detectViewMode reads body class tokens", () => {
  const classList = {
    _set: new Set(["orbit-active"]),
    contains(name) {
      return this._set.has(name);
    },
  };
  assert.equal(detectViewMode({ classList }), "orbit");
  classList._set = new Set(["quantum-superposition-active"]);
  assert.equal(detectViewMode({ classList }), "quantum");
  classList._set = new Set();
  assert.equal(detectViewMode({ classList }), "");
});

test("applyViewMode deactivates then toggles", () => {
  const calls = [];
  const tm = {
    _deactivateAllViews() {
      calls.push("off");
    },
    toggleOrbitView() {
      calls.push("orbit");
    },
  };
  applyViewMode(tm, "orbit");
  assert.deepEqual(calls, ["off", "orbit"]);
  calls.length = 0;
  applyViewMode(tm, "");
  assert.deepEqual(calls, ["off"]);
});

test("VIEW_MODE_TOGGLES covers core spatial modes", () => {
  for (const key of ["waterfall", "orbit", "galaxy", "outline", "helix"]) {
    assert.equal(typeof VIEW_MODE_TOGGLES[key], "string");
  }
});
