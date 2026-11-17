import { InputRegistry } from "./InputRegistry.js";
import { interactionState } from "./interactionState.js";

/** @typedef {typeof import("./interactionState.js").interactionState} InteractionState */

/**
 * Picks the depth-Z target for the cinematic autofocus effect based on
 * which echo (if any) is under the cursor. The effect itself — the
 * `isAutofocusActive` toggle, the `--af-*` easing on the AppClock — lives in
 * `effects/CinematicFocus.js`; this class only writes
 * `state.autofocusTargetZ` on every mousemove while it's active.
 */
export class CinematicAutofocusTargeting {
  /**
   * @param {{ doc?: Document, win?: Window, state?: InteractionState }} [options]
   */
  constructor({
    doc = typeof document !== "undefined" ? document : null,
    win = typeof window !== "undefined" ? window : null,
    state = interactionState,
  } = {}) {
    this.doc = doc;
    this.win = win;
    this.state = state;
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
    if (!this.state.isAutofocusActive) return;

    const target = this.doc.elementFromPoint(e.clientX, e.clientY);
    const echoDoc = /** @type {HTMLElement | null} */ (target?.closest(".echo-document"));
    if (echoDoc) {
      const depth = parseInt(echoDoc.dataset.depth || "0", 10);
      if (depth === 0) this.state.autofocusTargetZ = -400;
      else if (depth === 1) this.state.autofocusTargetZ = 0;
      else if (depth === 2) this.state.autofocusTargetZ = 400;
    } else {
      this.state.autofocusTargetZ = 0; // Default to active plane if hovering nothing
    }
  }
}
