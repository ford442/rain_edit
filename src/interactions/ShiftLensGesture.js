// @ts-check
import { InputRegistry } from "./InputRegistry.js";
import { queryEchoes } from "./depthState.js";

/**
 * 3D magnifying-glass / magnetic lens pull while Shift is held: echoes near
 * the cursor get pulled and tagged `shift-lens-hit`. `window.__lensActive`
 * is shared with `EchoDocumentInteractions.js`, which does an additional
 * cleanup pass on Shift's keyup — keep both in sync if this changes.
 */
export class ShiftLensGesture {
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
    const echoLayerEl = /** @type {HTMLElement | undefined} */ (this.win.echoLayerEl);
    const tabManager = /** @type {any} */ (this.win.tabManager);

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
      this.win.__lensActive = true;
    } else if (echoLayerEl && this.win.__lensActive) {
      queryEchoes(echoLayerEl).forEach((echo) => {
        echo.style.setProperty("--lens-pull", "0");
        echo.classList.remove("shift-lens-hit");
      });
      this.win.__lensActive = false;
    }
  }
}
