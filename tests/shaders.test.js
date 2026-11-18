import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildProgram,
  formatShaderLog,
  glslVersionOf,
  parseShaderInfoLog,
  selectShaderSource,
} from "../src/rendering/shaderProgram.js";
import { formatRenderingReport } from "../src/rendering/ShaderDebugOverlay.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const shaderDir = join(root, "src", "shaders");
const read = (name) => readFileSync(join(shaderDir, name), "utf8");

// Each authored GLSL ES 3.00 stage and its GLSL ES 1.00 WebGL1 copy.
const PAIRS = [
  ["simple.vert", "simple.es100.vert"],
  ["water.frag", "water.es100.frag"],
  ["water-back.frag", "water-back.es100.frag"],
];

const uniforms = (src) =>
  [...src.matchAll(/^\s*uniform\s+(\w+)\s+(\w+)\s*;/gm)].map((m) => `${m[1]} ${m[2]}`).sort();
const functions = (src) =>
  [...src.matchAll(/^\s*(?:void|float|int|bool|vec[234]|mat[234])\s+(\w+)\s*\(/gm)]
    .map((m) => m[1])
    .sort();

test("every shader file is one side of a registered ES 3.00 / ES 1.00 pair", () => {
  const files = readdirSync(shaderDir).filter((n) => /\.(vert|frag)$/.test(n)).sort();
  assert.deepEqual(files, PAIRS.flat().sort());
  const index = read("index.js");
  for (const name of PAIRS.flat()) {
    assert.ok(index.includes(`"./${name}?raw"`), `${name} is imported by src/shaders/index.js`);
  }
});

for (const [es300Name, es100Name] of PAIRS) {
  test(`${es300Name} is authored GLSL ES 3.00 with no ES 1.00 leftovers`, () => {
    const src = read(es300Name);
    assert.ok(src.startsWith("#version 300 es\n"), "#version 300 es must be the first line");
    assert.equal(glslVersionOf(src), "300 es");
    for (const legacy of [/\battribute\b/, /\bvarying\b/, /\btexture2D\b/, /\bgl_FragColor\b/]) {
      assert.doesNotMatch(src, legacy);
    }
    assert.match(src, /precision\s+mediump\s+float\s*;/);
    if (es300Name.endsWith(".frag")) assert.match(src, /^out vec4 fragColor;$/m);
  });

  test(`${es100Name} stays GLSL ES 1.00 and in step with ${es300Name}`, () => {
    const legacy = read(es100Name);
    const modern = read(es300Name);
    assert.equal(glslVersionOf(legacy), "100");
    assert.doesNotMatch(legacy, /#version/);
    assert.deepEqual(uniforms(legacy), uniforms(modern), "uniform sets must match");
    assert.deepEqual(functions(legacy), functions(modern), "function sets must match");
  });
}

test("glslify is gone: no ?glslify imports, plugin, or dependency", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(pkg.dependencies?.glslify, undefined);
  assert.equal(pkg.devDependencies?.glslify, undefined);
  assert.doesNotMatch(readFileSync(join(root, "vite.config.js"), "utf8"), /import\s+glslify/);
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith(".js") ? [join(dir, e.name)] : [],
    );
  const offenders = walk(join(root, "src")).filter((p) => readFileSync(p, "utf8").includes("?glslify"));
  assert.deepEqual(offenders, []);
});

// ── Variant selection ─────────────────────────────────────────────────────

const PAIR = { name: "x.frag", es300: "#version 300 es\nvoid main(){}", es100: "void main(){}" };

test("selectShaderSource compiles ES 3.00 on WebGL2 and the ES 1.00 copy on WebGL1", () => {
  assert.deepEqual(selectShaderSource(PAIR, "webgl2"), {
    name: "x.frag",
    source: PAIR.es300,
    version: "300 es",
  });
  assert.deepEqual(selectShaderSource(PAIR, "webgl1"), {
    name: "x.frag",
    source: PAIR.es100,
    version: "100",
  });
  // WebGL2 accepts ES 1.00 natively when that is all there is.
  assert.equal(selectShaderSource({ name: "y", es100: "void main(){}" }, "webgl2").version, "100");
});

test("selectShaderSource refuses ES 3.00 on WebGL1 instead of rewriting it", () => {
  assert.throws(() => selectShaderSource({ name: "z.frag", es300: PAIR.es300 }, "webgl1"), /z\.frag: no GLSL ES 1\.00/);
  assert.throws(() => selectShaderSource(PAIR.es300, "webgl1"), /cannot compile on WebGL1/);
  assert.equal(selectShaderSource("void main(){}", "webgl1").version, "100");
});

// ── Info-log parsing ──────────────────────────────────────────────────────

test("parseShaderInfoLog maps ANGLE and Mesa errors to source lines", () => {
  const source = "#version 300 es\nprecision mediump float;\nvoid main(){ foo(); }\n";
  const angle = parseShaderInfoLog("ERROR: 0:3: 'foo' : no matching overloaded function found\nERROR: 1 compilation errors.  No code generated.\n\0", source);
  assert.deepEqual(angle[0], {
    severity: "error",
    line: 3,
    message: "'foo' : no matching overloaded function found",
    excerpt: "void main(){ foo(); }",
  });
  // "ERROR: 1 compilation errors." carries no 0:N location; the NUL terminator is dropped.
  assert.equal(angle.length, 2);
  assert.equal(angle[1].line, null);
  const mesa = parseShaderInfoLog("0:3(14): warning: `x' unused", source);
  assert.deepEqual(mesa, [{ severity: "warning", line: 3, message: "`x' unused", excerpt: "void main(){ foo(); }" }]);
  assert.deepEqual(parseShaderInfoLog("", source), []);
  assert.equal(parseShaderInfoLog("driver exploded", source)[0].line, null);
});

// ── buildProgram against a fake GL ────────────────────────────────────────

function fakeGL({ failStage = null, failLink = false, infoLog = "" } = {}) {
  const calls = [];
  let nextId = 0;
  const shaders = new Map();
  return {
    calls,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    createShader(type) {
      const s = { id: ++nextId, type };
      shaders.set(s, { type });
      return s;
    },
    shaderSource(s, src) {
      shaders.get(s).src = src;
      calls.push(["shaderSource", s.type, src]);
    },
    compileShader() {},
    getShaderParameter(s) {
      const stage = s.type === 0x8b31 ? "vertex" : "fragment";
      return stage !== failStage;
    },
    getShaderInfoLog(s) {
      const stage = s.type === 0x8b31 ? "vertex" : "fragment";
      return stage === failStage ? infoLog : "";
    },
    deleteShader(s) {
      calls.push(["deleteShader", s.id]);
    },
    createProgram: () => ({ program: true }),
    attachShader() {},
    bindAttribLocation(_p, loc, name) {
      calls.push(["bindAttribLocation", loc, name]);
    },
    linkProgram() {},
    getProgramParameter: () => !failLink,
    getProgramInfoLog: () => (failLink ? "varying mismatch" : ""),
    deleteProgram() {
      calls.push(["deleteProgram"]);
    },
  };
}

const VS = { name: "a.vert", es300: "#version 300 es\nin vec2 a_position;\nvoid main(){}", es100: "attribute vec2 a_position;\nvoid main(){}" };
const FS = { name: "b.frag", es300: "#version 300 es\nprecision mediump float;\nout vec4 c;\nvoid main(){ c = nope; }", es100: "void main(){}" };

test("buildProgram compiles the ES 3.00 sources verbatim on WebGL2", () => {
  const gl = fakeGL();
  const { program, log } = buildProgram(gl, "webgl2", { vertex: VS, fragment: FS });
  assert.ok(program);
  assert.equal(log.status, "ok");
  assert.equal(log.error, null);
  assert.equal(log.vertex.version, "300 es");
  assert.equal(log.fragment.version, "300 es");
  const sources = gl.calls.filter((c) => c[0] === "shaderSource").map((c) => c[2]);
  assert.deepEqual(sources, [VS.es300, FS.es300], "no rewriting");
  assert.deepEqual(gl.calls.find((c) => c[0] === "bindAttribLocation"), ["bindAttribLocation", 0, "a_position"]);
  assert.ok(log.link.ok);
});

test("buildProgram compiles the ES 1.00 copies on WebGL1", () => {
  const gl = fakeGL();
  const { log } = buildProgram(gl, "webgl1", { vertex: VS, fragment: FS });
  const sources = gl.calls.filter((c) => c[0] === "shaderSource").map((c) => c[2]);
  assert.deepEqual(sources, [VS.es100, FS.es100]);
  assert.equal(log.vertex.version, "100");
});

test("buildProgram reports compile errors with a source excerpt instead of throwing", () => {
  const gl = fakeGL({ failStage: "fragment", infoLog: "ERROR: 0:4: 'nope' : undeclared identifier\n" });
  const { program, log } = buildProgram(gl, "webgl2", { vertex: VS, fragment: FS });
  assert.equal(program, null);
  assert.equal(log.status, "error");
  assert.equal(log.vertex.ok, true);
  assert.equal(log.fragment.ok, false);
  assert.equal(log.link, null);
  assert.equal(log.error, "webgl2 fragment shader b.frag:4 (GLSL 300 es): 'nope' : undeclared identifier");
  assert.equal(log.fragment.messages[0].excerpt, "void main(){ c = nope; }");
  // The vertex shader that did compile is released.
  assert.equal(gl.calls.filter((c) => c[0] === "deleteShader").length, 2);
  const text = formatShaderLog(log);
  assert.match(text, /fragment b\.frag GLSL 300 es: FAILED/);
  assert.match(text, /error L4: 'nope' : undeclared identifier\n {6}\| void main\(\)\{ c = nope; \}/);
});

test("buildProgram reports link errors", () => {
  const { program, log } = buildProgram(fakeGL({ failLink: true }), "webgl2", { vertex: VS, fragment: FS });
  assert.equal(program, null);
  assert.equal(log.link.ok, false);
  assert.match(log.error, /program link error \(a\.vert \+ b\.frag\): varying mismatch/);
});

test("buildProgram turns a variant mismatch into a logged error", () => {
  const { program, log } = buildProgram(fakeGL(), "webgl1", {
    vertex: VS,
    fragment: { name: "only300.frag", es300: FS.es300 },
  });
  assert.equal(program, null);
  assert.match(log.error, /only300\.frag: no GLSL ES 1\.00 source for webgl1/);
});

// ── ?shaderDebug=1 report ─────────────────────────────────────────────────

test("formatRenderingReport shows API, attributes, shader log, and upload cost", () => {
  const { log } = buildProgram(fakeGL(), "webgl2", { vertex: VS, fragment: FS });
  const text = formatRenderingReport({
    layers: [
      {
        label: "rain-front",
        diagnostics: {
          api: "webgl2",
          attributes: { alpha: true, antialias: false, preserveDrawingBuffer: false, powerPreference: "high-performance" },
          running: true,
          contextLost: false,
          shaderBuilds: 1,
          shaderLog: log,
          uploads: { u_waterMap: { count: 3, lastMs: 0.5, maxMs: 0.9, averageMs: 0.6 } },
          lastTexImage2D: { name: "u_waterMap", ms: 0.5 },
          drawingBuffer: { width: 960, height: 540 },
          displaySize: { width: 960, height: 540 },
        },
      },
      { label: "rain-back", diagnostics: null },
    ],
    compositing: {
      mode: "shared-context-pass",
      requested: "shared",
      frontSuspended: true,
      crossContextUploadsPerFrame: 0,
      cabinet: {
        context: { api: "webgl2", attributes: { antialias: true, preserveDrawingBuffer: false } },
        preserveDrawingBuffer: false,
        samples: 0,
      },
      shared: {
        frames: 4,
        lastMs: 0.2,
        averageMs: 0.25,
        maxMs: 0.5,
        pass: {
          shaderLog: log,
          uploads: {
            u_textureFg: { kind: "copy", count: 4, lastMs: 0.01, averageMs: 0.02 },
            u_waterMap: { kind: "texImage2D", count: 4, lastMs: 0.3, averageMs: 0.3 },
          },
        },
      },
    },
    contexts2d: [
      { label: "matrix", requested: { alpha: true, desynchronized: true }, attributes: { alpha: true, desynchronized: false } },
      null,
    ],
  });
  assert.match(text, /rain-front: webgl2 · running · builds 1/);
  assert.match(text, /attrs alpha !antialias !preserveDrawingBuffer power=high-performance/);
  assert.match(text, /vertex a\.vert GLSL 300 es: ok/);
  assert.match(text, /texImage2D last: u_waterMap 0\.50 ms/);
  assert.match(text, /u_waterMap: last 0\.50 ms avg 0\.60 ms max 0\.90 ms n=3/);
  assert.match(text, /rain-back: not created yet/);
  assert.match(text, /compositing: shared-context-pass \(requested shared\) · cross-context uploads\/frame 0 · #rain-front suspended/);
  assert.match(text, /cabinet webgl2 · preserveDrawingBuffer=false · attrs antialias !preserveDrawingBuffer/);
  assert.match(text, /shared pass: frames 4/);
  assert.match(text, /u_textureFg \(copy\): last 0\.01 ms/);
  assert.doesNotMatch(text, /fallback canvas upload/);
  assert.match(text, /matrix: alpha true desynchronized true→false/);
});
