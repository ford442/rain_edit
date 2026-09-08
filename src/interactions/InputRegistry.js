// @ts-check

/**
 * @typedef {object} ListenerEntry
 * @property {EventTarget} target
 * @property {string} type
 * @property {EventListenerOrEventListenerObject} listener
 * @property {boolean | AddEventListenerOptions | undefined} options
 */

export class InputRegistry {
  constructor() {
    /** @type {ListenerEntry[]} */
    this.listeners = [];
  }

  /**
   * @param {EventTarget} target
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} listener
   * @param {boolean | AddEventListenerOptions} [options]
   * @returns {EventListenerOrEventListenerObject}
   */
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
