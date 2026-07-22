#!/usr/bin/env node
/**
 * Build crates/rain-sim for wasm32 and copy the artifact into src/rain/wasm/.
 * Vite imports that file via `?url` — no manual public/ copy step.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const crateDir = join(root, "crates", "rain-sim");
const outDir = join(root, "src", "rain", "wasm");
const outFile = join(outDir, "rain_sim.wasm");
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
console.log("Wrote", outFile);
