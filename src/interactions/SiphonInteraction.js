// @ts-check
import { monaco } from "../editor/setupMonaco.js";
import { InputRegistry } from "./InputRegistry.js";

/**
 * Holographic Siphon (hold Alt+Shift+W): drag selected text from an echo
 * document into the editor (via native drag-and-drop, or by releasing a
 * text selection made inside an echo) and it's spliced in at the cursor
 * with a packet-flight animation.
 */
export class SiphonInteraction {
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

    this._handleDragOver = this._handleDragOver.bind(this);
    this._handleDrop = this._handleDrop.bind(this);
    this._handleMouseUp = this._handleMouseUp.bind(this);
  }

  init() {
    this.inputManager.register({
      id: "siphon-mode",
      category: "reveal",
      description: "Holographic siphon mode (Alt+Shift+W)",
      combo: { alt: true, shift: true, code: "KeyW" },
      type: "hold",
      onDown: () => {
        this.doc.body.classList.add("siphon-mode-active");
        this.doc.body.classList.remove("semantic-xray-active");
      },
      onUp: () => {
        this.doc.body.classList.remove("semantic-xray-active");
        this.doc.body.classList.remove("siphon-mode-active");
      },
    });

    const editorEl = /** @type {HTMLElement | undefined} */ (this.win.editorEl);
    if (editorEl) {
      this.registry.listen(editorEl, "dragover", this._handleDragOver);
      this.registry.listen(editorEl, "drop", this._handleDrop);
    }
    this.registry.listen(this.doc, "mouseup", this._handleMouseUp);
    return this;
  }

  destroy() {
    this.registry.dispose();
  }

  /** @param {DragEvent} e */
  _handleDragOver(e) {
    if (!this.doc.body.classList.contains("siphon-mode-active")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  /** @param {DragEvent} e */
  _handleDrop(e) {
    if (!this.doc.body.classList.contains("siphon-mode-active")) return;

    e.preventDefault();
    const selectedText = e.dataTransfer.getData("text/plain");
    if (!selectedText || !selectedText.trim()) return;

    const editor = /** @type {any} */ (this.win.editor);
    if (!editor) return;

    const targetPosition = editor.getTargetAtClientPoint(e.clientX, e.clientY);

    let position = editor.getPosition();
    if (targetPosition && targetPosition.position) {
      position = targetPosition.position;
    }

    this.win.fireSiphonPacket(selectedText, e.clientX, e.clientY - 100);

    if (position) {
      editor.executeEdits("siphon-drop", [
        {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column,
          ),
          text: selectedText,
          forceMoveMarkers: true,
        },
      ]);

      this.doc.body.classList.add("shockwave-hit");
      setTimeout(() => this.doc.body.classList.remove("shockwave-hit"), 400);
    }
  }

  /** @param {MouseEvent} e */
  _handleMouseUp(e) {
    if (!this.doc.body.classList.contains("siphon-mode-active")) return;

    const selection = this.win.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString();
    if (!selectedText.trim()) return;

    let target = /** @type {HTMLElement | null} */ (e.target);
    let inEchoDoc = false;
    while (target && target !== this.doc.body) {
      if (target.classList && target.classList.contains("echo-document")) {
        inEchoDoc = true;
        break;
      }
      target = target.parentElement;
    }

    const editor = /** @type {any} */ (this.win.editor);
    if (inEchoDoc && editor) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      selection.removeAllRanges();

      this.win.fireSiphonPacket(selectedText, rect.left, rect.top);

      const position = editor.getPosition();
      if (position) {
        editor.executeEdits("siphon", [
          {
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column,
            ),
            text: selectedText,
            forceMoveMarkers: true,
          },
        ]);

        this.doc.body.classList.add("shockwave-hit");
        setTimeout(() => this.doc.body.classList.remove("shockwave-hit"), 400);
      }
    }
  }
}
