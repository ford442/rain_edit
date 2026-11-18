#!/usr/bin/env node
/**
 * Build crates/rain-sim for wasm32, copy the artifact into src/rain/wasm/, and
 * write its provenance manifest (rain_sim.manifest.json). Vite imports the
 * wasm via `?url` — no manual public/ copy step.
 *
 * The toolchain is pinned by crates/rain-sim/rust-toolchain.toml (rustup
 * honours it because cargo runs inside the crate), which makes the output
 * byte-reproducible; .github/workflows/wasm.yml relies on that.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  buildManifest,
  crateDir,
  manifestPath,
  pinnedToolchain,
  wasmPath as outFile,
} from "./rain-wasm-manifest.mjs";

const outDir = dirname(outFile);
const built = join(
  crateDir,
  "target",
  "wasm32-unknown-unknown",
  "release",
  "rain_sim.wasm",
);

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(join(crateDir, "Cargo.toml"))) {
  console.error("crates/rain-sim/Cargo.toml missing");
  process.exit(1);
}

run(
  "cargo",
  ["build", "--target", "wasm32-unknown-unknown", "--release"],
  crateDir,
);

if (!existsSync(built)) {
  console.error("Expected wasm artifact missing:", built);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
copyFileSync(built, outFile);

const version = spawnSync("rustc", ["--version"], { cwd: crateDir, encoding: "utf8" });
const rustc = version.status === 0 ? version.stdout.trim() : null;
const pinned = pinnedToolchain();
if (pinned && rustc && !rustc.startsWith(`rustc ${pinned} `)) {
  console.warn(
    `warning: built with "${rustc}" but rust-toolchain.toml pins ${pinned}; ` +
      "the artifact will not match CI's rebuild.",
  );
}
const manifest = buildManifest({ rustc });
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log("Wrote", outFile, `(${manifest.wasmBytes} bytes, sha256 ${manifest.wasmSha256.slice(0, 12)}…)`);
console.log("Wrote", manifestPath);
