import assert from "node:assert/strict";
import test from "node:test";

import {
  clearVars,
  closestEcho,
  distanceToCenter,
  localMouse,
  normalizedPointerInRect,
  queryEchoes,
  rectCenter,
  setVars,
} from "../src/interactions/depthState.js";

function fakeElement(rect, extra = {}) {
  const props = new Map();
  return {
    getBoundingClientRect: () => rect,
    style: {
      setProperty: (name, value) => props.set(name, value),
      removeProperty: (name) => props.delete(name),
      getPropertyValue: (name) => (props.has(name) ? props.get(name) : ""),
    },
    ...extra,
  };
}

test("rectCenter returns the midpoint of a rect", () => {
  assert.deepEqual(rectCenter({ left: 0, top: 0, width: 100, height: 50 }), { cx: 50, cy: 25 });
});

test("distanceToCenter measures from a client point to an element's rect center", () => {
  const el = fakeElement({ left: 0, top: 0, width: 100, height: 100 });
  const { dist, cx, cy } = distanceToCenter(el, 50, 100);
  assert.equal(cx, 50);
  assert.equal(cy, 50);
  assert.equal(dist, 50);
});

test("closestEcho picks the nearest of several echoes and returns null for an empty list", () => {
  const near = fakeElement({ left: 0, top: 0, width: 10, height: 10 }); // center (5,5)
  const far = fakeElement({ left: 500, top: 500, width: 10, height: 10 }); // center (505,505)
  const result = closestEcho([far, near], 0, 0);
  assert.equal(result.echo, near);

  assert.equal(closestEcho([], 0, 0), null);
});

test("localMouse computes cursor position relative to an element's rect", () => {
  const el = fakeElement({ left: 20, top: 10, width: 100, height: 100 });
  const { localX, localY } = localMouse(el, 50, 40);
  assert.equal(localX, 30);
  assert.equal(localY, 30);
});

test("normalizedPointerInRect maps a rect to [-1, 1] on each axis", () => {
  const el = fakeElement({ left: 0, top: 0, width: 200, height: 100 });
  assert.deepEqual(normalizedPointerInRect(el, 0, 0), { x: -1, y: -1 });
  assert.deepEqual(normalizedPointerInRect(el, 200, 100), { x: 1, y: 1 });
  assert.deepEqual(normalizedPointerInRect(el, 100, 50), { x: 0, y: 0 });
});

test("queryEchoes returns [] for a missing layer and the matched elements otherwise", () => {
  assert.deepEqual(queryEchoes(null), []);

  const echoes = [fakeElement({ left: 0, top: 0, width: 1, height: 1 })];
  const layer = { querySelectorAll: (sel) => (sel === ".echo-document" ? echoes : []) };
  assert.equal(queryEchoes(layer)[0], echoes[0]);
});

test("setVars / clearVars batch-apply and remove CSS custom properties", () => {
  const el = fakeElement({ left: 0, top: 0, width: 1, height: 1 });
  setVars(el, { "--a": "1px", "--b": 2 });
  assert.equal(el.style.getPropertyValue("--a"), "1px");
  assert.equal(el.style.getPropertyValue("--b"), "2");

  clearVars(el, ["--a"]);
  assert.equal(el.style.getPropertyValue("--a"), "");
  assert.equal(el.style.getPropertyValue("--b"), "2");
});
