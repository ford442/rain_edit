/**
 * EchoCard — one pooled, recyclable echo document (`.echo-document`).
 *
 * The DOM skeleton and every listener are created once per pooled node; a
 * card is then *bound* to whichever TabFile EchoLayer hands it. Handlers read
 * `this.file` / `this.placement` at event time instead of closing over a file,
 * so recycling a node never leaks the previous document into its events.
 *
 * Untrusted strings (file names, languages, content) only ever reach the DOM
 * through `textContent` or the allowlisted Monaco token renderer.
 */

import { _extractSymbols, _symbolKindIcon } from "./symbols.js";
import { setColorizedHtml } from "../dom/sanitize.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const PEEK_PATHS = {
  expand: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
  collapse: "M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7",
};
const MAX_LINE_NUMBERS = 40;
const MAX_OUTLINE_ITEMS = 12;

/** One shared AudioContext for the page-turn whoosh (was one per click). */
let whooshCtx = null;

/** @param {HTMLButtonElement} btn @param {boolean} expanded */
export function setPeekIcon(btn, expanded) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", expanded ? PEEK_PATHS.collapse : PEEK_PATHS.expand);
  svg.appendChild(path);
  btn.replaceChildren(svg);
}

/** @param {string} tag @param {string} [className] @param {string} [text] */
function h(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

/** Base hue by extension, shifted 15° per depth index. */
function tintFor(name, index) {
  let base = 180; // cyan
  if (name.endsWith(".js")) base = 60;
  else if (name.endsWith(".css")) base = 200;
  else if (name.endsWith(".html") || name.endsWith(".md")) base = 320;
  return (base + index * 15) % 360;
}

function playWhoosh() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    whooshCtx ??= new Ctx();
    const ctx = whooshCtx;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    filter.type = "highpass";
    filter.frequency.value = 1000;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (err) {
    console.error("Audio playback failed:", err);
  }
}

export class EchoCard {
  /**
   * @param {import("./EchoLayer.js").EchoLayer} layer
   */
  constructor(layer) {
    this.layer = layer;
    /** @type {any} TabFile currently bound */
    this.file = null;
    this.index = 0;
    /** @type {import("./layouts/types.js").Placement | null} */
    this.placement = null;
    this.hover = "front";
    this.contentKey = "";
    this._clickTimeout = null;
    /** Undo for the peel animation of a pending click (see click handler). */
    this._clickCleanup = null;
    /** @type {HTMLDivElement} */
    this.el = h("div", "echo-document");
    this._build();
    this._bindEvents();
  }

  // ── DOM skeleton (once per pooled node) ──────────────────────────────────
  _build() {
    const el = this.el;

    const header = h("div", "echo-header");
    Object.assign(header.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      padding: "8px 16px",
      background: "rgba(0, 229, 255, 0.1)",
      borderBottom: "1px solid rgba(0, 229, 255, 0.2)",
      fontWeight: "bold",
      letterSpacing: "1px",
      textTransform: "uppercase",
      transform: "translateZ(30px)",
      boxShadow: "0 10px 20px rgba(0,0,0,0.5)",
    });
    const title = h("div", "echo-header-title");
    this.nameEl = h("span", "echo-file-name");
    this.langEl = h("span", "echo-file-lang");
    title.append(h("span", "echo-file-icon", "◈"), " ", this.nameEl, " ", this.langEl);

    this.statusEl = h("div", "echo-header-status");
    this.statusText = document.createTextNode("");
    this.statusEl.append(h("span", "echo-status-dot"), this.statusText);

    this.overlayBtn = h("button", "echo-peek-btn", "⧉");
    this.overlayBtn.title = "Holographic Overlay (Ghost Diff)";
    this.overlayBtn.style.marginRight = "8px";

    this.peekBtn = h("button", "echo-peek-btn");
    this.peekBtn.dataset.role = "peek";
    this.peekBtn.title = "Expanded Peek";
    setPeekIcon(this.peekBtn, false);

    this.focusOutlineBtn = h("button", "echo-focus-outline-btn", "⌖");
    this.focusOutlineBtn.title =
      "Focus Outline — highlight this file's symbols in the active editor";

    header.append(title, this.statusEl, this.overlayBtn, this.peekBtn, this.focusOutlineBtn);
    el.appendChild(header);
    this.header = header;

    // Symbol outline (shown only when the bound file has symbols)
    this.outlineSection = h("div", "echo-symbol-outline");
    this.outlineSection.dataset.collapsed = "false";
    this.outlineToggle = h("button", "echo-outline-toggle");
    this.outlineToggle.title = "Toggle symbol outline";
    this.outlineCount = h("span", "outline-count");
    this.outlineToggle.append(h("span", "outline-icon", "⬡"), " Symbols ", this.outlineCount);
    this.outlineList = h("ul", "echo-outline-list");
    this.outlineSection.append(this.outlineToggle, this.outlineList);
    el.appendChild(this.outlineSection);

    const body = h("div", "echo-body-wrapper");
    body.style.marginTop = "40px";
    body.style.height = "calc(100% - 40px)";
    this.lineNumbers = h("div", "echo-line-numbers");
    this.pre = h("pre");
    this.pre.draggable = true;
    this.code = h("code");
    this.pre.appendChild(this.code);
    const minimap = h("div", "echo-minimap");
    minimap.style.transform = "translateZ(30px)";
    minimap.style.boxShadow = "-10px 10px 20px rgba(0,0,0,0.5)";
    for (let i = 0; i < 35; i++) {
      const block = h("div", "minimap-block");
      block.style.width = `${20 + Math.random() * 80}%`;
      block.style.opacity = String(0.1 + Math.random() * 0.5);
      minimap.appendChild(block);
    }
    body.append(this.lineNumbers, this.pre, minimap);
    el.appendChild(body);

    this.scanLine = h("div", "scan-line");
    el.append(
      this.scanLine,
      h("div", "semantic-sync-laser"),
      h("div", "hex-overlay"),
      h("div", "light-leak"),
      h("div", "echo-document-holo-ring"),
      h("div", "magnetic-edge"),
      h("div", "edge-bleed-layer"),
      h("div", "volumetric-spotlight"),
    );
  }

  // ── Binding (every sync) ─────────────────────────────────────────────────
  /**
   * Bind this node to a document. Resets classes/inline style first so the
   * node is as clean as a freshly built one (interaction state never leaks
   * across documents or re-renders).
   * @param {object} args
   */
  bind({ file, index, placement, overlay, behavior, activeFile, rich }) {
    this.file = file;
    this.index = index;
    this.placement = placement;
    this.hover = behavior.hover;

    const el = this.el;
    el.className = "echo-document";
    el.removeAttribute("style");
    el.dataset.id = String(file.id);
    el.dataset.index = String(index);
    el.dataset.depth = String(file.depth ?? 0);

    const tint = behavior.tint ?? tintFor(file.name, index);
    el.style.setProperty("--echo-tint", `${tint}deg`);

    const activeExt = activeFile ? activeFile.name.split(".").pop() : "";
    const activeLang = activeFile ? activeFile.language : "";
    if (
      behavior.semanticGravity &&
      (file.name.split(".").pop() === activeExt || file.language === activeLang)
    ) {
      el.classList.add("semantic-gravity-pull");
    }

    el.style.setProperty("--parallax-factor", String(Math.max(0.05, 0.3 - index * 0.08)));
    el.style.setProperty("--base-opacity", String(Math.max(0.15, 0.7 - index * 0.2)));
    el.style.setProperty("--base-blur", `${Math.min(15, 3 + index * 3)}px`);
    this.scanLine.style.setProperty("--index", String(index));
    if (index === 0) el.classList.add("echo-recent");
    if (index >= 2) el.classList.add("depth-aware-glitch");
    if (behavior.isDefaultLayout && index > 2) el.classList.add("distant-echo");

    for (const [k, v] of Object.entries(overlay)) el.style.setProperty(k, v);
    this.layer.applyPlacement(el, placement);

    const tz = typeof placement.tz === "number" ? placement.tz : 0;
    el.style.setProperty("--tz-val", String(tz));
    if (tz < -100) el.classList.add("depth-desaturate");

    // Header text: textContent only — names come from remote/VPS/cabinet.
    this.nameEl.textContent = file.name;
    this.langEl.textContent = file.language || "text";
    this.statusText.data = `0x${((Math.imul(file.id, 2654435761) >>> 8) & 0xffffff)
      .toString(16)
      .padStart(6, "0")
      .toUpperCase()}`;

    setPeekIcon(this.peekBtn, false);
    this._renderBody(file, rich);
  }

  /** @param {any} file @param {boolean} rich */
  _renderBody(file, rich) {
    const info = this.layer.documentInfo(file);

    // Line numbers
    const want = file.isImage ? 1 : Math.min(MAX_LINE_NUMBERS, info.lineCount);
    if (this.lineNumbers.childElementCount !== want) {
      const frag = document.createDocumentFragment();
      for (let i = 1; i <= want; i++) frag.appendChild(h("span", null, String(i)));
      this.lineNumbers.replaceChildren(frag);
    }

    // Symbol outline
    const symbols = info.symbols;
    if (symbols.length > 0) {
      this.outlineSection.hidden = false;
      this.outlineSection.dataset.collapsed = "false";
      this.outlineCount.textContent = `(${symbols.length})`;
      const frag = document.createDocumentFragment();
      for (const sym of symbols.slice(0, MAX_OUTLINE_ITEMS)) {
        const item = h("li", `echo-outline-item outline-kind-${sym.kind}`);
        item.title = `${sym.kind}: ${sym.name} (line ${sym.line})`;
        item.append(
          h("span", "outline-kind-icon", _symbolKindIcon(sym.kind)),
          h("span", "outline-sym-name", sym.name),
          h("span", "outline-line", `:${sym.line}`),
        );
        frag.appendChild(item);
      }
      this.outlineList.replaceChildren(frag);
    } else {
      this.outlineSection.hidden = true;
      this.outlineList.replaceChildren();
    }

    // Content: plain text first; only the nearest `rich` cards colorize.
    const key = `${file.id}:${info.version}:${rich ? "rich" : "text"}`;
    if (key === this.contentKey) return;
    this.contentKey = key;
    this.code.textContent = info.snippet;
    if (!rich || file.isImage) return;
    this.layer.colorize(file, info).then((html) => {
      if (html != null && this.contentKey === key) setColorizedHtml(this.code, html);
    });
  }

  unbind() {
    // A pending peel-click keeps its captured file id and still activates it.
    this.file = null;
    this.placement = null;
    this.contentKey = "";
  }

  _cancelPendingClick() {
    if (this._clickTimeout) {
      clearTimeout(this._clickTimeout);
      this._clickTimeout = null;
    }
    // Always undo the peel visuals (a dblclick used to leave the editor stuck
    // in .peel-away).
    this._clickCleanup?.();
    this._clickCleanup = null;
  }

  // ── Events (once per pooled node) ────────────────────────────────────────
  _bindEvents() {
    const el = this.el;
    const host = () => this.layer.host;
    const root = () => this.layer.root;
    const docs = () => root().querySelectorAll(".echo-document");
    const peekAt = (detail) =>
      document.dispatchEvent(new CustomEvent("echo-peek", { detail }));

    this.overlayBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      el.classList.toggle("hologram-overlay-active");
    });

    this.focusOutlineBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasOn = el.classList.contains("outline-focus-active");
      docs().forEach((d) => d.classList.remove("outline-focus-active"));
      if (wasOn) return;
      el.classList.add("outline-focus-active");
      const file = this.file;
      const editor = host().editor;
      if (!file || !editor || file.isImage) return;
      const symbols = this.layer.documentInfo(file).symbols;
      const activeModel = editor.getModel?.();
      if (!symbols.length || !activeModel || !editor.revealLineInCenter) return;
      const first = symbols[0].name;
      const escaped = first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matchIdx = activeModel.getValue().search(new RegExp(`\\b${escaped}\\b`));
      if (matchIdx === -1) return;
      const pos = activeModel.getPositionAt(matchIdx);
      editor.revealLineInCenter(pos.lineNumber);
      editor.setSelection({
        startLineNumber: pos.lineNumber,
        startColumn: pos.column,
        endLineNumber: pos.lineNumber,
        endColumn: pos.column + first.length,
      });
    });

    this.peekBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const editorEl = host().editorEl;
      if (el.classList.contains("is-peeking")) {
        el.classList.remove("is-peeking");
        setPeekIcon(this.peekBtn, false);
        editorEl?.classList.remove("editor-peek-fade");
        return;
      }
      root()
        .querySelectorAll(".is-peeking")
        .forEach((d) => {
          d.classList.remove("is-peeking");
          const other = d.querySelector('[data-role="peek"]');
          if (other) setPeekIcon(/** @type {HTMLButtonElement} */ (other), false);
        });
      el.classList.add("is-peeking");
      setPeekIcon(this.peekBtn, true);
      editorEl?.classList.add("editor-peek-fade");
      peekAt({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    });

    this.outlineToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const collapsed = this.outlineSection.dataset.collapsed === "true";
      this.outlineSection.dataset.collapsed = collapsed ? "false" : "true";
    });

    // Holographic Siphon: drag code out of an echo
    this.pre.addEventListener("dragstart", (e) => {
      if (!document.body.classList.contains("siphon-mode-active")) {
        e.preventDefault();
        return;
      }
      let text = window.getSelection()?.toString() || "";
      if (!text) text = this.code.textContent.substring(0, 500);
      e.dataTransfer.setData("text/plain", text);
      e.dataTransfer.effectAllowed = "copy";
      const dragImg = h("div", null, text.length > 20 ? text.substring(0, 20) + "..." : text);
      Object.assign(dragImg.style, {
        position: "absolute",
        top: "-1000px",
        color: "#00e5ff",
        background: "rgba(0, 0, 0, 0.8)",
        padding: "8px",
        border: "1px solid #00e5ff",
      });
      document.body.appendChild(dragImg);
      e.dataTransfer.setDragImage(dragImg, 0, 0);
      setTimeout(() => dragImg.remove(), 100);
    });

    // Ghost Scroll: scroll an echo without bringing it forward
    this.pre.addEventListener("wheel", (e) => {
      e.stopPropagation();
      peekAt({ x: e.clientX, y: e.clientY });
    });

    el.addEventListener("mouseenter", () => {
      el.classList.add("glitch-active");
      setTimeout(() => el.classList.remove("glitch-active"), 300);
    });

    // Double click: echo pulse ripple + breakthrough
    el.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      this._cancelPendingClick();
      el.classList.add("echo-pulse");
      setTimeout(() => el.classList.remove("echo-pulse"), 1500);
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      docs().forEach((d) => {
        if (d === el) return;
        const r = d.getBoundingClientRect();
        const dist = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
        setTimeout(() => {
          d.classList.add("echo-pulse");
          setTimeout(() => d.classList.remove("echo-pulse"), 1500);
        }, dist * 0.5);
      });
      const wasBreakthrough = el.classList.contains("breakthrough");
      docs().forEach((d) => d.classList.remove("breakthrough"));
      if (!wasBreakthrough) el.classList.add("breakthrough");
    });

    // Right click: holographic side-by-side projection
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wasProjected = el.classList.contains("holo-projected");
      docs().forEach((d) => d.classList.remove("holo-projected"));
      if (!wasProjected) el.classList.add("holo-projected");
    });

    // Click: switch to this document (after the page-peel animation)
    el.addEventListener("click", (e) => {
      if (e.shiftKey) {
        e.stopPropagation();
        el.classList.toggle("magnetic-align-active");
        return;
      }
      if (e.detail !== 1 || !this.file) return;
      const fileId = this.file.id;
      const tm = host();
      if (tm.viewMode === "tesseract") {
        const select = document.getElementById("view-mode-select");
        if (select) select.value = "";
        tm._deactivateAllViews();
        tm.setActive(fileId);
        return;
      }
      playWhoosh();
      el.classList.add("peel-target", "kaleidoscope-fx");
      const editorEl = tm.editorEl;
      editorEl?.classList.add("peel-away");
      const peeled = [];
      docs().forEach((d) => {
        const i = parseInt(/** @type {HTMLElement} */ (d).dataset.index ?? "", 10);
        if (!isNaN(i) && i < this.index) {
          d.classList.add("peel-away");
          peeled.push(d);
        }
      });
      this._cancelPendingClick();
      this._clickCleanup = () => {
        el.classList.remove("kaleidoscope-fx", "peel-target");
        editorEl?.classList.remove("peel-away");
        peeled.forEach((d) => d.classList.remove("peel-away"));
      };
      this._clickTimeout = setTimeout(() => {
        this._clickTimeout = null;
        this._clickCleanup?.();
        this._clickCleanup = null;
        tm.setActive(fileId);
      }, 800);
    });

    // Interactive 3D card tilt + glossy reflection
    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const normX = (localX - rect.width / 2) / (rect.width / 2);
      const normY = (localY - rect.height / 2) / (rect.height / 2);
      el.style.setProperty("--hover-rot-x", `${-normY * 15}deg`);
      el.style.setProperty("--hover-rot-y", `${normX * 15}deg`);
      el.style.setProperty("--mouse-local-x", `${(localX / rect.width) * 100}%`);
      el.style.setProperty("--mouse-local-y", `${(localY / rect.height) * 100}%`);
    });

    el.addEventListener("mouseenter", () => {
      const editorEl = host().editorEl;
      if (!editorEl) return;
      editorEl.classList.add("editor-peek-fade");
      this._applyHover();
      const rect = el.getBoundingClientRect();
      peekAt({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        radius: Math.max(rect.width, rect.height) / 1.5,
        isFocusSpotlight: true,
      });
    });

    el.addEventListener("mouseleave", () => {
      el.style.setProperty("--hover-rot-x", "0deg");
      el.style.setProperty("--hover-rot-y", "0deg");
      const editorEl = host().editorEl;
      if (!editorEl) return;
      editorEl.classList.remove("editor-peek-fade");
      // Restore exactly what the layout placed (the old per-view restore
      // chain re-derived tz by hand and drifted from several layouts).
      if (this.placement) this.layer.applyPlacement(el, this.placement);
    });

    // Depth Parting (the Moses effect): nearby siblings slide away
    el.addEventListener("mouseenter", () => {
      const hr = el.getBoundingClientRect();
      const hcx = hr.left + hr.width / 2;
      const hcy = hr.top + hr.height / 2;
      docs().forEach((sib) => {
        if (sib === el) return;
        const r = sib.getBoundingClientRect();
        const dx = r.left + r.width / 2 - hcx;
        const dy = r.top + r.height / 2 - hcy;
        const dist = Math.hypot(dx, dy);
        if (dist < 600 && dist > 0) {
          const push = ((600 - dist) / 600) * 150;
          const s = /** @type {HTMLElement} */ (sib).style;
          s.setProperty("--part-tx", `${(dx / dist) * push}px`);
          s.setProperty("--part-ty", `${(dy / dist) * push}px`);
        }
      });
    });
    el.addEventListener("mouseleave", () => {
      docs().forEach((sib) => {
        if (sib === el) return;
        const s = /** @type {HTMLElement} */ (sib).style;
        s.setProperty("--part-tx", "0px");
        s.setProperty("--part-ty", "0px");
      });
    });
  }

  /** Bring the hovered echo forward according to the view's hover rule. */
  _applyHover() {
    const el = this.el;
    const p = this.placement || {};
    const num = (v) => parseFloat(String(v ?? "0")) || 0;
    switch (this.hover) {
      case "none":
        return;
      case "orbit":
        el.style.setProperty("--orbit-tz", `${num(p.vars?.["--orbit-tz"]) + 100}px`);
        return;
      case "scatter":
        el.style.setProperty("--scatter-z", `${num(p.vars?.["--scatter-z"]) + 150}px`);
        return;
      case "flatten":
        el.style.setProperty("--rot-z", "0deg");
      // falls through
      case "pop":
        el.style.setProperty("--tz", `${(typeof p.tz === "number" ? p.tz : 0) + 150}px`);
        return;
      default:
        el.style.setProperty("--tz", "100px");
    }
  }
}
