/**
 * Editor ↔ reference-layer focus depth (hold Alt) and ghost mode.
 *
 * `depth` 0 = editor focused, 1 = reference layer focused: the editor blurs,
 * fades, and shrinks while the reference layer zooms in. Ghost mode fades the
 * editor out after 4s of inactivity and restores it on activity.
 */
export class FocusDepth {
  /**
   * @param {{
   *   editorEl: HTMLElement,
   *   opacitySlider: HTMLInputElement,
   *   referenceLayer?: HTMLElement | null,
   *   referenceOverlay?: HTMLElement | null,
   *   fogLayerEl?: HTMLElement | null,
   *   doc?: Document,
   * }} deps
   */
  constructor({
    editorEl,
    opacitySlider,
    referenceLayer = null,
    referenceOverlay = null,
    fogLayerEl = null,
    doc = document,
  }) {
    this.editorEl = editorEl;
    this.opacitySlider = opacitySlider;
    this.referenceLayer = referenceLayer;
    this.referenceOverlay = referenceOverlay;
    this.fogLayerEl = fogLayerEl;
    this.doc = doc;
    this.depth = 0;
    /** Depth used while Alt is held. */
    this.preferredDepth = 1.0;
    this.isAltDown = false;
    this.ghostMode = false;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._ghostTimer = null;
  }

  /** @param {number} depth */
  setDepth(depth) {
    this.depth = Math.max(0, Math.min(1, depth));
    this.updateVisuals();
  }

  updateVisuals() {
    const { editorEl, depth } = this;
    const maxOpacity = parseFloat(this.opacitySlider.value) || 1;
    const targetOpacity = Math.max(0.02, maxOpacity * (1 - depth * 0.95));
    const refScale = 1 + depth * 0.08;
    const editorScale = 1 - depth * 0.05;
    const filter = `blur(${depth * 8}px)`;
    const transform = `scale(${editorScale}) translateZ(0)`;
    const pointerEvents = depth > 0.6 ? "none" : "auto";

    for (const el of [editorEl, this.doc.getElementById("image-viewer")]) {
      if (!el) continue;
      el.style.opacity = String(targetOpacity);
      el.style.filter = filter;
      el.style.transform = transform;
      el.style.pointerEvents = pointerEvents;
    }

    if (this.referenceLayer) {
      this.referenceLayer.style.transform = `scale(${refScale}) translateZ(0)`;
    }
    if (this.referenceOverlay) {
      this.referenceOverlay.style.opacity = String(1 - depth);
    }
    if (this.fogLayerEl) {
      this.fogLayerEl.style.opacity = String(1 - depth * 0.5);
    }
  }

  /** @param {boolean} on */
  setGhostMode(on) {
    this.ghostMode = on;
    if (!on) {
      if (this._ghostTimer) clearTimeout(this._ghostTimer);
      this.editorEl.style.opacity = this.opacitySlider.value;
    } else {
      this.noteActivity();
    }
  }

  /** Restart the ghost-mode idle timer (called on any user activity). */
  noteActivity() {
    if (!this.ghostMode) return;
    if (this.depth > 0.1) return; // don't interfere while focusing the reference layer

    if (this.editorEl.style.opacity !== this.opacitySlider.value) {
      this.updateVisuals();
    }
    if (this._ghostTimer) clearTimeout(this._ghostTimer);
    this._ghostTimer = setTimeout(() => {
      if (this.depth < 0.1) this.editorEl.style.opacity = "0.05";
    }, 4000);
  }
}
