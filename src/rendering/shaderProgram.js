// @ts-check
/**
 * Shader-variant selection and program building with structured compile logs.
 *
 * WebGL2 compiles the authored GLSL ES 3.00 source; WebGL1 compiles the
 * GLSL ES 1.00 copy. Sources are never rewritten. Compile and link failures
 * do not throw: `buildProgram` returns `program: null` plus a `ShaderLog`
 * that `RainLayer#getDiagnostics().shaderLog` and the `?shaderDebug=1`
 * overlay surface, with each error mapped back to its source line.
 */

/** @typedef {import("./createGLContext.js").GLContext} GLContext */
/** @typedef {'webgl2' | 'webgl1'} GLApi */
/** @typedef {'300 es' | '100'} GLSLVersion */

/**
 * One program stage. `es300` is compiled on WebGL2, `es100` on WebGL1 (and on
 * WebGL2 only when no `es300` is provided).
 * @typedef {object} ShaderSource
 * @property {string} name File label used in logs (e.g. "water.frag").
 * @property {string} [es300]
 * @property {string} [es100]
 */

/** @typedef {string | ShaderSource} ShaderInput */

/**
 * @typedef {object} ShaderLogLine
 * @property {'error' | 'warning'} severity
 * @property {number | null} line 1-based line in the compiled source.
 * @property {string} message
 * @property {string} excerpt The source text on `line` (trimmed), or "".
 */

/**
 * @typedef {object} ShaderStageLog
 * @property {'vertex' | 'fragment'} stage
 * @property {string} name
 * @property {GLSLVersion} version The version actually compiled.
 * @property {boolean} ok
 * @property {string} log Raw driver info log ("" when clean).
 * @property {ShaderLogLine[]} messages
 * @property {number} compileMs
 */

/**
 * @typedef {object} ShaderLog
 * @property {'ok' | 'error'} status
 * @property {GLApi} api
 * @property {ShaderStageLog | null} vertex
 * @property {ShaderStageLog | null} fragment
 * @property {{ ok: boolean, log: string, linkMs: number } | null} link
 * @property {string | null} error One-line summary when status is "error".
 * @property {number} totalMs
 */

const now = () => globalThis.performance?.now?.() ?? Date.now();

/**
 * The GLSL version a source declares. `#version 300 es` must be the very
 * first token; anything else compiles as GLSL ES 1.00.
 * @param {string} source
 * @returns {GLSLVersion}
 */
export function glslVersionOf(source) {
  return /^#version\s+300\s+es\b/.test(source) ? "300 es" : "100";
}

/**
 * Pick the source to compile for `api`.
 * @param {ShaderInput} input
 * @param {GLApi} api
 * @returns {{ name: string, source: string, version: GLSLVersion }}
 */
export function selectShaderSource(input, api) {
  const entry =
    typeof input === "string" ? { name: "inline", es300: input, es100: input } : input;
  const candidate = api === "webgl2" ? entry.es300 ?? entry.es100 : entry.es100;
  if (typeof candidate !== "string" || candidate.length === 0) {
    throw new Error(
      `${entry.name}: no ${api === "webgl2" ? "GLSL" : "GLSL ES 1.00"} source for ${api}`,
    );
  }
  const version = glslVersionOf(candidate);
  if (version === "300 es" && api === "webgl1") {
    throw new Error(`${entry.name}: GLSL ES 3.00 source cannot compile on WebGL1`);
  }
  return { name: entry.name, source: candidate, version };
}

/**
 * Parse a driver info log into structured lines. Handles the ANGLE/Chrome/
 * Safari form (`ERROR: 0:12: 'x' : undeclared identifier`) and the Mesa form
 * (`0:12(5): error: ...`). Unrecognised lines are kept with `line: null`.
 * @param {string} log
 * @param {string} [source]
 * @returns {ShaderLogLine[]}
 */
export function parseShaderInfoLog(log, source = "") {
  const sourceLines = source.split("\n");
  /** @type {ShaderLogLine[]} */
  const out = [];
  for (const raw of String(log || "").split("\n")) {
    const text = raw.trim();
    if (!text || text === "\0") continue;
    const angle = /^(ERROR|WARNING):\s*\d+:(\d+):\s*(.*)$/i.exec(text);
    const mesa = /^\d+:(\d+)\(\d+\):\s*(error|warning):\s*(.*)$/i.exec(text);
    /** @type {number | null} */
    let line = null;
    /** @type {'error' | 'warning'} */
    let severity = "error";
    let message = text;
    if (angle) {
      severity = angle[1].toLowerCase() === "warning" ? "warning" : "error";
      line = Number(angle[2]);
      message = angle[3];
    } else if (mesa) {
      severity = mesa[2].toLowerCase() === "warning" ? "warning" : "error";
      line = Number(mesa[1]);
      message = mesa[3];
    }
    const excerpt = line && line > 0 ? (sourceLines[line - 1] ?? "").trim() : "";
    out.push({ severity, line, message, excerpt });
  }
  return out;
}

/**
 * @param {GLContext} gl
 * @param {'vertex' | 'fragment'} stage
 * @param {{ name: string, source: string, version: GLSLVersion }} selected
 * @returns {{ shader: WebGLShader | null, log: ShaderStageLog }}
 */
function compileStage(gl, stage, selected) {
  const start = now();
  const shader = gl.createShader(stage === "vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
  /** @type {ShaderStageLog} */
  const log = {
    stage,
    name: selected.name,
    version: selected.version,
    ok: false,
    log: "",
    messages: [],
    compileMs: 0,
  };
  if (!shader) {
    log.log = "createShader returned null (context lost?)";
    log.messages = [{ severity: "error", line: null, message: log.log, excerpt: "" }];
    return { shader: null, log };
  }
  gl.shaderSource(shader, selected.source);
  gl.compileShader(shader);
  log.ok = Boolean(gl.getShaderParameter(shader, gl.COMPILE_STATUS));
  log.compileMs = now() - start;
  log.log = (gl.getShaderInfoLog(shader) || "").trim();
  log.messages = parseShaderInfoLog(log.log, selected.source);
  if (!log.ok) {
    gl.deleteShader(shader);
    return { shader: null, log };
  }
  return { shader, log };
}

/**
 * Compile and link a program. Never throws for GLSL errors; inspect
 * `log.status`. Attribute locations are bound before linking.
 *
 * @param {GLContext} gl
 * @param {GLApi} api
 * @param {{ vertex: ShaderInput, fragment: ShaderInput, attribLocations?: Record<string, number> }} sources
 * @returns {{ program: WebGLProgram | null, log: ShaderLog }}
 */
export function buildProgram(gl, api, { vertex, fragment, attribLocations = { a_position: 0 } }) {
  const start = now();
  /** @type {ShaderLog} */
  const result = {
    status: "error",
    api,
    vertex: null,
    fragment: null,
    link: null,
    error: null,
    totalMs: 0,
  };
  const finish = (/** @type {WebGLProgram | null} */ program, /** @type {string | null} */ error) => {
    result.status = program ? "ok" : "error";
    result.error = error;
    result.totalMs = now() - start;
    return { program, log: result };
  };

  let vs;
  let fs;
  try {
    vs = selectShaderSource(vertex, api);
    fs = selectShaderSource(fragment, api);
  } catch (error) {
    return finish(null, /** @type {Error} */ (error).message);
  }

  const v = compileStage(gl, "vertex", vs);
  result.vertex = v.log;
  const f = compileStage(gl, "fragment", fs);
  result.fragment = f.log;
  if (!v.shader || !f.shader) {
    if (v.shader) gl.deleteShader(v.shader);
    if (f.shader) gl.deleteShader(f.shader);
    const failed = !v.shader ? v.log : f.log;
    const first = failed.messages.find((m) => m.severity === "error") ?? failed.messages[0];
    const where = first?.line ? `:${first.line}` : "";
    return finish(
      null,
      `${api} ${failed.stage} shader ${failed.name}${where} (GLSL ${failed.version}): ${first?.message ?? "compile failed"}`,
    );
  }

  const linkStart = now();
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(v.shader);
    gl.deleteShader(f.shader);
    return finish(null, "createProgram returned null (context lost?)");
  }
  gl.attachShader(program, v.shader);
  gl.attachShader(program, f.shader);
  for (const [name, location] of Object.entries(attribLocations)) {
    gl.bindAttribLocation(program, location, name);
  }
  gl.linkProgram(program);
  gl.deleteShader(v.shader);
  gl.deleteShader(f.shader);
  const linked = Boolean(gl.getProgramParameter(program, gl.LINK_STATUS));
  result.link = {
    ok: linked,
    log: (gl.getProgramInfoLog(program) || "").trim(),
    linkMs: now() - linkStart,
  };
  if (!linked) {
    gl.deleteProgram(program);
    return finish(null, `${api} program link error (${vs.name} + ${fs.name}): ${result.link.log}`);
  }
  return finish(program, null);
}

/**
 * Human-readable multi-line rendering of a ShaderLog (console + overlay).
 * @param {ShaderLog | null | undefined} log
 * @returns {string}
 */
export function formatShaderLog(log) {
  if (!log) return "shaders: not built";
  const lines = [`shaders: ${log.status} on ${log.api} in ${log.totalMs.toFixed(1)} ms`];
  for (const stage of [log.vertex, log.fragment]) {
    if (!stage) continue;
    lines.push(
      `  ${stage.stage} ${stage.name} GLSL ${stage.version}: ${stage.ok ? "ok" : "FAILED"} (${stage.compileMs.toFixed(1)} ms)`,
    );
    for (const m of stage.messages) {
      const at = m.line ? `L${m.line}` : "--";
      lines.push(`    ${m.severity} ${at}: ${m.message}`);
      if (m.excerpt) lines.push(`      | ${m.excerpt}`);
    }
  }
  if (log.link) {
    lines.push(`  link: ${log.link.ok ? "ok" : "FAILED"} (${log.link.linkMs.toFixed(1)} ms)`);
    if (log.link.log) lines.push(`    ${log.link.log}`);
  }
  if (log.error && !log.vertex) lines.push(`  ${log.error}`);
  return lines.join("\n");
}
