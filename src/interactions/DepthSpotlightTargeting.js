// @ts-check
import { InputRegistry } from "./InputRegistry.js";
import { closestEcho } from "./depthState.js";

/**
 * Tracks which echo-document is closest to the cursor while Depth Spotlight
 * or Hologram Preview is active (bindings for both live in
 * `EchoDocumentInteractions.js`) and marks it as the current target.
 */
export class DepthSpotlightTargeting {
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
    const body = this.doc.body;
    const spotlightActive = body.classList.contains("depth-spotlight-active");
    const hologramActive = body.classList.contains("hologram-preview-active");
    if (!spotlightActive && !hologramActive) return;

    const echoes = Array.from(this.doc.querySelectorAll(".echo-document"));

    echoes.forEach((echo) => {
      echo.classList.remove("spotlight-target");
      echo.classList.remove("hologram-target");
    });

    const nearest = closestEcho(echoes, e.clientX, e.clientY);
    if (!nearest) return;

    if (spotlightActive) nearest.echo.classList.add("spotlight-target");
    if (hologramActive) nearest.echo.classList.add("hologram-target");
  }
}
