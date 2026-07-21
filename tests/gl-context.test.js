import assert from "node:assert/strict";
import test from "node:test";

import {
  createGLContext,
  getGLContextInfo,
  resizeCanvasToDisplaySize,
} from "../src/rendering/createGLContext.js";


function createFakeGL(attributes = {}) {
  return {
    getContextAttributes() {
      return attributes;
    },
    getExtension(name) {
      return name === "OES_texture_float" ? { name } : null;
    },
  };
}


test("createGLContext prefers WebGL2 and applies shared attributes", () => {
  const calls = [];
  const webgl2 = createFakeGL({ alpha: true, antialias: false });
  const canvas = {
    getContext(name, attributes) {
      calls.push({ name, attributes });
      return name === "webgl2" ? webgl2 : null;
    },
  };

  const context = createGLContext(canvas);

  assert.equal(context, webgl2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "webgl2");
  assert.equal(calls[0].attributes.antialias, false);
  assert.equal(calls[0].attributes.preserveDrawingBuffer, false);
  assert.equal(calls[0].attributes.powerPreference, "high-performance");
  assert.equal(getGLContextInfo(context).api, "webgl2");
});


test("createGLContext falls back to WebGL1 and probes compatibility extensions", () => {
  const calls = [];
  const webgl1 = createFakeGL({ alpha: true });
  const canvas = {
    getContext(name) {
      calls.push(name);
      return name === "webgl" ? webgl1 : null;
    },
  };

  const context = createGLContext(canvas);
  const info = getGLContextInfo(context);

  assert.deepEqual(calls, ["webgl2", "webgl"]);
  assert.equal(info.api, "webgl1");
  assert.ok(info.extensions.OES_texture_float);
  assert.equal(info.extensions.OES_texture_float_linear, null);
});


test("resizeCanvasToDisplaySize keeps CSS pixels separate from buffer pixels", () => {
  const canvas = { width: 0, height: 0, style: {} };

  const size = resizeCanvasToDisplaySize(canvas, 320.4, 180.4, 2);

  assert.deepEqual(size, {
    cssWidth: 320,
    cssHeight: 180,
    bufferWidth: 640,
    bufferHeight: 360,
    dpr: 2,
  });
  assert.equal(canvas.width, 640);
  assert.equal(canvas.height, 360);
  assert.equal(canvas.style.width, "320px");
  assert.equal(canvas.style.height, "180px");
});
