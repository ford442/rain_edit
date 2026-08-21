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

  manager.register({
    id: "quantum-fracture",
    category: "lens",
    description: "Quantum Fracture Lens (Alt+Shift+Q)",
    combo: { alt: true, shift: true, code: "KeyQ" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "quantum-fracture-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "quantum-fracture-active"),
  });

  manager.register({
    id: "cosmic-void",
    category: "lens",
    description: "Cosmic Void Lens (Alt+Shift+V)",
    combo: { alt: true, shift: true, code: "KeyV" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "cosmic-void-active");
      const echoLayer = doc.getElementById("echo-layer") || document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "cosmic-void-active"),
  });

  manager.register({
    id: "bioluminescent-trace",
    category: "lens",
    description: "Bioluminescent Trace Lens (Alt+Shift+T)",
    combo: { alt: true, shift: true, code: "KeyT" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "bioluminescent-trace-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "bioluminescent-trace-active"),
  });

  manager.register({
    id: "digital-matrix-decode",
    category: "lens",
    description: "Digital Matrix Decode Lens (Alt+Shift+O)",
    combo: { alt: true, shift: true, code: "KeyO" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "digital-matrix-decode-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "digital-matrix-decode-active"),
  });

  manager.register({
    id: "starlight-fracture",
    category: "lens",
    description: "Starlight Fracture Lens (Alt+Shift+S)",
    combo: { alt: true, shift: true, code: "KeyS" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "starlight-fracture-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "starlight-fracture-active"),
  });

  manager.register({
    id: "time-lapse-echo",
    category: "lens",
    description: "Time-Lapse Echo Lens (Alt+Shift+B)",
    combo: { alt: true, shift: true, code: "KeyB" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "time-lapse-echo-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "time-lapse-echo-active"),
  });


  manager.register({
    id: "neon-matrix-wireframe",
    category: "lens",
    description: "Neon Matrix Wireframe Lens (Alt+Shift+1)",
    combo: { alt: true, shift: true, code: "Digit1" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "neon-matrix-wireframe-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "neon-matrix-wireframe-active"),
  });

  manager.register({
    id: "fractal-dimension",
    category: "lens",
    description: "Fractal Dimension Lens (Alt+Shift+2)",
    combo: { alt: true, shift: true, code: "Digit2" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "fractal-dimension-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "fractal-dimension-active"),
  });

  manager.register({
    id: "astral-projection",
    category: "lens",
    description: "Astral Projection Lens (Alt+Shift+3)",
    combo: { alt: true, shift: true, code: "Digit3" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "astral-projection-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "astral-projection-active"),
  });

  manager.register({
    id: "pixelate-lens",
    category: "lens",
    description: "Pixelate Lens (Alt+Shift+4)",
    combo: { alt: true, shift: true, code: "Digit4" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "pixelate-lens-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "pixelate-lens-active"),
  });

  manager.register({
    id: "vortex-warp",
    category: "lens",
    description: "Vortex Warp Lens (Alt+Shift+5)",
    combo: { alt: true, shift: true, code: "Digit5" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "vortex-warp-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "vortex-warp-active"),
  });

  manager.register({
    id: "echo-trails",
    category: "lens",
    description: "Echo Trails Lens (Alt+Shift+6)",
    combo: { alt: true, shift: true, code: "Digit6" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "echo-trails-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "echo-trails-active"),
  });




  manager.register({
    id: "xray-grid-lens",
    category: "lens",
    description: "X-Ray Grid Lens (Alt+Shift+X)",
    combo: { alt: true, shift: true, code: "KeyX" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "xray-grid-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "xray-grid-active"),
  });


  manager.register({
    id: "synapse-connect",
    category: "lens",
    description: "Synapse Connect Lens (Alt+Shift+7)",
    combo: { alt: true, shift: true, code: "Digit7" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "synapse-connect-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "synapse-connect-active"),
  });

  manager.register({
    id: "ethereal-ghost",
    category: "lens",
    description: "Ethereal Ghost Lens (Alt+Shift+8)",
    combo: { alt: true, shift: true, code: "Digit8" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "ethereal-ghost-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "ethereal-ghost-active"),
  });

  manager.register({
    id: "holographic-distortion",
    category: "lens",
    description: "Holographic Distortion Lens (Alt+Shift+9)",
    combo: { alt: true, shift: true, code: "Digit9" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "holo-distortion-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "holo-distortion-active"),
  });

  manager.register({
    id: "astral-portal",
    category: "lens",
    description: "Astral Portal Lens (Alt+Shift+Comma)",
    combo: { alt: true, shift: true, code: "Comma" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "astral-portal-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "astral-portal-active"),
  });

  manager.register({
    id: "quantum-decoherence",
    category: "lens",
    description: "Quantum Decoherence Lens (Alt+Shift+Period)",
    combo: { alt: true, shift: true, code: "Period" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "quantum-decoherence-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "quantum-decoherence-active"),
  });

  manager.register({
    id: "chrono-fractal",
    category: "lens",
    description: "Chrono Fractal Lens (Alt+Shift+Slash)",
    combo: { alt: true, shift: true, code: "Slash" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "chrono-fractal-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "chrono-fractal-active"),
  });


  manager.register({
    id: "nebula-dream",
    category: "lens",
    description: "Nebula Dream Lens (Alt+Shift+0)",
    combo: { alt: true, shift: true, code: "Digit0" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "nebula-dream-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "nebula-dream-active"),
  });

  manager.register({
    id: "crystal-resonance",
    category: "lens",
    description: "Crystal Resonance Lens (Alt+Shift+Minus)",
    combo: { alt: true, shift: true, code: "Minus" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "crystal-resonance-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "crystal-resonance-active"),
  });

  manager.register({
    id: "abyssal-depth",
    category: "lens",
    description: "Abyssal Depth Lens (Alt+Shift+P)",
    combo: { alt: true, shift: true, code: "KeyP" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "abyssal-depth-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "abyssal-depth-active"),
  });


  manager.register({
    id: "prismatic-lattice",
    category: "lens",
    description: "Prismatic Lattice Lens (Alt+Shift+[)",
    combo: { alt: true, shift: true, code: "BracketLeft" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "prismatic-lattice-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "prismatic-lattice-active"),
  });

  manager.register({
    id: "chronos-pulse",
    category: "lens",
    description: "Chronos Pulse Lens (Alt+Shift+])",
    combo: { alt: true, shift: true, code: "BracketRight" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "chronos-pulse-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "chronos-pulse-active"),
  });

  manager.register({
    id: "ethereal-cascade",
    category: "lens",
    description: "Ethereal Cascade Lens (Alt+Shift+')",
    combo: { alt: true, shift: true, code: "Quote" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "ethereal-cascade-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "ethereal-cascade-active"),
  });

  if (typeof doc.addEventListener === "function") {
    doc.addEventListener("mousemove", (e) => {
      if (!body.classList.contains("loupe-active")) return;
      body.style.setProperty("--lens-x", `${e.clientX}px`);
      body.style.setProperty("--lens-y", `${e.clientY}px`);
    });
  }
}
