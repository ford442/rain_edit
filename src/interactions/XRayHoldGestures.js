// @ts-check

/**
 * The two x-ray hold bindings: Ctrl/Cmd is the editor x-ray, Alt+Shift+X is
 * the semantic x-ray. Both are simple `x-ray-active` class toggles with no
 * per-frame behavior, registered together since they share a name and CSS
 * target but are otherwise independent gestures.
 */
export class XRayHoldGestures {
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
  }

  init() {
    this.inputManager.register({
      id: "x-ray",
      category: "lens",
      description: "Editor x-ray (hold Ctrl/Cmd)",
      combo: { ctrlOrMeta: true },
      type: "hold",
      preventDefault: false,
      allowInEditor: true,
      onDown: () => {
        const editorEl = /** @type {HTMLElement | undefined} */ (this.win.editorEl);
        if (editorEl) editorEl.classList.add("x-ray-active");
        this.doc.body.classList.add("x-ray-active");
      },
      onUp: () => {
        const editorEl = /** @type {HTMLElement | undefined} */ (this.win.editorEl);
        if (editorEl) editorEl.classList.remove("x-ray-active");
        this.doc.body.classList.remove("x-ray-active");
      },
    });

    this.inputManager.register({
      id: "semantic-xray",
      category: "lens",
      description: "Semantic x-ray (Alt+Shift+X)",
      combo: { alt: true, shift: true, code: "KeyX" },
      type: "hold",
      preventDefault: false,
      onDown: () => this.doc.body.classList.add("x-ray-active"),
      onUp: () => this.doc.body.classList.remove("x-ray-active"),
    });

    return this;
  }

  destroy() {}
}
