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
    id: "xray-core",
    category: "lens",
    description: "X-Ray Core Lens (Alt+C)",
    combo: { alt: true, code: "KeyC" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("magnifier-active", "xray-core-active"),
    onUp: () => body.classList.remove("magnifier-active", "xray-core-active"),
  });

  manager.register({
    id: "quantum-scanner",
    category: "lens",
    description: "Quantum Scanner Lens (Alt+N)",
    combo: { alt: true, code: "KeyN" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("magnifier-active", "quantum-scanner-active"),
    onUp: () => body.classList.remove("magnifier-active", "quantum-scanner-active"),
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

  manager.register({
    id: "chrono-ghost",
    category: "lens",
    description: "Chrono-Ghost Wireframe Lens (Alt+F)",
    combo: { alt: true, code: "KeyF" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("magnifier-active", "chrono-ghost-active"),
    onUp: () => body.classList.remove("magnifier-active", "chrono-ghost-active"),
  });

  manager.register({
    id: "blacklight-reveal",
    category: "lens",
    description: "Blacklight Reveal Lens (Alt+Shift+L)",
    combo: { alt: true, shift: true, code: "KeyL" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("magnifier-active", "blacklight-reveal-active"),
    onUp: () => body.classList.remove("magnifier-active", "blacklight-reveal-active"),
  });

  manager.register({
    id: "geometric-shatter",
    category: "lens",
    description: "Geometric Shatter Lens (Alt+Shift+G)",
    combo: { alt: true, shift: true, code: "KeyG" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "geometric-shatter-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => {
          doc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "geometric-shatter-active"),
  });

  manager.register({
    id: "kaleidoscope-split",
    category: "lens",
    description: "Kaleidoscope Split Lens (Alt+Shift+K)",
    combo: { alt: true, shift: true, code: "KeyK" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "kaleidoscope-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => {
          doc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "kaleidoscope-active"),
  });


  manager.register({
    id: "prismatic-unfold",
    category: "lens",
    description: "Prismatic unfold / fan (Alt+Shift+U)",
    combo: { alt: true, shift: true, code: "KeyU" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("prismatic-unfold-active");
      // Set an item-index variable for each document so we can fan them out in CSS
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => {
          doc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("prismatic-unfold-active"),
  });

  manager.register({
    id: "thermal-vision",
    category: "lens",
    description: "Thermal Vision Lens (Alt+B)",
    combo: { alt: true, code: "KeyB" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "thermal-vision-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => {
          doc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "thermal-vision-active"),
  });

  manager.register({
    id: "chromatic-aberration",
    category: "lens",
    description: "Chromatic Aberration Lens (Alt+Shift+C)",
    combo: { alt: true, shift: true, code: "KeyC" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "chromatic-aberration-active");
      const echoLayer = doc.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "chromatic-aberration-active"),
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
