// @ts-check
import { formatShaderLog } from "./shaderProgram.js";

/**
 * `?shaderDebug=1`: a fixed text panel reporting, per rain layer, the selected
 * API, granted context attributes, the shader compile/link log (with source
 * excerpts for errors), and texImage2D timings; plus the cabinet compositing
 * stats and the 2D context attributes that were requested vs granted.
 *
 * Driven by an AppClock task (`shader-debug`); the text refreshes at most
 * every `intervalMs`. Rendered with `textContent` only.
 */

/**
 * @typedef {object} LayerReport
 * @property {string} label
 * @property {Record<string, any> | null} diagnostics `RainLayer#getDiagnostics()`
 */

/**
 * @typedef {object} RenderingReportSources
 * @property {LayerReport[]} layers
 * @property {Record<string, any> | null} [compositing] `rainScene.getCompositingDiagnostics()`
 * @property {Array<import("./create2DContext.js").Canvas2DInfo | null>} [contexts2d]
 */

const ATTRIBUTE_FLAGS = [
  "alpha",
  "premultipliedAlpha",
  "antialias",
  "preserveDrawingBuffer",
  "desynchronized",
  "failIfMajorPerformanceCaveat",
];

/** @param {number | null | undefined} ms */
const fmtMs = (ms) => (typeof ms === "number" && Number.isFinite(ms) ? `${ms.toFixed(2)} ms` : "n/a");

/** @param {Record<string, unknown> | null | undefined} attrs */
export function formatAttributes(attrs) {
  if (!attrs) return "n/a";
  const flags = ATTRIBUTE_FLAGS.filter((name) => name in attrs).map((name) =>
    attrs[name] ? name : `!${name}`,
  );
  if (typeof attrs.powerPreference === "string") flags.push(`power=${attrs.powerPreference}`);
  return flags.join(" ");
}

/**
 * Plain-text report. Pure: safe to unit-test and to log.
 * @param {RenderingReportSources} sources
 * @returns {string}
 */
export function formatRenderingReport({ layers, compositing = null, contexts2d = [] }) {
  const out = ["RENDERING (?shaderDebug=1)"];
  for (const { label, diagnostics: d } of layers) {
    if (!d) {
      out.push(`${label}: not created yet`);
      continue;
    }
    const state = d.contextLost ? "CONTEXT LOST" : d.running ? "running" : "stopped";
    out.push(`${label}: ${d.api ?? "no context"} · ${state} · builds ${d.shaderBuilds ?? 0}`);
    out.push(`  attrs ${formatAttributes(d.attributes)}`);
    if (d.drawingBuffer) {
      out.push(
        `  buffer ${d.drawingBuffer.width}x${d.drawingBuffer.height}` +
          (d.displaySize ? ` (css ${d.displaySize.width}x${d.displaySize.height})` : ""),
      );
    }
    for (const line of formatShaderLog(d.shaderLog).split("\n")) out.push(`  ${line}`);
    const uploads = Object.entries(d.uploads ?? {});
    if (d.lastTexImage2D) {
      out.push(`  texImage2D last: ${d.lastTexImage2D.name} ${fmtMs(d.lastTexImage2D.ms)}`);
    }
    for (const [name, u] of uploads) {
      out.push(
        `    ${name}: last ${fmtMs(u.lastMs)} avg ${fmtMs(u.averageMs)} max ${fmtMs(u.maxMs)} n=${u.count}`,
      );
    }
  }
  if (compositing) {
    out.push(
      `compositing: ${compositing.mode} (requested ${compositing.requested}) · cross-context uploads/frame ${compositing.crossContextUploadsPerFrame}` +
        (compositing.frontSuspended ? " · #rain-front suspended" : ""),
    );
    const cabinet = compositing.cabinet;
    if (cabinet) {
      const ctx = cabinet.context ?? {};
      out.push(
        `  cabinet ${ctx.api ?? "n/a"} · preserveDrawingBuffer=${Boolean(cabinet.preserveDrawingBuffer)} · attrs ${formatAttributes(ctx.attributes)}`,
      );
      if (cabinet.samples) {
        out.push(
          `  fallback canvas upload last ${fmtMs(cabinet.lastUploadMs)} avg ${fmtMs(cabinet.averageUploadMs)} max ${fmtMs(cabinet.maxUploadMs)} n=${cabinet.samples}`,
        );
      }
    }
    const shared = compositing.shared;
    if (shared) {
      out.push(
        `  shared pass: frames ${shared.frames} · last ${fmtMs(shared.lastMs)} avg ${fmtMs(shared.averageMs)} max ${fmtMs(shared.maxMs)}`,
      );
      const pass = shared.pass;
      if (pass) {
        for (const line of formatShaderLog(pass.shaderLog).split("\n")) out.push(`    ${line}`);
        for (const [name, u] of Object.entries(pass.uploads ?? {})) {
          out.push(`    ${name} (${u.kind}): last ${fmtMs(u.lastMs)} avg ${fmtMs(u.averageMs)} n=${u.count}`);
        }
      }
    }
  }
  const infos = contexts2d.filter((info) => info !== null);
  if (infos.length) {
    out.push("2d contexts (requested → granted):");
    for (const info of infos) {
      const req = info.requested;
      const got = info.attributes;
      const desync = got ? `${Boolean(req.desynchronized)}→${Boolean(got.desynchronized)}` : `${Boolean(req.desynchronized)}→?`;
      out.push(
        `  ${info.label}: alpha ${req.alpha !== false} desynchronized ${desync}` +
          (req.willReadFrequently ? " willReadFrequently" : ""),
      );
    }
  }
  return out.join("\n");
}

export class ShaderDebugOverlay {
  /**
   * @param {{
   *   doc?: Document,
   *   getSources: () => RenderingReportSources,
   *   intervalMs?: number,
   * }} deps
   */
  constructor({ doc = document, getSources, intervalMs = 500 }) {
    this.doc = doc;
    this.getSources = getSources;
    this.intervalMs = intervalMs;
    this.lastUpdate = -Infinity;
    /** @type {HTMLElement | null} */
    this.el = null;
    /** @type {HTMLPreElement | null} */
    this.pre = null;
  }

  init() {
    const el = this.doc.createElement("aside");
    el.id = "shader-debug";
    el.setAttribute("aria-label", "Rendering diagnostics");
    el.style.cssText = [
      "position: fixed",
      "left: 8px",
      "bottom: 8px",
      "z-index: 2147483000",
      "max-width: min(560px, calc(100vw - 16px))",
      "max-height: 60vh",
      "overflow: auto",
      "padding: 8px 10px",
      "background: rgba(2, 10, 20, 0.88)",
      "border: 1px solid rgba(0, 229, 255, 0.35)",
      "border-radius: 6px",
      "color: #bfe9f2",
      "font: 11px/1.35 ui-monospace, 'JetBrains Mono', monospace",
      "pointer-events: auto",
      "user-select: text",
    ].join(";");
    const pre = this.doc.createElement("pre");
    pre.style.cssText = "margin:0;white-space:pre-wrap;word-break:break-word;";
    el.append(pre);
    this.doc.body.append(el);
    this.el = el;
    this.pre = pre;
    this.refresh();
    return this;
  }

  /** @param {number} t AppClock time (ms) */
  tick(t) {
    if (t - this.lastUpdate < this.intervalMs) return;
    this.lastUpdate = t;
    this.refresh();
  }

  refresh() {
    if (!this.pre) return;
    let text;
    try {
      text = formatRenderingReport(this.getSources());
    } catch (error) {
      text = `shaderDebug: report failed: ${/** @type {Error} */ (error).message}`;
    }
    if (this.pre.textContent !== text) this.pre.textContent = text;
  }

  destroy() {
    this.el?.remove();
    this.el = null;
    this.pre = null;
  }
}
