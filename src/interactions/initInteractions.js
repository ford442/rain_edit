import { inputManager } from "./InputManager.js";
import { CheatsheetOverlay } from "./CheatsheetOverlay.js";

/**
 * Boots the shared keyboard dispatcher and wires the generated cheatsheet.
 *
 * Individual features register their own bindings (colocated with their state)
 * against the same `inputManager` singleton; this only needs to run once, after
 * those registrations, to start the capture-phase listeners. It is safe to call
 * multiple times — `start()` is idempotent.
 */
export function initInteractions(manager = inputManager) {
  if (!manager) return null;

  const cheatsheet = new CheatsheetOverlay(manager);
  manager.__cheatsheet = cheatsheet;

  if (!manager.bindings.has("cheatsheet-toggle")) {
    manager.register({
      id: "cheatsheet-toggle",
      category: "help",
      description: "Show/hide keyboard cheatsheet",
      combo: { key: "?" },
      type: "action",
      onDown: () => cheatsheet.toggle(),
    });
    manager.register({
      id: "cheatsheet-toggle-alt",
      category: "help",
      description: "Show/hide keyboard cheatsheet",
      combo: { alt: true, key: "/" },
      type: "action",
      onDown: () => cheatsheet.toggle(),
    });
    manager.register({
      id: "cheatsheet-close",
      category: "help",
      description: "Close cheatsheet",
      combo: { key: "Escape" },
      type: "action",
      preventDefault: false,
      when: () => !!cheatsheet.el,
      onDown: () => cheatsheet.hide(),
    });
  }

  manager.start();
  return manager;
}
