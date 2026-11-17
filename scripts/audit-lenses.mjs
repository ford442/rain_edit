// Lens inventory + guardrail. Prints { id, combo, kind } for the catalog and
// fails on: duplicate lens ids, duplicate combos (within the catalog or
// against any other static `combo:` literal in src/), a catalog larger than
// MAX_LENSES, or reappearance of per-lens CSS dump files / binding groups.
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
export const MAX_LENSES = 14;

function sig(c) {
  const key = c.key && c.key.length === 1 ? c.key.toLowerCase() : c.key;
  return [
    c.ctrlOrMeta && "ctrlOrMeta", c.ctrl && "ctrl", c.meta && "meta",
    c.alt && "alt", c.shift && "shift",
    c.code && `code:${c.code}`, key && `key:${key}`,
  ].filter(Boolean).join("+");
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

/** Static scan of `combo: {...}` + optional `sharedCombo: true` outside the catalog. */
async function otherCombos(files) {
  const found = [];
  for (const f of files) {
    if (!f.endsWith(".js") || f.includes("/lenses/catalog.js") || f.endsWith("InputManager.js")) continue;
    const src = await readFile(f, "utf8");
    for (const m of src.matchAll(/combo:\s*(\{[^{}]*\})(\s*,\s*sharedCombo:\s*true)?/g)) {
      let combo;
      try { combo = Function(`return (${m[1]})`)(); } catch { continue; }
      found.push({
        file: relative(root, f),
        line: src.slice(0, m.index).split("\n").length,
        sig: sig(combo),
        shared: !!m[2],
      });
    }
  }
  return found;
}

export async function audit() {
  const { LENSES } = await import(pathToFileURL(resolve(root, "src/interactions/lenses/catalog.js")).href);
  const errors = [];
  const rows = LENSES.map((l) => ({ id: l.id, combo: sig(l.combo), kind: l.effect.kind, file: "src/interactions/lenses/catalog.js" }));

  const ids = new Set();
  const combos = new Map();
  for (const r of rows) {
    if (ids.has(r.id)) errors.push(`duplicate lens id "${r.id}"`);
    ids.add(r.id);
    if (combos.has(r.combo)) errors.push(`duplicate lens combo ${r.combo}: "${combos.get(r.combo)}" and "${r.id}"`);
    combos.set(r.combo, r.id);
  }
  if (rows.length > MAX_LENSES) errors.push(`catalog has ${rows.length} lenses; cap is ${MAX_LENSES}`);

  const files = await walk(resolve(root, "src"));
  const others = await otherCombos(files);
  for (const o of others) {
    if (combos.has(o.sig)) errors.push(`lens "${combos.get(o.sig)}" combo ${o.sig} collides with ${o.file}:${o.line}`);
  }
  const bySig = new Map();
  for (const o of others) {
    const prev = bySig.get(o.sig);
    if (prev && !(prev.shared && o.shared)) errors.push(`combo ${o.sig} bound twice: ${prev.file}:${prev.line} and ${o.file}:${o.line}`);
    if (!prev) bySig.set(o.sig, o);
  }

  for (const f of files) {
    const rel = relative(root, f);
    if (/^src\/styles_14\/extra-lenses-.*\.css$/.test(rel) || /-lens(es)?\.css$/.test(rel)) {
      errors.push(`per-lens stylesheet ${rel} — extend catalog.js kinds in src/styles/lenses.css instead`);
    }
  }
  if (existsSync(resolve(root, "src/interactions/lensBindings"))) {
    errors.push("src/interactions/lensBindings/ must not return — add rows to lenses/catalog.js");
  }
  return { rows, errors };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { rows, errors } = await audit();
  console.table(rows);
  for (const e of errors) console.error(`✗ ${e}`);
  if (errors.length) process.exit(1);
  console.log(`✓ ${rows.length} lenses, no collisions`);
}
