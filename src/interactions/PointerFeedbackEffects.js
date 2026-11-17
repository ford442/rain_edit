import { InputRegistry } from "./InputRegistry.js";
import { queryEchoes } from "./depthState.js";
import * as appContext from "../appContext.js";

/** @typedef {Partial<typeof import("../appContext.js")>} AppRefs */

/**
 * Small ambient pointer-feedback effects that don't warrant their own file:
 * a raindrop splash on any mousedown, and a staggered z-depth-wave ripple
 * through the echo layers on double-click.
 */
export class PointerFeedbackEffects {
  /**
   * @param {{ doc?: Document, win?: Window, ctx?: AppRefs }} [options]
   */
  constructor({
    doc = typeof document !== "undefined" ? document : null,
    win = typeof window !== "undefined" ? window : null,
    ctx = appContext,
  } = {}) {
    this.doc = doc;
    this.win = win;
    this.ctx = ctx;
    this.registry = new InputRegistry();
    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleDoubleClick = this._handleDoubleClick.bind(this);
  }

  init() {
    if (!this.doc) return this;
    this.registry.listen(this.doc, "mousedown", this._handleMouseDown);
    this.registry.listen(this.doc, "dblclick", this._handleDoubleClick);
    return this;
  }

  destroy() {
    this.registry.dispose();
  }

  /** @param {MouseEvent} e */
  _handleMouseDown(e) {
    const raindrops = /** @type {any} */ (this.ctx.raindrops);
    if (raindrops) raindrops.splash(e.clientX, e.clientY, 5);
  }

  _handleDoubleClick() {
    const echoLayerEl = /** @type {HTMLElement | undefined} */ (this.ctx.echoLayerEl);
    if (!echoLayerEl) return;

    queryEchoes(echoLayerEl).forEach((echo) => {
      // Wave propagates backwards through depth layers consecutively
      const index = parseInt(echo.dataset.index || "0", 10);
      const delay = index * 150; // 150ms delay per depth layer

      setTimeout(() => {
        echo.classList.remove("z-depth-wave-hit");
        void echo.offsetWidth; // Force reflow
        echo.classList.add("z-depth-wave-hit");

        setTimeout(() => {
          echo.classList.remove("z-depth-wave-hit");
        }, 600); // Duration of the z-depth-wave animation
      }, delay);
    });
  }
}
