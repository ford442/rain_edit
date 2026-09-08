// @ts-check
import { InputRegistry } from "./InputRegistry.js";

/**
 * @typedef {object} Combo
 * @property {boolean} alt
 * @property {boolean} shift
 * @property {boolean} ctrl
 * @property {boolean} meta
 * @property {boolean} ctrlOrMeta
 * @property {string | null} code
 * @property {string | null} key
 */

/**
 * @typedef {object} InputContext
 * @property {boolean} isTyping
 * @property {HTMLElement | null} body
 * @property {AppWindow | null} win
 * @property {InputManager} modes
 * @property {HTMLElement | undefined} editorEl
 * @property {HTMLElement | undefined} echoLayerEl
 * @property {unknown} tabManager
 * @property {unknown} referenceManager
 */

/**
 * @typedef {object} BindingSpec
 * @property {string} id
 * @property {string} [category]
 * @property {string} [description]
 * @property {'action' | 'toggle' | 'hold'} [type]
 * @property {string | null} [group]
 * @property {Partial<Combo>} combo
 * @property {(ctx: InputContext) => boolean} [when]
 * @property {(event: KeyboardEvent | null, ctx: InputContext) => void} [onDown]
 * @property {(event: KeyboardEvent | null, ctx: InputContext) => void} [onUp]
 * @property {boolean} [allowInEditor]
 * @property {boolean} [preventDefault]
 */

/**
 * @typedef {object} Binding
 * @property {string} id
 * @property {string} category
 * @property {string} description
 * @property {'action' | 'toggle' | 'hold'} type
 * @property {string | null} group
 * @property {Combo} combo
 * @property {Set<string>} releaseKeys
 * @property {((ctx: InputContext) => boolean) | null} when
 * @property {((event: KeyboardEvent | null, ctx: InputContext) => void) | null} onDown
 * @property {((event: KeyboardEvent | null, ctx: InputContext) => void) | null} onUp
 * @property {boolean} allowInEditor
 * @property {boolean} preventDefault
 */

/**
 * Single declarative keyboard registry for all world-interaction shortcuts.
 *
 * One capture-phase `keydown` and one `keyup` listener dispatch every binding,
 * replacing the dozens of independent `document.addEventListener` blocks that
 * used to live in `main_init_*.js`. Bindings are registered from wherever their
 * state lives (they receive a live `ctx`), so this stays the single source of
 * truth for what a key does, while behavior stays colocated with its feature.
 *
 * Key properties:
 *  - **Scoped release** — a `keyup` only deactivates bindings whose own trigger
 *    keys were released, so releasing a bare `Alt`/`Shift` never tears down an
 *    unrelated combo's classes (the historic cross-combo release bug).
 *  - **Uniform typing guard** — `ctx.isTyping` is computed once per event from a
 *    single canonical check (INPUT/TEXTAREA/contentEditable/`.monaco-editor`).
 *  - **Mode groups** — activating a binding in an exclusive `group` first
 *    deactivates the previously active member of that group.
 *  - **Discoverable** — `list()` returns bindings grouped by category for the
 *    generated cheatsheet.
 *  - **Rebindable** — combo overrides persist in `localStorage`.
 */

const STORAGE_KEY = "rain2.keybinds";

/**
 * @param {Partial<Combo>} [combo]
 * @returns {Combo}
 */
function normalizeCombo(combo = {}) {
  return {
    alt: !!combo.alt,
    shift: !!combo.shift,
    ctrl: !!combo.ctrl,
    meta: !!combo.meta,
    // `ctrlOrMeta` accepts either Control or Command (mac-friendly save combos).
    ctrlOrMeta: !!combo.ctrlOrMeta,
    code: combo.code || null,
    key: combo.key || null,
  };
}

/**
 * Letters that a `code` like "KeyF" should also release on ("f"/"F").
 * @param {Combo} combo
 * @returns {Set<string>}
 */
function releaseKeysFor(combo) {
  /** @type {Set<string>} */
  const keys = new Set();
  if (combo.key) keys.add(combo.key);
  if (combo.code && /^Key[A-Z]$/.test(combo.code)) {
    const letter = combo.code.slice(3);
    keys.add(letter.toLowerCase());
    keys.add(letter.toUpperCase());
  }
  if (combo.code === "Space") keys.add(" ");
  // Modifier-triggered holds (combo key is the modifier itself).
  if (combo.key === "Alt" || combo.key === "Shift" || combo.key === "Control" || combo.key === "Meta") {
    keys.add(combo.key);
  }
  // Holds that require a modifier also release when that modifier lifts, matching
  // the original per-feature keyup handlers.
  if (combo.alt) keys.add("Alt");
  if (combo.shift) keys.add("Shift");
  if (combo.ctrl || combo.ctrlOrMeta) keys.add("Control");
  if (combo.meta || combo.ctrlOrMeta) keys.add("Meta");
  return keys;
}

/**
 * @param {EventTarget | null} [target]
 * @returns {boolean}
 */
export function isTypingTarget(target) {
  if (!target || typeof target !== "object") return false;
  const el = /** @type {Partial<HTMLElement>} */ (target);
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  if (el.isContentEditable) return true;
  if (typeof el.closest === "function" && el.closest(".monaco-editor")) return true;
  if (el.classList && typeof el.classList.contains === "function" && el.classList.contains("monaco-editor")) {
    return true;
  }
  return false;
}

/**
 * `window`, plus the ad hoc globals this project attaches to it for the
 * interaction bindings to read (see `appContext.js`).
 * @typedef {Window & {
 *   editorEl?: HTMLElement,
 *   echoLayerEl?: HTMLElement,
 *   tabManager?: unknown,
 *   referenceManager?: unknown,
 * }} AppWindow
 */

/**
 * @typedef {object} InputManagerOptions
 * @property {Document | null} [eventTarget]
 * @property {HTMLElement | null} [body]
 * @property {Storage | null} [storage]
 * @property {AppWindow | null} [win]
 */

export class InputManager {
  /** @param {InputManagerOptions} [options] */
  constructor({
    eventTarget = typeof document !== "undefined" ? document : null,
    body = typeof document !== "undefined" ? document.body : null,
    storage = typeof localStorage !== "undefined" ? localStorage : null,
    win = typeof window !== "undefined" ? window : null,
  } = {}) {
    this.eventTarget = eventTarget;
    this.body = body;
    this.storage = storage;
    this.win = win;
    this.inputs = new InputRegistry();
    /** @type {Map<string, Binding>} */
    this.bindings = new Map();
    /** @type {Map<string, Binding>} */
    this.active = new Map(); // id -> binding currently held/toggled on
    this.overrides = this._loadOverrides();
    this.started = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  /** @returns {Record<string, Partial<Combo>>} */
  _loadOverrides() {
    if (!this.storage) return {};
    try {
      return JSON.parse(this.storage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  /** @param {BindingSpec} spec */
  register(spec) {
    if (!spec || !spec.id) throw new Error("InputManager.register requires an id");
    if (this.bindings.has(spec.id)) {
      throw new Error(`InputManager: duplicate binding id "${spec.id}"`);
    }
    const combo = normalizeCombo(this.overrides[spec.id] || spec.combo);
    const binding = {
      id: spec.id,
      category: spec.category || "misc",
      description: spec.description || spec.id,
      type: spec.type || "action", // action | toggle | hold
      group: spec.group || null,
      combo,
      releaseKeys: releaseKeysFor(combo),
      when: spec.when || null,
      onDown: spec.onDown || null,
      onUp: spec.onUp || null,
      allowInEditor: !!spec.allowInEditor,
      preventDefault: spec.preventDefault !== false, // default true
    };
    this.bindings.set(spec.id, binding);
    return this;
  }

  start() {
    if (this.started || !this.eventTarget) return this;
    // Capture phase so we see keys before feature-local widgets/monaco.
    this.inputs.listen(
      this.eventTarget,
      "keydown",
      /** @type {EventListener} */ (this.handleKeyDown),
      true,
    );
    this.inputs.listen(
      this.eventTarget,
      "keyup",
      /** @type {EventListener} */ (this.handleKeyUp),
      true,
    );
    if (this.win && typeof this.win.addEventListener === "function") {
      this.inputs.listen(this.win, "blur", () => this._releaseAll(), false);
    }
    this.started = true;
    return this;
  }

  destroy() {
    this.inputs.dispose();
    this._releaseAll();
    this.started = false;
  }

  /**
   * @param {Partial<KeyboardEvent>} event
   * @returns {InputContext}
   */
  buildContext(event) {
    const target = event && event.target;
    return {
      isTyping: isTypingTarget(target) || isTypingTarget(this._activeElement()),
      body: this.body,
      win: this.win,
      modes: this,
      editorEl: this.win ? this.win.editorEl : undefined,
      echoLayerEl: this.win ? this.win.echoLayerEl : undefined,
      tabManager: this.win ? this.win.tabManager : undefined,
      referenceManager: this.win ? this.win.referenceManager : undefined,
    };
  }

  /** @returns {Element | null} */
  _activeElement() {
    try {
      return this.eventTarget && this.eventTarget.activeElement;
    } catch {
      return null;
    }
  }

  /**
   * @param {Combo} combo
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  _matches(combo, event) {
    if (combo.ctrlOrMeta) {
      if (!(event.ctrlKey || event.metaKey)) return false;
    } else {
      if (!!event.ctrlKey !== combo.ctrl) return false;
      if (!!event.metaKey !== combo.meta) return false;
    }
    if (!!event.altKey !== combo.alt) return false;
    if (!!event.shiftKey !== combo.shift) return false;

    if (combo.code) return event.code === combo.code;
    if (combo.key) {
      if (combo.key.length === 1) {
        return event.key === combo.key.toLowerCase() || event.key === combo.key.toUpperCase();
      }
      return event.key === combo.key;
    }
    // Modifier-only combo (e.g. hold Ctrl+Alt): matched purely on modifier state.
    return true;
  }

  /** @param {KeyboardEvent} event */
  handleKeyDown(event) {
    const ctx = this.buildContext(event);
    for (const binding of this.bindings.values()) {
      if (!this._matches(binding.combo, event)) continue;
      if (!binding.allowInEditor && ctx.isTyping && !this._isTypingBinding(binding)) continue;
      if (binding.when && !binding.when(ctx)) continue;

      if (binding.preventDefault && typeof event.preventDefault === "function") {
        event.preventDefault();
      }

      if (binding.type === "toggle") {
        if (this.active.has(binding.id)) {
          this._deactivate(binding, event, ctx);
        } else {
          this._activateGroup(binding, ctx);
          this.active.set(binding.id, binding);
          if (binding.onDown) binding.onDown(event, ctx);
        }
      } else if (binding.type === "hold") {
        if (!this.active.has(binding.id)) {
          this._activateGroup(binding, ctx);
          this.active.set(binding.id, binding);
          if (binding.onDown) binding.onDown(event, ctx);
        }
      } else {
        if (binding.onDown) binding.onDown(event, ctx);
      }
    }
  }

  /** @param {KeyboardEvent} event */
  handleKeyUp(event) {
    const ctx = this.buildContext(event);
    for (const binding of [...this.active.values()]) {
      if (binding.type === "action") continue;
      if (binding.releaseKeys.has(event.key)) {
        // Toggles latch on their own key; only holds release on keyup.
        if (binding.type === "hold") {
          this._deactivate(binding, event, ctx);
        }
      }
    }
  }

  /**
   * @param {Binding} binding
   * @returns {boolean}
   */
  _isTypingBinding(binding) {
    // Bindings that intentionally only fire while typing (e.g. typing ripple).
    return binding.category === "editor-feedback";
  }

  /**
   * @param {Binding} binding
   * @param {InputContext} ctx
   */
  _activateGroup(binding, ctx) {
    if (!binding.group) return;
    for (const other of [...this.active.values()]) {
      if (other !== binding && other.group === binding.group) {
        this._deactivate(other, null, ctx);
      }
    }
  }

  /**
   * @param {Binding} binding
   * @param {KeyboardEvent | null} event
   * @param {InputContext} [ctx]
   */
  _deactivate(binding, event, ctx) {
    if (!this.active.has(binding.id)) return;
    this.active.delete(binding.id);
    if (binding.onUp) binding.onUp(event, ctx || this.buildContext(event || {}));
  }

  _releaseAll() {
    // Only holds are auto-released on blur; toggles latch until re-pressed.
    for (const binding of [...this.active.values()]) {
      if (binding.type === "hold") this._deactivate(binding, null, this.buildContext({}));
    }
  }

  /**
   * Programmatic access for the cheatsheet.
   * @returns {Record<string, Array<{ id: string, description: string, combo: string }>>}
   */
  list() {
    /** @type {Record<string, Array<{ id: string, description: string, combo: string }>>} */
    const groups = {};
    for (const b of this.bindings.values()) {
      (groups[b.category] ||= []).push({
        id: b.id,
        description: b.description,
        combo: this.formatCombo(b.combo),
      });
    }
    return groups;
  }

  /**
   * @param {Combo} combo
   * @returns {string}
   */
  formatCombo(combo) {
    /** @type {string[]} */
    const parts = [];
    if (combo.ctrlOrMeta) parts.push("Ctrl/⌘");
    else {
      if (combo.ctrl) parts.push("Ctrl");
      if (combo.meta) parts.push("⌘");
    }
    if (combo.alt) parts.push("Alt");
    if (combo.shift) parts.push("Shift");
    let main = combo.code || combo.key || "";
    if (/^Key[A-Z]$/.test(main)) main = main.slice(3);
    if (main === "Space") main = "Space";
    if (main && !["Alt", "Shift", "Control", "Meta"].includes(main)) parts.push(main);
    return parts.join("+");
  }

  /**
   * @param {string} id
   * @param {Partial<Combo>} combo
   */
  rebind(id, combo) {
    const binding = this.bindings.get(id);
    if (!binding) return;
    binding.combo = normalizeCombo(combo);
    binding.releaseKeys = releaseKeysFor(binding.combo);
    this.overrides[id] = combo;
    if (this.storage) {
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(this.overrides));
      } catch {
        /* ignore quota / privacy-mode errors */
      }
    }
  }
}

// Shared singleton: every init file registers into the same dispatcher.
export const inputManager =
  typeof document !== "undefined" ? new InputManager() : null;
