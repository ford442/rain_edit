import { interactionState } from "../interactions/interactionState.js";

/**
 * Cinematic autofocus: a depth-of-field effect that follows the cursor.
 *
 * Two AppClock tasks run while enabled:
 *  - `autofocus` eases toward `interactionState.autofocusTargetZ` (set by
 *    `CinematicAutofocusTargeting` from the hovered echo's depth band) and
 *    writes `--af-blur` / `--af-brightness` on every echo document;
 *  - `cinematic-focus` eases a focal plane toward the hovered element's
 *    `--depth-index` and applies blur/brightness/opacity inline to the editor
 *    and echoes.
 *
 * Both were historically bound to the same `#cinematic-autofocus-mode`
 * checkbox (it was duplicated in index.html); one toggle drives both.
 */
export class CinematicFocus {
  /**
   * @param {{
   *   editorEl: HTMLElement,
   *   echoLayerEl: HTMLElement | null,
   *   opacitySlider?: HTMLInputElement | null,
   *   clock: import("../runtime/AppClock.js").AppClock,
   *   doc?: Document,
   *   state?: typeof interactionState,
   * }} deps
   */
  constructor({ editorEl, echoLayerEl, opacitySlider = null, clock, doc = document, state = interactionState }) {
    this.editorEl = editorEl;
    this.echoLayerEl = echoLayerEl;
    this.opacitySlider = opacitySlider;
    this.clock = clock;
    this.doc = doc;
    this.state = state;
    this.enabled = false;
    this.autofocusCurrentZ = 0;
    this.currentZ = 0;
    this.targetZ = 0;
    this._onMouseMove = this._onMouseMove.bind(this);
  }

  init() {
    this.doc.addEventListener("mousemove", this._onMouseMove);
    this.clock.register({
      id: "autofocus",
      active: () => this.state.isAutofocusActive,
      update: () => this._stepAutofocus(),
    });
    this.clock.register({
      id: "cinematic-focus",
      active: () => this.enabled,
      update: () => this._stepCinematic(),
    });
    return this;
  }

  /** @param {boolean} on */
  setEnabled(on) {
    this.enabled = on;
    this.state.isAutofocusActive = on;
    this.doc.body.classList.toggle("cinematic-autofocus-active", on);
    if (!on) this._reset();
  }

  _echoes() {
    return this.echoLayerEl
      ? /** @type {NodeListOf<HTMLElement>} */ (this.echoLayerEl.querySelectorAll(".echo-document"))
      : [];
  }

  _stepAutofocus() {
    this.autofocusCurrentZ += (this.state.autofocusTargetZ - this.autofocusCurrentZ) * 0.1;
    this._echoes().forEach((doc) => {
      const depth = parseInt(doc.dataset.depth || "0", 10);
      const docZ = depth === 0 ? -400 : depth === 2 ? 400 : 0;
      const distance = Math.abs(docZ - this.autofocusCurrentZ);
      // Max distance ≈ 800 → blur 0–15px, brightness 1–0.4.
      doc.style.setProperty("--af-blur", `${Math.min(15, (distance / 800) * 15)}px`);
      doc.style.setProperty("--af-brightness", `${1 - Math.min(0.6, (distance / 800) * 0.6)}`);
    });
  }

  _stepCinematic() {
    this.currentZ += (this.targetZ - this.currentZ) * 0.08;

    const editorDist = Math.abs(this.currentZ - -1);
    this.editorEl.style.filter = `blur(${editorDist * 2.5}px)`;
    this.editorEl.style.opacity = String(Math.max(0.3, 1 - editorDist * 0.15));

    this._echoes().forEach((echo) => {
      const zIndex = parseInt(echo.style.getPropertyValue("--depth-index") || "0", 10);
      const dist = Math.abs(this.currentZ - zIndex);
      const brightness = Math.max(0.4, 1 - dist * 0.1);
      echo.style.filter = `blur(${dist * 2.5}px) brightness(${brightness})`;
      echo.style.opacity = String(Math.max(0.2, 0.8 - dist * 0.08));
    });
  }

  /** @param {MouseEvent} e */
  _onMouseMove(e) {
    if (!this.enabled) return;
    const target = this.doc.elementFromPoint(e.clientX, e.clientY);
    const echoDoc = /** @type {HTMLElement | null} */ (target ? target.closest(".echo-document") : null);
    if (echoDoc) {
      this.targetZ = parseInt(echoDoc.style.getPropertyValue("--depth-index") || "0", 10);
    } else if (target && target.closest("#editor")) {
      this.targetZ = -1; // editor is the foreground plane
    } else {
      this.targetZ = -0.5; // drift back toward the front
    }
  }

  _reset() {
    this.editorEl.style.filter = "";
    this.editorEl.style.opacity = this.opacitySlider ? this.opacitySlider.value : "";
    this._echoes().forEach((echo) => {
      echo.style.removeProperty("--af-blur");
      echo.style.removeProperty("--af-brightness");
      echo.style.filter = "";
      echo.style.opacity = "";
    });
  }
}
