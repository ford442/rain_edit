#!/usr/bin/env node
/**
 * One-off merge: TabManager_0..7 → src/tabManager/{core,viewModes,echoLayouts,echoRender}.js
 */
import fs from "node:fs";
import path from "node:path";

const src = path.join(process.cwd(), "src");

function readMixinFile(n) {
  return fs.readFileSync(path.join(src, `TabManager_${n}.js`), "utf8");
}

function readMixinBody(n) {
  const text = readMixinFile(n);
  const marker = `export const TabManagerMixin${n} = {`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`Missing marker in TabManager_${n}.js`);
  const bodyStart = start + marker.length;
  const closeIdx = text.indexOf("\n};", bodyStart);
  if (closeIdx < 0) throw new Error(`Missing close in TabManager_${n}.js`);
  return {
    body: text.slice(bodyStart, closeIdx),
    tail: text.slice(closeIdx + 3),
  };
}

function extractObjectMethods(body) {
  const methods = new Map();
  let i = 0;
  while (i < body.length) {
    const m = body.slice(i).match(/^\s*([A-Za-z_][\w$]*)\s*\(/);
    if (!m) {
      i++;
      continue;
    }
    const name = m[1];
    const start = i + m.index;
    const brace = body.indexOf("{", start);
    if (brace < 0) break;
    let depth = 0;
    let j = brace;
    for (; j < body.length; j++) {
      const ch = body[j];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          methods.set(name, body.slice(start, j + 1).trim());
          i = j + 1;
          break;
        }
      }
    }
    if (j >= body.length) break;
  }
  return methods;
}

function extractAssignedMethods(tail, exportName) {
  const methods = new Map();
  const re = new RegExp(
    `${exportName}\\.(\\w+)\\s*=\\s*function\\s*\\([^)]*\\)\\s*\\{`,
    "g",
  );
  let match;
  while ((match = re.exec(tail)) !== null) {
    const name = match[1];
    const start = match.index;
    const brace = tail.indexOf("{", start);
    let depth = 0;
    let j = brace;
    for (; j < tail.length; j++) {
      const ch = tail[j];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const fn = tail.slice(start, j + 1);
          const converted = fn
            .replace(
              new RegExp(`^${exportName}\\.(\\w+)\\s*=\\s*function\\s*\\(`),
              "$1(",
            )
            .replace(/\}\s*;\s*$/, "},");
          methods.set(name, converted.trim());
          break;
        }
      }
    }
  }
  return methods;
}

function mergeMethodMaps(...maps) {
  const out = new Map();
  for (const map of maps) {
    for (const [k, v] of map) out.set(k, v);
  }
  return out;
}

function ensureMethodComma(method) {
  const trimmed = method.trim().replace(/,+\s*$/, "");
  return trimmed.endsWith("}") ? `${trimmed},` : trimmed;
}

function methodsToObjectBody(methods) {
  return [...methods.values()]
    .map((m) => `  ${ensureMethodComma(m)}`)
    .join("\n");
}

function extractMethod(body, name) {
  const re = new RegExp(`\\n\\s+${name}\\([^)]*\\)\\s*\\{`, "m");
  const m = body.match(re);
  if (!m) return null;
  const start = m.index;
  let depth = 0;
  let i = body.indexOf("{", start);
  for (; i < body.length; i++) {
    const ch = body[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return body.slice(start, i + 1);
    }
  }
  return null;
}

function methodInner(methodText) {
  const open = methodText.indexOf("{");
  let inner = methodText.slice(open + 1);
  inner = inner.replace(/\}\s*$/, "");
  inner = inner.replace(/\n\s*return false;\s*$/, "");
  return inner.trim();
}

function mergeChunkMethods(bodies, name) {
  const inners = bodies
    .map((b) => extractMethod(b, name))
    .filter(Boolean)
    .map(methodInner);
  if (inners.length === 0) return "";
  return `  ${name}(el, index, totalEchoes, file, inactiveFiles, activeFile) {
${inners.join("\n\n")}
    return false;
  },`;
}

const sharedImport = `import {
  storageAPI,
  TOAST_DISPLAY_DURATION,
  DEPTH_Z_INDEX,
  DEPTH_ICONS,
  DEPTH_TITLES,
  _extractSymbols,
  _symbolKindIcon,
} from "../TabManager.js";
`;

const m0 = readMixinBody(0);
const m1 = readMixinBody(1);
const m2 = readMixinBody(2);
const m3 = readMixinBody(3);
const m4 = readMixinBody(4);
const m5 = readMixinBody(5);
const m6 = readMixinBody(6);
const m7 = readMixinBody(7);

const viewModeMethods = mergeMethodMaps(
  extractObjectMethods(m0.body),
  extractAssignedMethods(m0.tail, "TabManagerMixin0"),
  extractObjectMethods(m6.body),
);

const outDir = path.join(src, "tabManager");
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, "core.js"),
  `${sharedImport}
/** Tab lifecycle: active file, depth, tabs UI, persistence, notes. */
export const TabManagerCoreMixin = {
${m1.body}
};
`,
);

fs.writeFileSync(
  path.join(outDir, "viewModes.js"),
  `${sharedImport}
/** 3D view-mode flags, toggles, and addFile entry point. */
export const TabManagerViewModesMixin = {
${methodsToObjectBody(viewModeMethods)}
};
`,
);

const chunk2 = extractMethod(m3.body, "_applyLayoutChunk2");
const chunk3 = mergeChunkMethods([m3.body, m7.body], "_applyLayoutChunk3");
const chunk4 = mergeChunkMethods([m3.body, m7.body], "_applyLayoutChunk4");

fs.writeFileSync(
  path.join(outDir, "echoLayouts.js"),
  `${sharedImport}
/** Per-view echo-document CSS variable layouts (chunked dispatch chain). */
export const TabManagerEchoLayoutsMixin = {
${m2.body}
${chunk2},
${chunk3}
${chunk4}
};
`,
);

fs.writeFileSync(
  path.join(outDir, "echoRender.js"),
  `${sharedImport}
/** Echo DOM construction, events, and layout dispatch. */
export const TabManagerEchoRenderMixin = {
${m4.body}
${m5.body}
};
`,
);

console.log("Wrote src/tabManager/{core,viewModes,echoLayouts,echoRender}.js");
