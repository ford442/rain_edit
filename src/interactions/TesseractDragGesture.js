// @ts-check
import { InputRegistry } from "./InputRegistry.js";

/**
 * Tesseract view drag rotation: while `.tesseract-active`, dragging rotates
 * the view via CSS vars on `documentElement`; Escape exits the view.
 */
export class TesseractDragGesture {
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

    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.rotX = 0;
    this.rotY = 0;

    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
  }

  init() {
    this.inputManager.register({
      id: "tesseract-exit",
      category: "navigation",
      description: "Exit tesseract view (Esc)",
      combo: { key: "Escape" },
      type: "action",
      preventDefault: false,
      allowInEditor: true,
      when: () => this.doc.body.classList.contains("tesseract-active"),
      onDown: () => {
        const tabManager = /** @type {any} */ (this.win.tabManager);
        const viewSelect = this.doc.getElementById("view-mode-select");
        if (viewSelect) /** @type {HTMLSelectElement} */ (viewSelect).value = "";
        if (tabManager) tabManager._deactivateAllViews();
      },
    });

    this.registry.listen(this.doc, "mousedown", this._handleMouseDown);
    this.registry.listen(this.doc, "mouseup", this._handleMouseUp);
    this.registry.listen(this.doc, "mousemove", this._handleMouseMove);
    return this;
  }

  destroy() {
    this.registry.dispose();
  }

  /** @param {MouseEvent} e */
  _handleMouseDown(e) {
    if (this.doc.body.classList.contains("tesseract-active")) {
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    }
  }

  _handleMouseUp() {
    this.isDragging = false;
  }

  /** @param {MouseEvent} e */
  _handleMouseMove(e) {
    if (!this.isDragging || !this.doc.body.classList.contains("tesseract-active")) return;

    const deltaX = e.clientX - this.lastX;
    const deltaY = e.clientY - this.lastY;

    this.rotY += deltaX * 0.5;
    this.rotX -= deltaY * 0.5;

    this.doc.documentElement.style.setProperty("--tesseract-rot-x", `${this.rotX}deg`);
    this.doc.documentElement.style.setProperty("--tesseract-rot-y", `${this.rotY}deg`);

    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }
}
