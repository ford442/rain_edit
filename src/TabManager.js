import StorageAPI from "./StorageAPI.js";
export const storageAPI = new StorageAPI();

// Duration (ms) the note save toast stays visible
export const TOAST_DISPLAY_DURATION = 2500;

// Z-index assigned to the editor element at each depth level
export const DEPTH_Z_INDEX = [0, 5, 15];

// Visual badge icons for depth 0, 1, 2
export const DEPTH_ICONS = ["▼", "◆", "▲"];

// Human-readable titles for tooltips
export const DEPTH_TITLES = [
  "Deep — behind all rain (z-index: 0)",
  "Middle — between rain layers (z-index: 5)",
  "Front — above all rain (z-index: 15)",
];

/**
 * Extract top-level symbols (functions, classes, variables, methods) from source code.
 * Uses simple regex patterns — works best with JS/TS/Python.
 * @param {string} source
 * @returns {{ name: string, kind: string, line: number }[]}
 */
export function _extractSymbols(source) {
  const symbols = [];
  const patterns = [
    { kind: "class", re: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/m },
    { kind: "function", re: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/m },
    {
      kind: "arrow",
      re: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/m,
    },
    { kind: "method", re: /^[\t ]{2,}(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/m },
    { kind: "def", re: /^def\s+(\w+)\s*\(/m },
    { kind: "const", re: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/m },
  ];
  const lines = source.split("\n");
  lines.forEach((line, idx) => {
    for (const { kind, re } of patterns) {
      const m = line.match(re);
      if (m) {
        // Avoid duplicate names at same line
        if (!symbols.some((s) => s.name === m[1] && s.line === idx + 1)) {
          symbols.push({ name: m[1], kind, line: idx + 1 });
        }
        break;
      }
    }
  });
  return symbols;
}

/**
 * Return a small icon character for a symbol kind.
 * @param {string} kind
 * @returns {string}
 */
export function _symbolKindIcon(kind) {
  const map = {
    class: "◉",
    function: "ƒ",
    arrow: "→",
    method: "⬡",
    def: "δ",
    const: "κ",
  };
  return map[kind] ?? "·";
}

export class TabManager {
  /**
   * @param {import('monaco-editor').editor.IStandaloneCodeEditor} editor
   * @param {typeof import('monaco-editor')} monacoApi
   * @param {HTMLElement} editorEl  - the #editor DOM node
   * @param {HTMLElement} tabsEl    - the #tabs-container DOM node
   * @param {HTMLElement} echoLayerEl - the #echo-layer DOM node
   */
  constructor(
    editor,
    monacoApi,
    editorEl,
    tabsEl,
    imageViewerEl = null,
    echoLayerEl = null,
  ) {
    this.editor = editor;
    this.monaco = monacoApi;
    this.editorEl = editorEl;
    this.tabsEl = tabsEl;
    this.imageViewerEl =
      imageViewerEl || document.getElementById("image-viewer");
    this.echoLayerEl = echoLayerEl || document.getElementById("echo-layer");
    this.files = [];
    this.activeId = null;
    this._nextId = 1;
    this.isWaterfallView = false;
    this.isCascadeView = false;
    this.isOrbitView = false;
    this.isScatteredView = false;
    this.isIsometricView = false;
    this.isStackView = false;
    this.isTimelineView = false;
    this.isTunnelView = false;
    this.isGridView = false;
    this.isHelixView = false;
    this.isPinboardView = false;
    this.isVortexView = false;
    this.isConstellationView = false;
    this.isPrismView = false;
    this.isCoverflowView = false;
    this.isRibbonView = false;
    this.isCrystalView = false;
    this.isWaveView = false;
    this.isSphereView = false;
    this.isBlackHoleView = false;
    this.isRolodexView = false;
    this.isCylinderView = false;
    this.isGalaxyView = false;
    this.isMatrixRainView = false;
    this.isFractalView = false;
    this.isSolarSystemView = false;
    this.isNeonSynthView = false;
    this.isTesseractView = false;
    this.isBlueprint3dView = false;
    this.isCyberCortexView = false;
    this.isQuantumSuperpositionView = false;
    this.isOutlineView = false;
    this.isCycloneView = false;
    this.isMobiusView = false;
    this.isAstrolabeView = false;
    this.isDominoesView = false;
    this.isHexagonMatrixView = false;
    this.isLuminescenceView = false;
    this.isGeodeView = false;
  }



























































































  /**
   * Add a new file/document.
   * @param {string} name       - display name shown in the tab
   * @param {string} content    - initial text content
   * @param {string} language   - Monaco language identifier
   * @returns {number} the new file's id
   */


  /**
   * Switch to a file by id.
   * Updates the Monaco model and immediately applies the saved depth.
   * @param {number} id
   */


  /**
   * Apply a depth level to the editor element (updates z-index only).
   * Does NOT mutate file state — call adjustDepth() or set file.depth directly
   * before calling this if you want to persist the change.
   * @param {0|1|2} depthLevel
   * @param {number} oldDepthLevel
   */


  /**
   * Increment (+1) or decrement (−1) the active document's depth,
   * clamped to [0, 2], then immediately applies the new depth.
   * @param {number} delta  — typically +1 or -1
   */


  /**
   * Cycle the active tab linearly to the next/previous open file.
   * @param {number} direction
   */


  /**
   * Cycle a document's depth with wrap-around.
   * @param {number} delta
   * @param {number} [id]
   */


  /**
   * Internal depth update helper.
   * @param {number} id
   * @param {number} delta
   * @param {{ wrap?: boolean }} [options]
   */


  /** Re-render the tab list inside tabsEl. */


  /** Render inactive files as blurred background echoes. */

  /**
   * Save the current tab list to localStorage for session restoration.
   * Stores: [{fileId, name, language, vpsPath}, ...]
   */


  /**
   * Load and restore tabs from localStorage.
   * Fetches content for each saved tab and recreates it.
   * @returns {Promise<void>}
   */


  /**
   * Remove a file/tab by id and save updated list.
   * @param {number} id
   */


  /**
   * Load a named note from the backend and open it as a new tab.
   * If the note doesn't exist (null returned), creates a blank tab named `noteName`.
   * @param {string} noteName - The note name (no extension)
   * @returns {Promise<number>} the new file's id
   */


  /**
   * Save the current tab's content to the backend as a named note.
   * If the tab has no `noteName`, prompts the user for one.
   * @returns {Promise<void>}
   */


  /**
   * Show a brief status toast notification.
   * @param {string} message
   * @param {boolean} [isError=false]
   */















}

// --- Mixins ---
import { TabManagerMixin0 } from './TabManager_0.js';
Object.assign(TabManager.prototype, TabManagerMixin0);
import { TabManagerMixin1 } from './TabManager_1.js';
Object.assign(TabManager.prototype, TabManagerMixin1);
import { TabManagerMixin2 } from './TabManager_2.js';
Object.assign(TabManager.prototype, TabManagerMixin2);
import { TabManagerMixin3 } from './TabManager_3.js';
Object.assign(TabManager.prototype, TabManagerMixin3);
import { TabManagerMixin4 } from './TabManager_4.js';
Object.assign(TabManager.prototype, TabManagerMixin4);
import { TabManagerMixin5 } from './TabManager_5.js';
Object.assign(TabManager.prototype, TabManagerMixin5);
