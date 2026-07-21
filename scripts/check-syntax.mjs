import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { transform } from "esbuild";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(projectRoot, "src");

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findJavaScriptFiles(path)));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(path);
    }
  }

  return files;
}

const files = (await findJavaScriptFiles(sourceRoot)).sort();
let failed = false;

for (const file of files) {
  const sourcefile = relative(projectRoot, file);
  try {
    await transform(await readFile(file, "utf8"), {
      format: "esm",
      loader: "js",
      sourcefile,
    });
  } catch (error) {
    failed = true;
    console.error(`\nSyntax check failed: ${sourcefile}`);
    console.error(error.message);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`Syntax check passed (${files.length} files).`);
}
