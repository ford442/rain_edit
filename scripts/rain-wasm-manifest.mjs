/**
 * Provenance for src/rain/wasm/rain_sim.wasm: which crate sources and which
 * toolchain produced it. `npm run build:wasm` writes the manifest;
 * tests/rain-wasm.test.js fails when the crate changed without a rebuild, or
 * the wasm changed without going through the build script.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
export const crateDir = join(repositoryRoot, "crates", "rain-sim");
export const wasmPath = join(repositoryRoot, "src", "rain", "wasm", "rain_sim.wasm");
export const manifestPath = join(repositoryRoot, "src", "rain", "wasm", "rain_sim.manifest.json");

const ROOT_FILES = ["Cargo.toml", "Cargo.lock", "rust-toolchain.toml"];

function listRustSources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listRustSources(path);
    return entry.name.endsWith(".rs") ? [path] : [];
  });
}

/** Every file whose content determines the wasm bytes, crate-relative and sorted. */
export function crateSourceFiles(dir = crateDir) {
  const files = ROOT_FILES.map((name) => join(dir, name)).filter((path) => existsSync(path));
  files.push(...listRustSources(join(dir, "src")));
  return files
    .map((path) => relative(dir, path).split("\\").join("/"))
    .sort();
}

/**
 * sha256 over (path, content) of every crate source. Line endings are
 * normalised so a CRLF checkout hashes the same as LF.
 */
export function hashCrateSources(dir = crateDir) {
  const hash = createHash("sha256");
  for (const rel of crateSourceFiles(dir)) {
    const text = readFileSync(join(dir, rel), "utf8").replace(/\r\n/g, "\n");
    hash.update(`${rel}\0${text}\0`);
  }
  return hash.digest("hex");
}

export function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** The `channel` pinned in crates/rain-sim/rust-toolchain.toml, or null. */
export function pinnedToolchain(dir = crateDir) {
  const path = join(dir, "rust-toolchain.toml");
  if (!existsSync(path)) return null;
  const match = /^\s*channel\s*=\s*"([^"]+)"/m.exec(readFileSync(path, "utf8"));
  return match ? match[1] : null;
}

export function readManifest(path = manifestPath) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Manifest for the current crate + wasm on disk. */
export function buildManifest({ rustc = null } = {}) {
  return {
    crate: "crates/rain-sim",
    toolchain: pinnedToolchain(),
    rustc,
    sources: crateSourceFiles(),
    sourceSha256: hashCrateSources(),
    wasmSha256: hashFile(wasmPath),
    wasmBytes: readFileSync(wasmPath).length,
  };
}
