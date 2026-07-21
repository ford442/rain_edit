import { InputRegistry } from "./InputRegistry.js";


export class MagneticRepulsion {
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
    this.body.classList.remove("magnifier-active", "magnetic-sep-active");
  }

  handleKeyDown(event) {
    const isRepulsionShortcut =
      event.altKey &&
      event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      event.code === "KeyM";

    if (!isRepulsionShortcut) return;

    event.preventDefault();
    this.body.classList.add("magnifier-active", "magnetic-sep-active");
  }

  handleKeyUp(event) {
    if (event.key === "m" || event.key === "M" || event.key === "Alt") {
      this.body.classList.remove("magnifier-active");
    }

    if (
      event.key === "m" ||
      event.key === "M" ||
      event.key === "Alt" ||
      event.key === "Shift"
    ) {
      this.body.classList.remove("magnetic-sep-active");
    }
  }

  handlePointerMove(event) {
    if (!this.body.classList.contains("magnetic-sep-active")) return;

    this.body.style.setProperty("--mouse-x", `${event.clientX}px`);
    this.body.style.setProperty("--mouse-y", `${event.clientY}px`);
  }

  getState() {
    return {
      active: this.body.classList.contains("magnetic-sep-active"),
    };
  }
}


export function initMagneticRepulsion(context) {
  return new MagneticRepulsion(context).init();
}
