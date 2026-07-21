export class InputRegistry {
  constructor() {
    this.listeners = [];
  }

  listen(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    this.listeners.push({ target, type, listener, options });
    return listener;
  }

  dispose() {
    for (const { target, type, listener, options } of this.listeners.splice(0)) {
      target.removeEventListener(type, listener, options);
    }
  }
}
