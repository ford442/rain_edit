// @ts-check
import { InputRegistry } from "./InputRegistry.js";
import { queryEchoes } from "./depthState.js";

/**
 * Per-frame fan-out math for the Peel gesture (Alt+Shift+Q). The binding
 * that flips `window.isPeelActive` and does enter/exit cleanup lives in
 * `EchoDocumentInteractions.js`; this class only reacts to it while active,
 * spreading echoes vertically based on cursor Y and skipping any echo view
 * mode that owns its own layout transform.
 */
export class PeelFanGesture {
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
    if (!this.win.isPeelActive || !echoLayerEl || !tabManager) return;
    if (
      tabManager.isCascadeView ||
      tabManager.isOrbitView ||
      tabManager.isSolarSystemView ||
      tabManager.isScatteredView ||
      tabManager.isIsometricView ||
      tabManager.isStackView ||
      tabManager.isTunnelView ||
      tabManager.isGridView ||
      tabManager.isHelixView ||
      tabManager.isPinboardView ||
      tabManager.isVortexView ||
      tabManager.isConstellationView ||
      tabManager.isPrismView ||
      tabManager.isCoverflowView ||
      tabManager.isWaveView ||
      tabManager.isSphereView
    ) {
      return;
    }

    const pctY = e.clientY / this.win.innerHeight; // 0 to 1

    queryEchoes(echoLayerEl).forEach((echo, index) => {
      if (echo.classList.contains("peek")) return;

      const targetY = (pctY - 0.5) * 800 * (index + 1); // Spread
      const baseTz = -(index + 1) * 50;
      const targetZ = baseTz + pctY * 150; // Pull forward as you fan
      const targetRotX = (pctY - 0.5) * 40; // Tilt

      echo.style.setProperty("--peel-ty", `${targetY}px`);
      echo.style.setProperty("--peel-tz", `${targetZ}px`);
      echo.style.setProperty("--peel-rot-x", `${targetRotX}deg`);
    });
  }
}
