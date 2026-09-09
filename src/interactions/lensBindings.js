import { registerLensGroupA } from "./lensBindings/groupA.js";
import { registerLensGroupB } from "./lensBindings/groupB.js";
import { registerLensGroupC } from "./lensBindings/groupC.js";

/**
 * Lens-family shortcuts (obscured magnifier + magnetic separation), migrated
 * off the old `MagnifierLens` / `MagneticRepulsion` classes so they dispatch
 * through the single InputManager. They share the mutual-exclusion group "lens"
 * so activating one releases the other instead of leaving stale classes behind.
 *
 * The individual `manager.register(...)` calls are split across
 * `lensBindings/groupA.js`, `groupB.js`, and `groupC.js` purely to keep each
 * file under a manageable size; every binding is independent and the split
 * does not affect registration order requirements.
 */
export function registerLensBindings(manager, { doc = document } = {}) {
  const body = doc.body;

  registerLensGroupA(manager, doc, body);
  registerLensGroupB(manager, doc, body);
  registerLensGroupC(manager, doc, body);

  // Pointer tracking for the lens center (was MagnifierLens.handlePointerMove).
  if (typeof doc.addEventListener === "function") {
    doc.addEventListener("mousemove", (e) => {
      if (!body.classList.contains("loupe-active")) return;
      body.style.setProperty("--lens-x", `${e.clientX}px`);
      body.style.setProperty("--lens-y", `${e.clientY}px`);
    });
  }
}
