// @ts-check
import { InputRegistry } from "./InputRegistry.js";

/**
 * Two unrelated pointer-button-held gestures that happen to share the same
 * mousedown/mouseup/mousemove event trio: middle-click-held Flashlight fog
 * clearing, and Alt+left-click-drag free-cam rotation of the echo layer.
 * (There is a second, unrelated "Flashlight" feature — the Alt+L
 * `flashlight-active` CSS toggle registered in `main_init_3.js` — this one
 * is the middle-mouse-button hold instead.)
 */
export class PointerHoldGestures {
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

    this.isFlashlightActive = false;
    this.isAltDragActive = false;
    this.altDragStartX = 0;
    this.altDragStartY = 0;
    this.sceneRotX = 0;
    this.sceneRotY = 0;
    this.currentSceneRotX = 0;
    this.currentSceneRotY = 0;

    this._handleMouseDown = this._handleMouseDown.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
    this._handleMouseMove = this._handleMouseMove.bind(this);
  }

  init() {
    if (!this.doc) return this;
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
    if (e.button === 1) {
      this.isFlashlightActive = true;
      e.preventDefault(); // Prevent default middle-click scroll behavior
    }

    if (e.altKey && e.button === 0) {
      this.isAltDragActive = true;
      this.altDragStartX = e.clientX;
      this.altDragStartY = e.clientY;
      this.currentSceneRotX = this.sceneRotX;
      this.currentSceneRotY = this.sceneRotY;
      e.preventDefault(); // Prevent text selection while dragging
    }
  }

  /** @param {MouseEvent} e */
  _handleMouseUp(e) {
    if (e.button === 1) this.isFlashlightActive = false;
    if (e.button === 0) this.isAltDragActive = false;
  }

  /** @param {MouseEvent} e */
  _handleMouseMove(e) {
    const echoLayerEl = /** @type {HTMLElement | undefined} */ (this.win.echoLayerEl);

    if (this.isAltDragActive && echoLayerEl) {
      const deltaX = e.clientX - this.altDragStartX;
      const deltaY = e.clientY - this.altDragStartY;

      this.sceneRotY = this.currentSceneRotY + deltaX * 0.5;
      this.sceneRotX = this.currentSceneRotX - deltaY * 0.5;

      echoLayerEl.style.transform = `rotateX(${this.sceneRotX}deg) rotateY(${this.sceneRotY}deg)`;
    }

    if (this.isFlashlightActive) {
      const fogManager = /** @type {any} */ (this.win.fogManager);
      if (fogManager) fogManager.clearFogAt(e.clientX, e.clientY, 250);
    }
  }
}
