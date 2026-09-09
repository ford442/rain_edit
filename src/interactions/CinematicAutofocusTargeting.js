// @ts-check
import { InputRegistry } from "./InputRegistry.js";

/**
 * Picks the depth-Z target for the cinematic autofocus RAF loop based on
 * which echo (if any) is under the cursor. The loop itself — the
 * `window.isAutofocusActive` toggle, the `--af-*` easing, start/stop — lives
 * in `main_vars_1.js`/`main_init_2.js`; this class only supplies
 * `window.autofocusTargetZ` on every mousemove while it's active.
 */
export class CinematicAutofocusTargeting {
  /**
   * @param {{ doc?: Document, win?: Window }} [options]
   */
  constructor({
    doc = typeof document !== "undefined" ? document : null,
    win = typeof window !== "undefined" ? window : null,
  } = {}) {
    this.doc = doc;
    this.win = win;
    this.registry = new InputRegistry();
    this._handleMouseMove = this._handleMouseMove.bind(this);
  }

  init() {
    if (!this.doc) return this;
    this.registry.listen(this.doc, "mousemove", this._handleMouseMove);
    return this;
  }

  destroy() {
    this.registry.dispose();
  }

  /** @param {MouseEvent} e */
  _handleMouseMove(e) {
    if (!this.win.isAutofocusActive) return;

    const target = this.doc.elementFromPoint(e.clientX, e.clientY);
    const echoDoc = /** @type {HTMLElement | null} */ (target?.closest(".echo-document"));
    if (echoDoc) {
      const depth = parseInt(echoDoc.dataset.depth || "0", 10);
      if (depth === 0) this.win.autofocusTargetZ = -400;
      else if (depth === 1) this.win.autofocusTargetZ = 0;
      else if (depth === 2) this.win.autofocusTargetZ = 400;
    } else {
      this.win.autofocusTargetZ = 0; // Default to active plane if hovering nothing
    }
  }
}
