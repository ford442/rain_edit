/**
 * Lens-family bindings, part 1 of 3 (see lensBindings.js). Split purely by
 * line count from the original single-file registration list; each binding
 * is independent and order does not affect behavior.
 */
export function registerLensGroupA(manager, doc, body) {
  manager.register({
    id: "chrono-pulse",
    category: "lens",
    description: "Chrono-Pulse Lens (Ctrl+Alt+D)",
    combo: { ctrl: true, alt: true, code: "KeyD" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "chrono-pulse-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "chrono-pulse-active"),
  });

  manager.register({
    id: "nebula-void",
    category: "lens",
    description: "Nebula Void Lens (Alt+Shift+V)",
    combo: { alt: true, shift: true, code: "NumpadAdd" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "nebula-void-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "nebula-void-active"),
  });

  manager.register({
    id: "void-echoes",
    category: "lens",
    description: "Void Echoes Lens (Ctrl+Alt+P)",
    combo: { ctrl: true, alt: true, code: "KeyP" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "void-echoes-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "void-echoes-active"),
  });
manager.register({
    id: "quantum-weaver",
    category: "lens",
    description: "Quantum Weaver Lens (Ctrl+Alt+Q)",
    combo: { ctrl: true, alt: true, code: "KeyQ" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "quantum-weaver-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "quantum-weaver-active"),
  });

  manager.register({
    id: "hyper-spatial-fold",
    category: "lens",
    description: "Hyper-Spatial Fold Lens (Ctrl+Alt+H)",
    combo: { ctrl: true, alt: true, code: "KeyH" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "hyper-spatial-fold-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "hyper-spatial-fold-active"),
  });

  manager.register({
    id: "luminous-fracture",
    category: "lens",
    description: "Luminous Fracture Lens (Ctrl+Alt+F)",
    combo: { ctrl: true, alt: true, code: "KeyF" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "luminous-fracture-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "luminous-fracture-active"),
  });

  manager.register({
    id: "celestial-resonance",
    category: "lens",
    description: "Celestial Resonance Lens (Ctrl+Alt+W)",
    combo: { ctrl: true, alt: true, code: "KeyW" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "celestial-resonance-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "celestial-resonance-active"),
  });

  manager.register({
    id: "neon-fractal-rift",
    category: "lens",
    description: "Neon Fractal Rift Lens (Ctrl+Alt+R)",
    combo: { ctrl: true, alt: true, code: "KeyR" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "neon-fractal-rift-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "neon-fractal-rift-active"),
  });


  manager.register({
    id: "dimensional-rift",
    category: "lens",
    description: "Dimensional Rift Lens (Alt+Shift+E)",
    combo: { alt: true, shift: true, code: "KeyE" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "dimensional-rift-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "dimensional-rift-active"),
  });

  manager.register({
    id: "cyber-matrix",
    category: "lens",
    description: "Cyber-Matrix Scanner (Alt+Shift+Semicolon)",
    combo: { alt: true, shift: true, code: "Semicolon" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "cyber-matrix-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "cyber-matrix-active"),
  });

  manager.register({
    id: "magnifier",
    category: "lens",
    description: "Obscured-layer magnifier lens (Alt+M)",
    combo: { alt: true, code: "KeyM" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("loupe-active"),
    onUp: () => body.classList.remove("loupe-active"),
  });

  manager.register({
    id: "nebula-core",
    category: "lens",
    description: "Nebula Core Lens (Alt+Shift+M)",
    combo: { alt: true, shift: true, code: "KeyM" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "nebula-core-active");
    },
    onUp: () => body.classList.remove("loupe-active", "nebula-core-active"),
  });

  manager.register({
    id: "xray-core",
    category: "lens",
    description: "X-Ray Core Lens (Alt+C)",
    combo: { alt: true, code: "KeyC" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("loupe-active", "xray-core-active"),
    onUp: () => body.classList.remove("loupe-active", "xray-core-active"),
  });

  manager.register({
    id: "cosmic-singularity",
    category: "lens",
    description: "Cosmic Singularity Lens (Alt+Q)",
    combo: { alt: true, code: "KeyQ" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "cosmic-singularity-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "cosmic-singularity-active"),
  });

  manager.register({
    id: "quantum-scanner",
    category: "lens",
    description: "Quantum Scanner Lens (Alt+N)",
    combo: { alt: true, code: "KeyN" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("loupe-active", "quantum-scanner-active"),
    onUp: () => body.classList.remove("loupe-active", "quantum-scanner-active"),
  });


  manager.register({
    id: "chrono-ghost",
    category: "lens",
    description: "Chrono-Ghost Wireframe Lens (Alt+F)",
    combo: { alt: true, code: "KeyF" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("loupe-active", "chrono-ghost-active"),
    onUp: () => body.classList.remove("loupe-active", "chrono-ghost-active"),
  });

  manager.register({
    id: "blacklight-reveal",
    category: "lens",
    description: "Blacklight Reveal Lens (Alt+Shift+L)",
    combo: { alt: true, shift: true, code: "KeyL" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("loupe-active", "blacklight-reveal-active"),
    onUp: () => body.classList.remove("loupe-active", "blacklight-reveal-active"),
  });

  manager.register({
    id: "geometric-shatter",
    category: "lens",
    description: "Geometric Shatter Lens (Alt+Shift+G)",
    combo: { alt: true, shift: true, code: "KeyG" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "geometric-shatter-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => {
          doc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "geometric-shatter-active"),
  });

  manager.register({
    id: "kaleidoscope-split",
    category: "lens",
    description: "Kaleidoscope Split Lens (Alt+Shift+K)",
    combo: { alt: true, shift: true, code: "KeyK" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "kaleidoscope-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => {
          doc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "kaleidoscope-active"),
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
      body.classList.add("loupe-active", "thermal-vision-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => {
          doc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "thermal-vision-active"),
  });

  manager.register({
    id: "chromatic-aberration",
    category: "lens",
    description: "Chromatic Aberration Lens (Alt+Shift+C)",
    combo: { alt: true, shift: true, code: "KeyC" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "chromatic-aberration-active");
      const echoLayer = doc.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "chromatic-aberration-active"),
  });


  manager.register({
    id: "aurora-layer-shift",
    category: "lens",
    description: "Aurora Layer Shift (Alt+Shift+A)",
    combo: { alt: true, shift: true, code: "KeyA" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "aurora-shift-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => {
          doc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "aurora-shift-active"),
  });


  manager.register({
    id: "ripple-displacement",
    category: "lens",
    description: "Ripple Displacement (Alt+Shift+R)",
    combo: { alt: true, shift: true, code: "KeyR" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("loupe-active", "ripple-displacement-active"),
    onUp: () => body.classList.remove("loupe-active", "ripple-displacement-active"),
  });

  manager.register({
    id: "neon-pulse",
    category: "lens",
    description: "Neon Pulse Lens (Alt+Shift+N)",
    combo: { alt: true, shift: true, code: "KeyN" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("loupe-active", "neon-pulse-active"),
    onUp: () => body.classList.remove("loupe-active", "neon-pulse-active"),
  });

  manager.register({
    id: "ethereal-glitch",
    category: "lens",
    description: "Ethereal Glitch Lens (Alt+Shift+J)",
    combo: { alt: true, shift: true, code: "KeyJ" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("loupe-active", "ethereal-glitch-active"),
    onUp: () => body.classList.remove("loupe-active", "ethereal-glitch-active"),
  });

  manager.register({
    id: "cyber-grid-hologram",
    category: "lens",
    description: "Cyber-Grid Hologram Lens (Alt+Shift+F)",
    combo: { alt: true, shift: true, code: "KeyF" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "cyber-grid-hologram-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "cyber-grid-hologram-active"),
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
      body.classList.add("loupe-active", "spectral-refraction-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "spectral-refraction-active"),
  });

  manager.register({
    id: "topographic-contour",
    category: "lens",
    description: "Topographic Contour Lens (Alt+Shift+Z)",
    combo: { alt: true, shift: true, code: "KeyZ" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "topographic-contour-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "topographic-contour-active"),
  });

  manager.register({
    id: "magma-core",
    category: "lens",
    description: "Magma Core Lens (Alt+Shift+I)",
    combo: { alt: true, shift: true, code: "KeyI" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "magma-core-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "magma-core-active"),
  });

  manager.register({
    id: "ectoplasmic-ooze",
    category: "lens",
    description: "Ectoplasmic Ooze Lens (Alt+Shift+Y)",
    combo: { alt: true, shift: true, code: "KeyY" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "ectoplasmic-ooze-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "ectoplasmic-ooze-active"),
  });

  manager.register({
    id: "zenith-halo",
    category: "lens",
    description: "Zenith Halo Lens (Alt+Shift+H)",
    combo: { alt: true, shift: true, code: "KeyH" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "zenith-halo-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "zenith-halo-active"),
  });
}
