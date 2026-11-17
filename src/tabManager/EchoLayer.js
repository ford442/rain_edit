// @ts-check
/**
 * EchoLayer — virtualized background echoes for inactive documents.
 *
 * Opening N files used to mount N-1 full echo documents (header, outline,
 * line numbers, colorized code, minimap, 60px backdrop blur each). EchoLayer
 * instead keeps:
 *
 *   - a pool of at most `poolSize` (default 12) `.echo-document` cards, bound
 *     to the most recently used inactive files and recycled across renders;
 *   - Monaco colorization for only the nearest `richCount` (default 8) cards,
 *     cached per model version and rendered as DOM tokens (never innerHTML);
 *   - transform-only `.echo-stub` nodes (title + depth) for the rest, capped at
 *     `stubLimit`. Stubs are not `.echo-document`, so the many per-mousemove
 *     `querySelectorAll(".echo-document")` interactions skip them.
 *
 * Positions come from the pure layout registry (./layouts/index.js).
 */

import { EchoCard } from "./echoCard.js";
import { _extractSymbols } from "./symbols.js";
import { DEPTH_ICONS, DEPTH_TITLES } from "./constants.js";
import { echoBehavior } from "./viewModes.js";
import {
  defaultLayout,
  layoutFor,
  layoutInput,
  overlayVars,
  placementToVars,
} from "./layouts/index.js";

/** @typedef {import("./layouts/types.js").Placement} Placement */
/** @typedef {import("./layouts/types.js").Viewport} Viewport */

/**
 * The slice of a TabFile EchoLayer reads.
 * @typedef {object} EchoFile
 * @property {number} id
 * @property {string} name
 * @property {string} language
 * @property {number} [depth]
 * @property {boolean} [isImage]
 * @property {{ getValue(): string, getLineCount?(): number, getVersionId?(): number } | null} [model]
 */

/**
 * What cards/stubs need from their owner (TabManager).
 * @typedef {object} EchoHost
 * @property {{ editor: { colorize(text: string, language: string, options: object): Promise<string> } }} monaco
 * @property {string} viewMode
 * @property {(id: number) => void} setActive
 * @property {() => void} _deactivateAllViews
 * @property {any} editor
 * @property {HTMLElement | null} editorEl
 */

/**
 * @typedef {object} DocumentInfo
 * @property {number} version
 * @property {number} lineCount
 * @property {string} snippet     first 1000 chars (or an image placeholder)
 * @property {{ name: string, kind: string, line: number }[]} symbols
 */

/** @typedef {"rich" | "card" | "stub" | "hidden"} EchoTier */

export const ECHO_POOL_SIZE = 12;
export const ECHO_RICH_COUNT = 8;
export const ECHO_STUB_LIMIT = 48;
const SNIPPET_CHARS = 1000;
const MAX_LINES_FALLBACK = 40;

/**
 * Decide how each inactive document (by recency index) is rendered. Pure.
 * @param {number} count
 * @param {{ poolSize?: number, richCount?: number, stubLimit?: number }} [budget]
 * @returns {EchoTier[]}
 */
export function planEchoes(count, budget = {}) {
  const poolSize = budget.poolSize ?? ECHO_POOL_SIZE;
  const richCount = Math.min(budget.richCount ?? ECHO_RICH_COUNT, poolSize);
  const stubLimit = budget.stubLimit ?? ECHO_STUB_LIMIT;
  /** @type {EchoTier[]} */
  const plan = [];
  for (let i = 0; i < count; i++) {
    if (i < richCount) plan.push("rich");
    else if (i < poolSize) plan.push("card");
    else if (i < poolSize + stubLimit) plan.push("stub");
    else plan.push("hidden");
  }
  return plan;
}

/** Transform-only placeholder for a far document. */
class EchoStub {
  /** @param {EchoLayer} layer */
  constructor(layer) {
    this.layer = layer;
    /** @type {number | null} */
    this.fileId = null;
    /** @type {Placement | null} */
    this.placement = null;
    this.el = document.createElement("div");
    this.el.className = "echo-stub";
    this.badge = document.createElement("span");
    this.badge.className = "echo-stub-depth";
    this.nameEl = document.createElement("span");
    this.nameEl.className = "echo-stub-name";
    this.el.append(this.badge, this.nameEl);
    this.el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.fileId != null) this.layer.host.setActive(this.fileId);
    });
  }

  /**
   * @param {EchoFile} file
   * @param {number} index
   * @param {Placement} placement
   */
  bind(file, index, placement) {
    this.fileId = file.id;
    this.placement = placement;
    const el = this.el;
    el.removeAttribute("style");
    el.dataset.id = String(file.id);
    el.dataset.index = String(index);
    const depth = file.depth ?? 0;
    el.dataset.depth = String(depth);
    el.title = `${file.name} — ${DEPTH_TITLES[depth] ?? ""}`;
    this.badge.textContent = DEPTH_ICONS[depth] ?? "";
    this.nameEl.textContent = file.name;
    this.layer.applyPlacement(el, placement);
  }
}

export class EchoLayer {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.root            #echo-layer
   * @param {EchoHost} opts.host
   * @param {number} [opts.poolSize]
   * @param {number} [opts.richCount]
   * @param {number} [opts.stubLimit]
   * @param {() => Viewport} [opts.viewport]
   * @param {() => number} [opts.scroll]       archway scroll offset
   */
  constructor({
    root,
    host,
    poolSize = ECHO_POOL_SIZE,
    richCount = ECHO_RICH_COUNT,
    stubLimit = ECHO_STUB_LIMIT,
    viewport = () => ({ width: window.innerWidth, height: window.innerHeight }),
    scroll = () => 0,
  }) {
    this.root = root;
    this.host = host;
    this.budget = { poolSize, richCount, stubLimit };
    this._viewport = viewport;
    this._scroll = scroll;
    /** @type {EchoCard[]} cards not currently mounted */
    this._freeCards = [];
    /** @type {Map<number, EchoCard>} fileId → mounted card */
    this._cards = new Map();
    /** @type {EchoStub[]} */
    this._freeStubs = [];
    /** @type {Map<number, EchoStub>} */
    this._stubs = new Map();
    /** @type {WeakSet<Element>} nodes this layer owns */
    this._owned = new WeakSet();
    /** @type {Map<number, DocumentInfo>} */
    this._info = new Map();
    /** @type {Map<number, { version: number, language: string, html: Promise<string | null> }>} */
    this._colorized = new Map();
    /** @type {{ files: EchoFile[], activeFile: EchoFile | null, viewMode: string }} */
    this._last = { files: [], activeFile: null, viewMode: "" };
  }

  /**
   * Re-bind every echo to the current inactive files (most recent first).
   * @param {{ files: EchoFile[], activeFile: EchoFile | null, viewMode: string }} state
   */
  sync({ files, activeFile, viewMode }) {
    this._last = { files, activeFile, viewMode };
    const plan = planEchoes(files.length, this.budget);
    const layout = layoutFor(viewMode);
    const behavior = {
      ...echoBehavior(viewMode),
      isDefaultLayout: layout === defaultLayout,
    };
    const viewport = this._viewport();
    const scroll = this._scroll();
    const count = files.length;

    /** @type {Map<number, EchoCard>} */
    const nextCards = new Map();
    /** @type {Map<number, EchoStub>} */
    const nextStubs = new Map();
    /** @type {Element[]} */
    const order = [];

    // Reuse a file's previous card when it stays in card range.
    for (let i = 0; i < count; i++) {
      const tier = plan[i];
      const id = files[i].id;
      if ((tier === "rich" || tier === "card") && this._cards.has(id)) {
        nextCards.set(id, /** @type {EchoCard} */ (this._cards.get(id)));
        this._cards.delete(id);
      } else if (tier === "stub" && this._stubs.has(id)) {
        nextStubs.set(id, /** @type {EchoStub} */ (this._stubs.get(id)));
        this._stubs.delete(id);
      }
    }
    for (const card of this._cards.values()) this._releaseCard(card);
    for (const stub of this._stubs.values()) this._releaseStub(stub);

    for (let i = 0; i < count; i++) {
      const tier = plan[i];
      if (tier === "hidden") break;
      const file = files[i];
      const input = layoutInput({ index: i, count, viewport, file, scroll });
      const placement = layout(input);
      if (tier === "stub") {
        const stub = nextStubs.get(file.id) ?? this._takeStub();
        nextStubs.set(file.id, stub);
        stub.bind(file, i, placement);
        order.push(stub.el);
        continue;
      }
      const card = nextCards.get(file.id) ?? this._takeCard();
      nextCards.set(file.id, card);
      card.bind({
        file,
        index: i,
        placement,
        overlay: overlayVars(input),
        behavior,
        activeFile,
        rich: tier === "rich",
      });
      order.push(card.el);
    }

    this._cards = nextCards;
    this._stubs = nextStubs;
    this._mountInOrder(order);
  }

  /**
   * Recompute placements without rebinding content (archway scroll, resize).
   */
  relayout() {
    const { files, viewMode } = this._last;
    const layout = layoutFor(viewMode);
    const viewport = this._viewport();
    const scroll = this._scroll();
    const count = files.length;
    files.forEach((file, index) => {
      const node = this._cards.get(file.id) ?? this._stubs.get(file.id);
      if (!node) return;
      const input = layoutInput({ index, count, viewport, file, scroll });
      node.placement = layout(input);
      this.applyPlacement(node.el, node.placement);
    });
  }

  /** Re-run the last sync (e.g. after a budget change). */
  refresh() {
    this.sync(this._last);
  }

  /**
   * Write a placement's CSS onto an echo or stub element.
   * @param {HTMLElement} el
   * @param {Placement} placement
   */
  applyPlacement(el, placement) {
    const vars = placementToVars(placement);
    for (const k in vars) el.style.setProperty(k, vars[k]);
    if (typeof placement.opacity === "number") el.style.opacity = String(placement.opacity);
    if (placement.transform) el.style.transform = placement.transform;
  }

  /**
   * The mounted `.echo-document` for a file, if it has a full card.
   * @param {number} fileId
   * @returns {HTMLElement | null}
   */
  cardElement(fileId) {
    return this._cards.get(fileId)?.el ?? null;
  }

  /**
   * Put a file's echo back where its layout placed it.
   * @param {number} fileId
   */
  restorePlacement(fileId) {
    const node = this._cards.get(fileId) ?? this._stubs.get(fileId);
    if (node?.placement) this.applyPlacement(node.el, node.placement);
  }

  /**
   * Drop caches for a closed document.
   * @param {number} fileId
   */
  forget(fileId) {
    this._info.delete(fileId);
    this._colorized.delete(fileId);
  }

  /**
   * Cached per-version facts about a document (snippet, symbols, line count).
   * @param {EchoFile} file
   * @returns {DocumentInfo}
   */
  documentInfo(file) {
    const model = file.isImage ? null : file.model;
    const version = model?.getVersionId?.() ?? 0;
    const cached = this._info.get(file.id);
    if (cached && cached.version === version) return cached;
    /** @type {DocumentInfo} */
    let info;
    if (!model) {
      info = { version, lineCount: 1, snippet: `[IMAGE: ${file.name}]`, symbols: [] };
    } else {
      const text = model.getValue();
      info = {
        version,
        lineCount: model.getLineCount ? model.getLineCount() : MAX_LINES_FALLBACK,
        snippet: text.substring(0, SNIPPET_CHARS),
        symbols: _extractSymbols(text),
      };
    }
    this._info.set(file.id, info);
    return info;
  }

  /**
   * Monaco-colorized HTML for a document's snippet, cached per model version.
   * The string is only ever rendered through the token allowlist
   * (`setColorizedHtml`), never assigned to innerHTML.
   * @param {EchoFile} file
   * @param {DocumentInfo} info
   * @returns {Promise<string | null>}
   */
  colorize(file, info) {
    const language = file.language || "javascript";
    const cached = this._colorized.get(file.id);
    if (cached && cached.version === info.version && cached.language === language) {
      return cached.html;
    }
    const html = Promise.resolve()
      .then(() => this.host.monaco.editor.colorize(info.snippet, language, {}))
      .catch((err) => {
        console.warn("Failed to colorize background document:", err);
        return null;
      });
    this._colorized.set(file.id, { version: info.version, language, html });
    return html;
  }

  /** @returns {{ cards: number, richCards: number, stubs: number, pooled: number, cachedDocs: number, poolSize: number, richCount: number, stubLimit: number }} */
  getDiagnostics() {
    let richCards = 0;
    for (const card of this._cards.values()) if (card.contentKey.endsWith(":rich")) richCards++;
    return {
      cards: this._cards.size,
      richCards,
      stubs: this._stubs.size,
      pooled: this._cards.size + this._freeCards.length,
      cachedDocs: this._info.size,
      ...this.budget,
    };
  }

  // ── pool plumbing ────────────────────────────────────────────────────────

  /** @returns {EchoCard} */
  _takeCard() {
    const card = this._freeCards.pop() ?? new EchoCard(this);
    this._owned.add(card.el);
    return card;
  }

  /** @param {EchoCard} card */
  _releaseCard(card) {
    card.unbind();
    card.el.remove();
    // Cards are only created when the free list is empty, so mounted + free
    // never exceeds poolSize: keeping every released card is bounded.
    this._freeCards.push(card);
  }

  /** @returns {EchoStub} */
  _takeStub() {
    const stub = this._freeStubs.pop() ?? new EchoStub(this);
    this._owned.add(stub.el);
    return stub;
  }

  /** @param {EchoStub} stub */
  _releaseStub(stub) {
    stub.fileId = null;
    stub.placement = null;
    stub.el.remove();
    this._freeStubs.push(stub);
  }

  /**
   * Make the layer's owned children match `order` (recency order), touching
   * the DOM only when something is out of place. Foreign children (overlays
   * other modules append to #echo-layer) are left alone.
   * @param {Element[]} order
   */
  _mountInOrder(order) {
    const current = Array.from(this.root.children).filter((c) => this._owned.has(c));
    const same =
      current.length === order.length && current.every((node, i) => node === order[i]);
    if (same) return;
    for (const node of order) this.root.appendChild(node);
  }
}
