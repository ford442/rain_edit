// @ts-check
import { InputRegistry } from "./InputRegistry.js";
import { queryEchoes } from "./depthState.js";

/**
 * Always-on per-echo proximity reactions: the "wake" glow factor, the
 * holographic-foil highlight position, a brief wave-distortion pulse when
 * the cursor passes very close, fluid repulsion away from the cursor, and
 * the neon-tracing outline once wake intensity crosses a threshold. Skipped
 * for echoes that are peeking (CSS owns that state) and while cascade view
 * or the magnifier loupe area is active — matching the historic
 * `main_init_1.js` gating this was extracted from.
 */
export class ProximityWakeGesture {
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

    queryEchoes(echoLayerEl).forEach((echo) => {
      if (echo.classList.contains("peek") || echo.classList.contains("is-peeking")) {
        echo.style.removeProperty("--wake-dist");
        return;
      }

      const rect = echo.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.sqrt(Math.pow(e.clientX - cx, 2) + Math.pow(e.clientY - cy, 2));

      const maxDist = 400; // How far the proximity wake reaches
      let wakeFactor = 0;
      if (dist < maxDist) {
        wakeFactor = 1 - dist / maxDist;
        wakeFactor = Math.pow(wakeFactor, 1.5); // Ease the wake factor so it's smooth
      }
      echo.style.setProperty("--wake-factor", wakeFactor.toFixed(3));

      if (dist < maxDist) {
        const pctX = ((e.clientX - rect.left) / rect.width) * 100;
        const pctY = ((e.clientY - rect.top) / rect.height) * 100;
        echo.style.setProperty("--foil-x", `${pctX}%`);
        echo.style.setProperty("--foil-y", `${pctY}%`);
      }

      if (dist < 150 && !echo.classList.contains("echo-wave-distortion")) {
        echo.classList.add("echo-wave-distortion");
        setTimeout(() => {
          echo.classList.remove("echo-wave-distortion");
        }, 500);
      }

      if (dist < maxDist) {
        const repelFactor = Math.pow(1 - dist / maxDist, 2);
        const dx = cx - e.clientX;
        const dy = cy - e.clientY;
        const normalizedDx = dx / (dist || 1);
        const normalizedDy = dy / (dist || 1);
        const maxRepel = 80; // pixels to repel
        echo.style.setProperty("--repel-tx", `${normalizedDx * maxRepel * repelFactor}px`);
        echo.style.setProperty("--repel-ty", `${normalizedDy * maxRepel * repelFactor}px`);
      } else {
        echo.style.setProperty("--repel-tx", `0px`);
        echo.style.setProperty("--repel-ty", `0px`);
      }

      if (wakeFactor > 0.5) {
        echo.classList.add("neon-tracing");
      } else {
        echo.classList.remove("neon-tracing");
      }
    });
  }
}
