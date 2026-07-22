/**
 * Lens-family shortcuts (obscured magnifier + magnetic separation), migrated
 * off the old `MagnifierLens` / `MagneticRepulsion` classes so they dispatch
 * through the single InputManager. They share the mutual-exclusion group "lens"
 * so activating one releases the other instead of leaving stale classes behind.
 */
export function registerLensBindings(manager, { doc = document } = {}) {
  const body = doc.body;

  manager.register({
    id: "magnifier",
    category: "lens",
    description: "Obscured-layer magnifier lens (Alt+M)",
    combo: { alt: true, code: "KeyM" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("magnifier-active", "obscured-magnifier-active"),
    onUp: () => body.classList.remove("magnifier-active", "obscured-magnifier-active"),
  });

  manager.register({
    id: "magnetic-separation",
    category: "lens",
    description: "Magnetic layer separation (Alt+Shift+M)",
    combo: { alt: true, shift: true, code: "KeyM" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("magnifier-active", "magnetic-sep-active"),
    onUp: () => body.classList.remove("magnifier-active", "magnetic-sep-active"),
  });

  // Pointer tracking for the lens center (was MagnifierLens.handlePointerMove).
  if (typeof doc.addEventListener === "function") {
    doc.addEventListener("mousemove", (e) => {
      if (!body.classList.contains("magnifier-active")) return;
      body.style.setProperty("--lens-x", `${e.clientX}px`);
      body.style.setProperty("--lens-y", `${e.clientY}px`);
    });
  }
}
