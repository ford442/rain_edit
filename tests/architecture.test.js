import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";


const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoot = join(repositoryRoot, "src");


function findJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findJavaScriptFiles(path);
    return entry.name.endsWith(".js") ? [path] : [];
  });
}


/** Source with comments blanked out, so prose mentioning an API doesn't count. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

const srcFiles = () =>
  findJavaScriptFiles(sourceRoot).map((path) => ({
    path,
    rel: relative(repositoryRoot, path).split("\\").join("/"),
    code: stripComments(readFileSync(path, "utf8")),
  }));

const isWorkerFile = (rel) => /(Worker|\.worker)\.js$/.test(rel);


test("legacy main_* boot shards do not return", () => {
  const shards = readdirSync(sourceRoot).filter((name) =>
    /^main_.*\.js$/.test(name),
  );

  assert.deepEqual(shards, [], "boot lives in src/boot/createApp.js");
});


test("main.js only imports and calls createApp", () => {
  const main = stripComments(readFileSync(join(sourceRoot, "main.js"), "utf8"));
  const imports = [...main.matchAll(/^\s*import\s[^;]*?from\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']/gm)]
    .map((m) => m[1] || m[2]);
  assert.deepEqual(imports, ["./boot/createApp.js"]);
});


test("requestAnimationFrame is only used by AppClock and worker threads", () => {
  const offenders = srcFiles()
    .filter(({ rel }) => rel !== "src/runtime/AppClock.js" && !isWorkerFile(rel))
    .filter(({ code }) => /\brequestAnimationFrame\b/.test(code))
    .map(({ rel }) => rel);

  assert.deepEqual(
    offenders,
    [],
    "register an AppClock task (appClock.register / nextFrame) instead of a private RAF",
  );
});


// The only window globals the app may install. Keep this tiny.
const WINDOW_ASSIGNMENT_ALLOWLIST = {
  // Documented debug alias for smoke tests / manual automation.
  "src/boot/createApp.js": ["tabManager"],
};

test("window.* assignments stay within the allowlist", () => {
  const assignment =
    /\b(?:window|globalThis|self|win)\s*\)?\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*["'`]([^"'`]+)["'`]\s*\])\s*(?:[-+*/|&?]{0,2}=(?!=)|\+\+|--)/g;
  const found = {};
  for (const { rel, code } of srcFiles()) {
    if (isWorkerFile(rel)) continue; // worker globals (self.onmessage) are the worker API
    for (const m of code.matchAll(assignment)) {
      (found[rel] ||= new Set()).add(m[1] || m[2]);
    }
  }

  const unexpected = Object.entries(found).flatMap(([rel, names]) =>
    [...names]
      .filter((name) => !(WINDOW_ASSIGNMENT_ALLOWLIST[rel] || []).includes(name))
      .map((name) => `${rel}: window.${name}`),
  );
  assert.deepEqual(
    unexpected,
    [],
    "share state through src/appContext.js or src/interactions/interactionState.js",
  );

  for (const [rel, names] of Object.entries(WINDOW_ASSIGNMENT_ALLOWLIST)) {
    for (const name of names) {
      assert.ok(found[rel]?.has(name), `stale allowlist entry ${rel}: ${name}`);
    }
  }
});


test("index.html has no duplicate element ids", () => {
  const html = readFileSync(join(repositoryRoot, "index.html"), "utf8").replace(
    /<!--[\s\S]*?-->/g,
    "",
  );
  const counts = {};
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) counts[m[1]] = (counts[m[1]] || 0) + 1;
  const dupes = Object.keys(counts).filter((id) => counts[id] > 1);
  assert.deepEqual(dupes, []);
});


test("every type-checked .js seam opts in with // @ts-check", () => {
  // jsconfig.json sets checkJs: false, so a listed file without the pragma
  // would silently drop out of `npm run typecheck`.
  const config = JSON.parse(readFileSync(join(repositoryRoot, "jsconfig.json"), "utf8"));
  const missing = config.include
    .filter((entry) => entry.endsWith(".js"))
    .filter((entry) => !readFileSync(join(repositoryRoot, entry), "utf8").startsWith("// @ts-check"));
  assert.deepEqual(missing, []);
});


test("Monaco worker imports have one source of truth", () => {
  const workerImportFiles = findJavaScriptFiles(sourceRoot)
    .filter((path) => {
      const source = readFileSync(path, "utf8");
      return source.includes("monaco-editor") && source.includes("?worker");
    })
    .map((path) => relative(repositoryRoot, path));

  assert.deepEqual(workerImportFiles, ["src/editor/setupMonaco.js"]);
});
