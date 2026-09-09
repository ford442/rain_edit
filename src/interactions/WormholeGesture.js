// @ts-check
import { InputRegistry } from "./InputRegistry.js";
import { queryEchoes } from "./depthState.js";

/**
 * Gravitational wormhole (hold Ctrl+Alt): pulls nearby echoes toward the
 * cursor and forward in Z while held, releasing cleanly on keyup.
 */
export class WormholeGesture {
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
      id: "wormhole",
      category: "depth",
      description: "Wormhole warp (hold Ctrl+Alt)",
      combo: { ctrl: true, alt: true },
      type: "hold",
      preventDefault: false,
      allowInEditor: true,
      onDown: () => {
        this.isActive = true;
      },
      onUp: () => {
        this.isActive = false;
        const echoLayerEl = /** @type {HTMLElement | undefined} */ (this.win.echoLayerEl);
        queryEchoes(echoLayerEl).forEach((echo) => {
          echo.style.removeProperty("--wormhole-tx");
          echo.style.removeProperty("--wormhole-ty");
          echo.style.removeProperty("--wormhole-tz");
          echo.style.removeProperty("--wormhole-scale");
        });
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
    if (!echoLayerEl) return;

    queryEchoes(echoLayerEl).forEach((echo) => {
      const rect = echo.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const maxDist = 300;
      if (dist < maxDist) {
        const pull = 1 - dist / maxDist; // 0 to 1
        const pullFactor = Math.pow(pull, 2); // stronger near center

        echo.style.setProperty("--wormhole-tx", `${dx * pullFactor * 0.8}px`);
        echo.style.setProperty("--wormhole-ty", `${dy * pullFactor * 0.8}px`);
        echo.style.setProperty("--wormhole-tz", `${pullFactor * 150}px`); // pull forward
        echo.style.setProperty("--wormhole-scale", `${1 + pullFactor * 0.2}`);
      } else {
        echo.style.setProperty("--wormhole-tx", "0px");
        echo.style.setProperty("--wormhole-ty", "0px");
        echo.style.setProperty("--wormhole-tz", "0px");
        echo.style.setProperty("--wormhole-scale", "1");
      }
    });
  }
}
