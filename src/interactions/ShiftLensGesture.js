import { InputRegistry } from "./InputRegistry.js";
import { queryEchoes } from "./depthState.js";
import * as appContext from "../appContext.js";
import { interactionState } from "./interactionState.js";

/** @typedef {Partial<typeof import("../appContext.js")>} AppRefs */
/** @typedef {typeof import("./interactionState.js").interactionState} InteractionState */

/**
 * 3D magnifying-glass / magnetic lens pull while Shift is held: echoes near
 * the cursor get pulled and tagged `shift-lens-hit`. `state.lensActive`
 * (`interactionState.lensActive`) is shared with `echo/depthPeelGestures.js`, which does an additional
 * cleanup pass on Shift's keyup — keep both in sync if this changes.
 */
export class ShiftLensGesture {
  /**
   * @param {{ doc?: Document, win?: Window, ctx?: AppRefs, state?: InteractionState }} [options]
   */
  constructor({
    doc = typeof document !== "undefined" ? document : null,
    win = typeof window !== "undefined" ? window : null,
    ctx = appContext,
    state = interactionState,
  } = {}) {
    this.doc = doc;
    this.win = win;
    this.ctx = ctx;
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
    const echoLayerEl = /** @type {HTMLElement | undefined} */ (this.ctx.echoLayerEl);
    const tabManager = /** @type {any} */ (this.ctx.tabManager);

    if (e.shiftKey && tabManager && tabManager.files) {
      queryEchoes(echoLayerEl).forEach((echo) => {
        const rect = echo.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.sqrt(Math.pow(e.clientX - cx, 2) + Math.pow(e.clientY - cy, 2));

        if (dist < 300) {
          const pullFactor = 1 - dist / 300;
          echo.style.setProperty("--lens-pull", String(pullFactor));
          echo.classList.add("shift-lens-hit");
        } else {
          echo.style.setProperty("--lens-pull", "0");
          echo.classList.remove("shift-lens-hit");
        }
      });
      this.state.lensActive = true;
    } else if (echoLayerEl && this.state.lensActive) {
      queryEchoes(echoLayerEl).forEach((echo) => {
        echo.style.setProperty("--lens-pull", "0");
        echo.classList.remove("shift-lens-hit");
      });
      this.state.lensActive = false;
    }
  }
}
