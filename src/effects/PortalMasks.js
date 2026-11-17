/**
 * `// @portal` comments punch see-through holes in the editor.
 *
 * `scan()` collects portal line numbers from the active model; `update()`
 * rebuilds the editor's inline mask (portal holes ∩ the x-ray / lens / sonar
 * holes, which must be re-added inline because inline masks override the CSS
 * classes) and the `.portal-ring` visuals. `requestUpdate()` coalesces
 * repeated requests into one update on the next AppClock frame.
 */
export class PortalMasks {
  /**
   * @param {{
   *   editor: import("monaco-editor").editor.IStandaloneCodeEditor,
   *   editorEl: HTMLElement,
   *   portalLayer: HTMLElement | null,
   *   clock: import("../runtime/AppClock.js").AppClock,
   *   doc?: Document,
   * }} deps
   */
  constructor({ editor, editorEl, portalLayer, clock, doc = document }) {
    this.editor = editor;
    this.editorEl = editorEl;
    this.portalLayer = portalLayer;
    this.clock = clock;
    this.doc = doc;
    /** @type {number[]} */
    this.lines = [];
    this._pending = false;
    this.scan = this.scan.bind(this);
    this.update = this.update.bind(this);
    this.requestUpdate = this.requestUpdate.bind(this);
  }

  get hasPortals() {
    return this.lines.length > 0;
  }

  scan() {
    const model = this.editor.getModel();
    if (!model) return;
    this.lines = [];
    model.getLinesContent().forEach((line, index) => {
      if (line.includes("// @portal")) this.lines.push(index + 1);
    });
    this.update();
  }

  requestUpdate() {
    if (this._pending) return;
    this._pending = true;
    this.clock.nextFrame(() => {
      this._pending = false;
      this.update();
    });
  }

  update() {
    const { editorEl, editor } = this;
    if (!editorEl) return;

    /** @type {Array<{ x: number, y: number }>} */
    const portals = [];
    this.lines.forEach((lineNumber) => {
      const pos = editor.getScrolledVisiblePosition({ lineNumber, column: 1 });
      if (pos) portals.push({ x: pos.left + 60, y: pos.top + 10 });
    });

    if (this.portalLayer) {
      this.portalLayer.innerHTML = "";
      portals.forEach((p) => {
        const ring = this.doc.createElement("div");
        ring.className = "portal-ring";
        Object.assign(ring.style, {
          position: "absolute",
          left: p.x - 50 + "px",
          top: p.y - 50 + "px",
          width: "100px",
          height: "100px",
        });
        this.portalLayer.appendChild(ring);
      });
    }

    // No portals: clear inline masks so the CSS classes apply again.
    if (portals.length === 0) {
      this._clearMask();
      return;
    }

    const maskLayers = [
      portals
        .map(
          (p) =>
            `radial-gradient(circle at ${p.x}px ${p.y}px, transparent 0px, transparent 100px, black 150px)`,
        )
        .join(", "),
    ];

    const bodyStyle = this.doc.body.style;
    const mx = bodyStyle.getPropertyValue("--mouse-x") || "50%";
    const my = bodyStyle.getPropertyValue("--mouse-y") || "50%";
    if (editorEl.classList.contains("lens-active")) {
      maskLayers.push(`radial-gradient(circle at ${mx} ${my}, transparent 160px, black 320px)`);
    } else if (editorEl.classList.contains("x-ray-active")) {
      maskLayers.push(`radial-gradient(circle at ${mx} ${my}, transparent 100px, black 250px)`);
    }

    if (editorEl.classList.contains("sonar-active")) {
      const sx = editorEl.style.getPropertyValue("--sonar-x") || "50%";
      const sy = editorEl.style.getPropertyValue("--sonar-y") || "50%";
      const sr = editorEl.style.getPropertyValue("--sonar-radius") || "0px";
      maskLayers.push(
        `radial-gradient(circle at ${sx} ${sy}, black calc(${sr} - 150px), transparent ${sr}, black calc(${sr} + 150px))`,
      );
    }

    const finalMask = maskLayers.join(", ");
    editorEl.style.maskImage = finalMask;
    editorEl.style.webkitMaskImage = finalMask;
    editorEl.style.maskComposite = "intersect";
    editorEl.style.webkitMaskComposite = "source-in";
  }

  /** True when a reveal mode that needs the inline mask refreshed is active. */
  get needsPointerUpdates() {
    if (!this.hasPortals) return false;
    const cl = this.editorEl.classList;
    return cl.contains("x-ray-active") || cl.contains("lens-active") || cl.contains("sonar-active");
  }

  _clearMask() {
    const style = this.editorEl.style;
    style.maskImage = "";
    style.webkitMaskImage = "";
    style.maskComposite = "";
    style.webkitMaskComposite = "";
  }
}
