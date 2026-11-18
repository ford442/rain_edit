import assert from "node:assert/strict";
import test from "node:test";

import { Compositor, HOST_FRAME_SAMPLER, WATER_MAP_SAMPLER } from "../src/rendering/Compositor.js";

function setup({ running = true } = {}) {
  const log = [];
  const canvas = { id: "cabinet-canvas" };
  const gl = { id: "cabinet-gl" };
  const host = {
    getRendererCanvas: () => canvas,
    getGLContext: () => gl,
    renderFrame: () => log.push("host.render"),
    resetGLState: () => log.push("host.reset"),
  };
  const created = [];
  const pass = {
    running,
    copyFramebufferTo: (name) => (log.push(`copy:${name}`), true),
    bindTexture: (name) => (log.push(`upload:${name}`), true),
    setUniforms: (u) => log.push(`uniforms:${Object.keys(u).join(",")}`),
    render: () => log.push("pass.render"),
    getDiagnostics: () => ({ shaderLog: { status: "ok" } }),
    destroy: () => log.push("pass.destroy"),
  };
  const compositor = new Compositor({
    host,
    createPass: (c, g, options) => {
      created.push({ c, g, options });
      log.push("pass.create");
      return pass;
    },
  });
  return { compositor, log, created, pass, canvas, gl, host };
}

test("frame order: host render → reset → GPU copy → water map → draw → reset", () => {
  const { compositor, log, created, canvas, gl } = setup();
  const ok = compositor.frame({ waterMap: {}, uniforms: { u_brightness: 1 } });
  assert.equal(ok, true);
  assert.deepEqual(log, [
    "pass.create",
    "host.reset", // pass construction touched GL state behind the host cache
    "host.render",
    "host.reset",
    `copy:${HOST_FRAME_SAMPLER}`,
    `upload:${WATER_MAP_SAMPLER}`,
    "uniforms:u_brightness",
    "pass.render",
    "host.reset",
  ]);
  assert.equal(HOST_FRAME_SAMPLER, "u_textureFg");
  // The pass is built once, in the host's own canvas + context.
  assert.equal(created.length, 1);
  assert.equal(created[0].c, canvas);
  assert.equal(created[0].g, gl);
  compositor.frame({ waterMap: {}, uniforms: {} });
  assert.equal(created.length, 1);
  assert.equal(compositor.getDiagnostics().frames, 2);
});

test("a pass that cannot run leaves the host untouched so the caller can fall back", () => {
  const { compositor, log } = setup({ running: false });
  assert.equal(compositor.frame({ waterMap: {}, uniforms: {} }), false);
  assert.deepEqual(log, ["pass.create", "host.reset"]);
  assert.equal(compositor.getDiagnostics().frames, 0);
});

test("context restoration resets the host's GL state cache", () => {
  const { compositor, log, created } = setup();
  compositor.frame({ waterMap: {}, uniforms: {} });
  log.length = 0;
  created[0].options.onContextRestored();
  assert.deepEqual(log, ["host.reset"]);
});

test("diagnostics and destroy", () => {
  const { compositor, log } = setup();
  assert.equal(compositor.getDiagnostics().pass, null); // nothing built yet
  compositor.frame({ waterMap: {}, uniforms: {} });
  const d = compositor.getDiagnostics();
  assert.equal(d.frames, 1);
  assert.ok(d.averageMs >= 0);
  assert.deepEqual(d.pass, { shaderLog: { status: "ok" } });
  compositor.destroy();
  assert.equal(log.at(-1), "pass.destroy");
});
