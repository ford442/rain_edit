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


  manager.register({
    id: "aurora-layer-shift",
    category: "lens",
    description: "Aurora Layer Shift (Alt+Shift+A)",
    combo: { alt: true, shift: true, code: "KeyA" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "aurora-shift-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => {
          doc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "aurora-shift-active"),
  });


  manager.register({
    id: "ripple-displacement",
    category: "lens",
    description: "Ripple Displacement (Alt+Shift+R)",
    combo: { alt: true, shift: true, code: "KeyR" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("magnifier-active", "ripple-displacement-active"),
    onUp: () => body.classList.remove("magnifier-active", "ripple-displacement-active"),
  });

  manager.register({
    id: "neon-pulse",
    category: "lens",
    description: "Neon Pulse Lens (Alt+Shift+N)",
    combo: { alt: true, shift: true, code: "KeyN" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("magnifier-active", "neon-pulse-active"),
    onUp: () => body.classList.remove("magnifier-active", "neon-pulse-active"),
  });

  manager.register({
    id: "ethereal-glitch",
    category: "lens",
    description: "Ethereal Glitch Lens (Alt+Shift+J)",
    combo: { alt: true, shift: true, code: "KeyJ" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("magnifier-active", "ethereal-glitch-active"),
    onUp: () => body.classList.remove("magnifier-active", "ethereal-glitch-active"),
  });

  manager.register({
    id: "cyber-grid-hologram",
    category: "lens",
    description: "Cyber-Grid Hologram Lens (Alt+Shift+F)",
    combo: { alt: true, shift: true, code: "KeyF" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "cyber-grid-hologram-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "cyber-grid-hologram-active"),
  });


  // Pointer tracking for the lens center (was MagnifierLens.handlePointerMove).
  manager.register({
    id: "spectral-refraction",
    category: "lens",
    description: "Spectral Refraction Lens (Alt+Shift+W)",
    combo: { alt: true, shift: true, code: "KeyW" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "spectral-refraction-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "spectral-refraction-active"),
  });

  manager.register({
    id: "topographic-contour",
    category: "lens",
    description: "Topographic Contour Lens (Alt+Shift+Z)",
    combo: { alt: true, shift: true, code: "KeyZ" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "topographic-contour-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "topographic-contour-active"),
  });

  manager.register({
    id: "magma-core",
    category: "lens",
    description: "Magma Core Lens (Alt+Shift+I)",
    combo: { alt: true, shift: true, code: "KeyI" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "magma-core-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "magma-core-active"),
  });

  manager.register({
    id: "ectoplasmic-ooze",
    category: "lens",
    description: "Ectoplasmic Ooze Lens (Alt+Shift+Y)",
    combo: { alt: true, shift: true, code: "KeyY" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "ectoplasmic-ooze-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "ectoplasmic-ooze-active"),
  });

  manager.register({
    id: "zenith-halo",
    category: "lens",
    description: "Zenith Halo Lens (Alt+Shift+H)",
    combo: { alt: true, shift: true, code: "KeyH" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "zenith-halo-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "zenith-halo-active"),
  });

  manager.register({
    id: "quantum-fracture",
    category: "lens",
    description: "Quantum Fracture Lens (Alt+Shift+Q)",
    combo: { alt: true, shift: true, code: "KeyQ" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "quantum-fracture-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "quantum-fracture-active"),
  });

  manager.register({
    id: "cosmic-void",
    category: "lens",
    description: "Cosmic Void Lens (Alt+Shift+V)",
    combo: { alt: true, shift: true, code: "KeyV" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "cosmic-void-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "cosmic-void-active"),
  });

  manager.register({
    id: "bioluminescent-trace",
    category: "lens",
    description: "Bioluminescent Trace Lens (Alt+Shift+T)",
    combo: { alt: true, shift: true, code: "KeyT" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "bioluminescent-trace-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "bioluminescent-trace-active"),
  });

  manager.register({
    id: "digital-matrix-decode",
    category: "lens",
    description: "Digital Matrix Decode Lens (Alt+Shift+O)",
    combo: { alt: true, shift: true, code: "KeyO" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "digital-matrix-decode-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "digital-matrix-decode-active"),
  });

  if (typeof doc.addEventListener === "function") {
    doc.addEventListener("mousemove", (e) => {
      if (!body.classList.contains("magnifier-active")) return;
      body.style.setProperty("--lens-x", `${e.clientX}px`);
      body.style.setProperty("--lens-y", `${e.clientY}px`);
    });
  }
}
