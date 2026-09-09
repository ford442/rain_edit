// @ts-check
import { InputRegistry } from "./InputRegistry.js";
import { queryEchoes } from "./depthState.js";

/**
 * Loupe magnifier (hold Cmd+Shift): while held, echoes within range of the
 * cursor get centered/scaled via the `loupe-active` class and their
 * `--mouse-*` vars are recomputed relative to the viewport center so the
 * CSS mask tracks the cursor correctly under that transform.
 */
export class MagnifierLoupeGesture {
  /**
   * @param {{ inputManager: import("./InputManager.js").InputManager, doc?: Document, win?: Window }} options
   */
  constructor({
    inputManager,
    doc = typeof document !== "undefined" ? document : null,
    win = typeof window !== "undefined" ? window : null,
  }) {
    this.inputManager = inputManager;
    this.doc = doc;
    this.win = win;
    this.registry = new InputRegistry();
    this.isActive = false;
    this._handleMouseMove = this._handleMouseMove.bind(this);
  }

  init() {
    this.inputManager.register({
      id: "loupe-magnifier",
      category: "lens",
      description: "Loupe magnifier (hold Cmd+Shift)",
      combo: { meta: true, shift: true },
      type: "hold",
      preventDefault: false,
      allowInEditor: true,
      onDown: () => {
        this.isActive = true;
        const editorEl = /** @type {HTMLElement | undefined} */ (this.win.editorEl);
        if (editorEl) editorEl.classList.add("x-ray-active");
      },
      onUp: () => {
        this.isActive = false;
        const editorEl = /** @type {HTMLElement | undefined} */ (this.win.editorEl);
        if (editorEl) editorEl.classList.remove("x-ray-active");
        const echoLayerEl = /** @type {HTMLElement | undefined} */ (this.win.echoLayerEl);
        queryEchoes(echoLayerEl).forEach((echo) => echo.classList.remove("loupe-active"));
      },
    });

    if (this.doc) this.registry.listen(this.doc, "mousemove", this._handleMouseMove);
    return this;
  }

  destroy() {
    this.registry.dispose();
  }

  /** @param {MouseEvent} e */
  _handleMouseMove(e) {
    if (!this.isActive) return;
    const echoLayerEl = /** @type {HTMLElement | undefined} */ (this.win.echoLayerEl);
    const tabManager = /** @type {any} */ (this.win.tabManager);
    if (!echoLayerEl || !tabManager || tabManager.isCascadeView) return;

    queryEchoes(echoLayerEl).forEach((echo) => {
      const echoRect = echo.getBoundingClientRect();
      const centerX = echoRect.left + echoRect.width / 2;
      const centerY = echoRect.top + echoRect.height / 2;
      const dist = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2),
      );

      if (dist < 300) {
        // "loupe-active" centers the element on the screen (-50%, -50% on
        // left:50%/top:50%), so the mask-image mouse position needs to be
        // relative to the viewport center rather than the element's rect.
        echo.classList.add("loupe-active");

        const x = e.clientX - this.win.innerWidth / 2 + echo.offsetWidth / 2;
        const y = e.clientY - this.win.innerHeight / 2 + echo.offsetHeight / 2;
        echo.style.setProperty("--mouse-x", `${x}px`);
        echo.style.setProperty("--mouse-y", `${y}px`);
      } else {
        echo.classList.remove("loupe-active");
      }
    });
  }
}
