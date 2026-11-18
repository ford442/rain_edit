import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  buildManifest,
  hashCrateSources,
  hashFile,
  pinnedToolchain,
  readManifest,
  repositoryRoot,
  wasmPath,
} from "../scripts/rain-wasm-manifest.mjs";

const REBUILD = "run `npm run build:wasm` and commit src/rain/wasm/ with the crate change";

test("rain_sim.wasm was built from the current crates/rain-sim sources", () => {
  const manifest = readManifest();
  assert.equal(
    manifest.sourceSha256,
    hashCrateSources(),
    `crates/rain-sim changed since rain_sim.wasm was built: ${REBUILD}`,
  );
  assert.deepEqual(manifest.sources, buildManifest().sources, `crate file set changed: ${REBUILD}`);
});

test("rain_sim.wasm bytes match its manifest", () => {
  const manifest = readManifest();
  assert.equal(
    manifest.wasmSha256,
    hashFile(wasmPath),
    `rain_sim.wasm was replaced without the build script: ${REBUILD}`,
  );
  assert.equal(manifest.wasmBytes, readFileSync(wasmPath).length);
});

test("rain_sim.wasm was built with the pinned toolchain", () => {
  const manifest = readManifest();
  const pinned = pinnedToolchain();
  assert.ok(pinned, "crates/rain-sim/rust-toolchain.toml must pin a channel");
  assert.equal(manifest.toolchain, pinned);
  if (manifest.rustc) {
    assert.ok(
      manifest.rustc.startsWith(`rustc ${pinned} `),
      `built with ${manifest.rustc}, pinned ${pinned}: ${REBUILD}`,
    );
  }
});

test("rain_sim.wasm exports everything wasmEngine.js calls and imports nothing", () => {
  const module = new WebAssembly.Module(readFileSync(wasmPath));
  const exported = new Set(WebAssembly.Module.exports(module).map((e) => e.name));
  const engine = readFileSync(join(repositoryRoot, "src", "rain", "wasmEngine.js"), "utf8");
  const used = new Set([...engine.matchAll(/\b_?exports\.(\w+)/g)].map((m) => m[1]));
  assert.ok(used.size >= 10, "expected to find the wasm calls in wasmEngine.js");
  const missing = [...used].filter((name) => !exported.has(name));
  assert.deepEqual(missing, [], "wasmEngine.js calls exports the wasm does not provide");
  assert.deepEqual(WebAssembly.Module.imports(module), []);
});
