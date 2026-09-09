// @ts-check
import { InputRegistry } from "./InputRegistry.js";
import { normalizedPointerInRect, queryEchoes } from "./depthState.js";

/**
 * Drives the echo-layer's continuous mouse-parallax: per-echo depth
 * translate/tilt, plus the whole-layer orbit / solar-system / helix global
 * rotation that view modes opt into. Skipped entirely in cascade view, and
 * skipped per-echo while an echo is peeking, matching the historic
 * `main_init_1.js` behavior this was extracted from.
 */
export class EchoLayerParallax {
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
    if (!echoLayerEl || !tabManager || tabManager.isCascadeView) return;

    const editorEl = /** @type {HTMLElement | undefined} */ (this.win.editorEl);
    if (!editorEl) return;
    const { x, y } = normalizedPointerInRect(editorEl, e.clientX, e.clientY);

    const echoes = queryEchoes(echoLayerEl);

    if (tabManager.isOrbitView) {
      const orbitRot = -x * 360;
      echoLayerEl.style.setProperty("--orbit-global-rot", `${orbitRot}deg`);
    }

    if (tabManager.isSolarSystemView) {
      const solarRotX = y * 30 + 60; // Base tilt 60deg + 30deg from mouse
      const solarRotY = x * 20;
      echoLayerEl.style.setProperty("--solar-global-rot-x", `${solarRotX}deg`);
      echoLayerEl.style.setProperty("--solar-global-rot-y", `${solarRotY}deg`);
    }

    if (tabManager.isHelixView) {
      const helixRot = -x * 360;
      echoLayerEl.style.setProperty("--helix-global-rot", `${helixRot}deg`);
    }

    echoes.forEach((echo, index) => {
      // Don't apply parallax if peeking (handled by CSS)
      if (echo.classList.contains("peek")) return;

      const depthOffset = (index + 1) * 2;
      const moveX = -x * 20 * depthOffset;
      const moveY = -y * 20 * depthOffset;

      echo.style.setProperty("--tx", `${depthOffset * 2 + moveX}px`);
      echo.style.setProperty("--ty", `${depthOffset * 2 + moveY}px`);

      const rotX = y * 5 * depthOffset;
      const rotY = -x * 5 * depthOffset;
      echo.style.setProperty("--rot-x", `${rotX}deg`);
      echo.style.setProperty("--rot-y", `${rotY}deg`);
    });
  }
}
