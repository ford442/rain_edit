import { lstat, readFile, readlink } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(import.meta.dirname, "..");
const allowedValues = new Set([
  "deploy_token",
  "example",
  "...",
  "placeholder",
  "replace-me",
  "rotated-token",
  "test-token",
]);

function isAllowedValue(value) {
  const normalized = value.trim().replace(/^['"]|['"]$/g, "");
  return (
    !normalized ||
    normalized.startsWith("<") ||
    normalized.startsWith("$") ||
    normalized.includes("process.env") ||
    normalized.includes("os.environ") ||
    normalized.includes("getenv(") ||
    allowedValues.has(normalized.toLowerCase())
  );
}

export function scanText(text) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  const privateKeyPattern = new RegExp(
    "-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----|" +
      "-----" +
      "BEGIN PGP PRIVATE KEY BLOCK-----",
  );
  const deployTokenPattern =
    /["']?(?:DEPLOY_TOKEN|X-Deploy-Token)["']?\s*[:=]\s*([^\s,;}#]+)/g;

  lines.forEach((line, index) => {
    if (privateKeyPattern.test(line)) {
      findings.push({ line: index + 1, rule: "private-key" });
    }

    deployTokenPattern.lastIndex = 0;
    for (const match of line.matchAll(deployTokenPattern)) {
      if (!isAllowedValue(match[1])) {
        findings.push({ line: index + 1, rule: "deploy-token" });
      }
    }
  });

  return findings;
}

function isBinary(buffer) {
  return buffer.subarray(0, 8192).includes(0);
}

async function readTrackedFile(path) {
  const stats = await lstat(path);
  if (stats.isSymbolicLink()) {
    return Buffer.from(await readlink(path));
  }
  return readFile(path);
}

async function main() {
  const inputChunks = [];
  for await (const chunk of process.stdin) {
    inputChunks.push(chunk);
  }
  const paths = Buffer.concat(inputChunks)
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort();
  const findings = [];
  let scannedFiles = 0;

  for (const trackedPath of paths) {
    let buffer;
    try {
      buffer = await readTrackedFile(resolve(projectRoot, trackedPath));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (isBinary(buffer)) continue;
    scannedFiles += 1;

    for (const finding of scanText(buffer.toString("utf8"))) {
      findings.push({ path: trackedPath, ...finding });
    }
  }

  if (findings.length > 0) {
    console.error("Potential secrets found in tracked files:");
    for (const finding of findings) {
      console.error(`- ${finding.path}:${finding.line} (${finding.rule})`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Secret check passed (${scannedFiles} text files).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
