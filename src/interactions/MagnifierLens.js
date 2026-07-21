import { InputRegistry } from "./InputRegistry.js";


export class MagnifierLens {
  constructor({ eventTarget = document, body = document.body } = {}) {
    this.eventTarget = eventTarget;
    this.body = body;
    this.inputs = new InputRegistry();

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
  }

  init() {
    this.inputs.listen(this.eventTarget, "keydown", this.handleKeyDown);
    this.inputs.listen(this.eventTarget, "keyup", this.handleKeyUp);
    this.inputs.listen(this.eventTarget, "mousemove", this.handlePointerMove);
    return this;
  }

  destroy() {
    this.inputs.dispose();
    this.body.classList.remove(
      "magnifier-active",
      "obscured-magnifier-active",
    );
  }

  handleKeyDown(event) {
    const isMagnifierShortcut =
      event.altKey &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      event.code === "KeyM";

    if (!isMagnifierShortcut) return;

    event.preventDefault();
    this.body.classList.add(
      "magnifier-active",
      "obscured-magnifier-active",
    );
  }

  handleKeyUp(event) {
    if (event.key === "m" || event.key === "M" || event.key === "Alt") {
      this.body.classList.remove(
        "magnifier-active",
        "obscured-magnifier-active",
      );
    }

    if (event.key === "Shift") {
      this.body.classList.remove("obscured-magnifier-active");
    }
  }

  handlePointerMove(event) {
    if (!this.body.classList.contains("magnifier-active")) return;

    this.body.style.setProperty("--lens-x", `${event.clientX}px`);
    this.body.style.setProperty("--lens-y", `${event.clientY}px`);
  }

  getState() {
    return {
      active: this.body.classList.contains("magnifier-active"),
      obscured: this.body.classList.contains("obscured-magnifier-active"),
    };
  }
}


export function initMagnifierLens(context) {
  return new MagnifierLens(context).init();
}
