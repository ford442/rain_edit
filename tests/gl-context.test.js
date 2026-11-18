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


// ── 2D contexts ───────────────────────────────────────────────────────────

import {
  DEFAULT_2D_ATTRIBUTES,
  create2DContext,
  get2DContextInfo,
  resolveDesync2D,
} from "../src/rendering/create2DContext.js";

function fake2DCanvas(granted) {
  const calls = [];
  const ctx = granted === undefined ? {} : { getContextAttributes: () => granted };
  return {
    calls,
    ctx,
    getContext(name, attributes) {
      calls.push({ name, attributes });
      return name === "2d" ? ctx : null;
    },
  };
}

test("create2DContext applies the shared 2D policy and records what was granted", () => {
  const canvas = fake2DCanvas({ alpha: true, desynchronized: false });
  const ctx = create2DContext(canvas, { attributes: { desynchronized: true }, label: "matrix" });
  assert.equal(ctx, canvas.ctx);
  assert.deepEqual(canvas.calls, [
    { name: "2d", attributes: { alpha: true, desynchronized: true, willReadFrequently: false } },
  ]);
  assert.deepEqual(get2DContextInfo(ctx), {
    label: "matrix",
    requested: { alpha: true, desynchronized: true, willReadFrequently: false },
    attributes: { alpha: true, desynchronized: false },
  });
  assert.deepEqual(DEFAULT_2D_ATTRIBUTES, { alpha: true, desynchronized: false, willReadFrequently: false });
});

test("create2DContext keeps the first label when a canvas hands back its context", () => {
  const canvas = fake2DCanvas();
  create2DContext(canvas, { label: "first" });
  create2DContext(canvas, { label: "second" });
  assert.equal(get2DContextInfo(canvas.ctx).label, "first");
  assert.equal(get2DContextInfo(canvas.ctx).attributes, null); // no getContextAttributes
  assert.equal(get2DContextInfo(null), null);
});

test("create2DContext returns null instead of throwing", () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(create2DContext({ getContext: () => { throw new Error("nope"); } }), null);
    assert.equal(create2DContext({ getContext: () => null }), null);
  } finally {
    console.warn = warn;
  }
});

test("resolveDesync2D: query wins over localStorage, default off", () => {
  const on = { getItem: () => "1" };
  const off = { getItem: () => null };
  assert.equal(resolveDesync2D("", off), false);
  assert.equal(resolveDesync2D("", on), true);
  assert.equal(resolveDesync2D("?desync2d=1", off), true);
  assert.equal(resolveDesync2D("?desync2d=0", on), false);
  assert.equal(resolveDesync2D("", { getItem: () => { throw new Error("blocked"); } }), false);
  assert.equal(resolveDesync2D(), false);
});
