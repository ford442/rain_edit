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


test("legacy main_N shards do not return", () => {
  const numberedMainFiles = readdirSync(sourceRoot).filter((name) =>
    /^main_\d+\.js$/.test(name),
  );

  assert.deepEqual(numberedMainFiles, []);
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
