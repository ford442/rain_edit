/**
 * Lens-family bindings, part 3 of 3 (see lensBindings.js).
 */
export function registerLensGroupC(manager, doc, body) {
  manager.register({
    id: "abyssal-glitch",
    category: "lens",
    description: "Abyssal Glitch Lens (Alt+A)",
    combo: { alt: true, code: "KeyA" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "abyssal-glitch-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "abyssal-glitch-active"),
  });

  manager.register({
    id: "solar-flare",
    category: "lens",
    description: "Solar Flare Lens (Alt+S)",
    combo: { alt: true, code: "KeyS" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "solar-flare-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "solar-flare-active"),
  });

  manager.register({
    id: "prismatic-void",
    category: "lens",
    description: "Prismatic Void Lens (Alt+Shift+D)",
    combo: { alt: true, shift: true, code: "KeyD" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "prismatic-void-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "prismatic-void-active"),
  });

  manager.register({
    id: "fractal-kaleidoscope",
    category: "lens",
    description: "Fractal Kaleidoscope Lens (Alt+J)",
    combo: { alt: true, code: "KeyJ" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "fractal-kaleidoscope-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "fractal-kaleidoscope-active"),
  });

  manager.register({
    id: "quantum-bubble",
    category: "lens",
    description: "Quantum Bubble Lens (Alt+L)",
    combo: { alt: true, code: "KeyL" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "quantum-bubble-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "quantum-bubble-active"),
  });

  manager.register({
    id: "ember-flow",
    category: "lens",
    description: "Ember Flow Lens (Alt+Y)",
    combo: { alt: true, code: "KeyY" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "ember-flow-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "ember-flow-active"),
  });

  manager.register({
    id: "aetherial-echoes",
    category: "lens",
    description: "Aetherial Echoes Lens (Alt+W)",
    combo: { alt: true, code: "KeyW" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "aetherial-echoes-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "aetherial-echoes-active"),
  });


  manager.register({
    id: "gravitational-lens",
    category: "lens",
    description: "Gravitational Lens (Alt+G)",
    combo: { alt: true, code: "KeyG" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "gravitational-lens-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "gravitational-lens-active"),
  });

  manager.register({
    id: "orbital-nexus",
    category: "lens",
    description: "Orbital Nexus Lens (Alt+O)",
    combo: { alt: true, code: "KeyO" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "orbital-nexus-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "orbital-nexus-active"),
  });

  manager.register({
    id: "glacier-shard",
    category: "lens",
    description: "Glacier Shard Lens (Alt+V)",
    combo: { alt: true, code: "KeyV" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "glacier-shard-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "glacier-shard-active"),
  });


  manager.register({
    id: "ethereal-echoes-v2",
    category: "lens",
    description: "Ethereal Echoes v2 Lens (Alt+I)",
    combo: { alt: true, code: "KeyI" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "ethereal-echoes-v2-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => doc.style.setProperty("--item-index", idx));
    },
    onUp: () => body.classList.remove("loupe-active", "ethereal-echoes-v2-active"),
  });


  manager.register({
    id: "cybernetic-core",
    category: "lens",
    description: "Cybernetic Core Lens (Alt+X)",
    combo: { alt: true, code: "KeyX" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "cybernetic-core-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => doc.style.setProperty("--item-index", idx));
    },
    onUp: () => body.classList.remove("loupe-active", "cybernetic-core-active"),
  });


  manager.register({
    id: "fractal-disintegration",
    category: "lens",
    description: "Fractal Disintegration Lens (Alt+K)",
    combo: { alt: true, code: "KeyK" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "fractal-disintegration-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => doc.style.setProperty("--item-index", idx));
    },
    onUp: () => body.classList.remove("loupe-active", "fractal-disintegration-active"),
  });

  manager.register({
    id: "aurora-glitch",
    category: "lens",
    description: "Aurora Glitch Lens (Alt+E)",
    combo: { alt: true, code: "KeyE" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "aurora-glitch-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => doc.style.setProperty("--item-index", idx));
    },
    onUp: () => body.classList.remove("loupe-active", "aurora-glitch-active"),
  });

  manager.register({
    id: "zenith-mirage",
    category: "lens",
    description: "Zenith Mirage Lens (Alt+Z)",
    combo: { alt: true, code: "KeyZ" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "zenith-mirage-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => doc.style.setProperty("--item-index", idx));
      }
    },
    onUp: () => body.classList.remove("loupe-active", "zenith-mirage-active"),
  });

  manager.register({
    id: "plasma-web",
    category: "lens",
    description: "Plasma Web Lens (Alt+P)",
    combo: { alt: true, code: "KeyP" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "plasma-web-active");
      const echoLayer = document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((doc, idx) => doc.style.setProperty("--item-index", idx));
      }
    },
    onUp: () => body.classList.remove("loupe-active", "plasma-web-active"),
  });

  manager.register({
    id: "nebula-cascade",
    category: "lens",
    description: "Nebula Cascade Lens (Alt+1)",
    combo: { alt: true, code: "Digit1" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "nebula-cascade-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "nebula-cascade-active"),
  });

  manager.register({
    id: "quantum-mirror",
    category: "lens",
    description: "Quantum Mirror Lens (Alt+2)",
    combo: { alt: true, code: "Digit2" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "quantum-mirror-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "quantum-mirror-active"),
  });

  manager.register({
    id: "tachyon-field",
    category: "lens",
    description: "Tachyon Field Lens (Alt+T)",
    combo: { alt: true, code: "KeyT" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "tachyon-field-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "tachyon-field-active"),
  });

  manager.register({
    id: "holo-topography",
    category: "lens",
    description: "Holographic Topography Lens (Alt+H)",
    combo: { alt: true, code: "KeyH" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "holo-topography-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "holo-topography-active"),
  });

  manager.register({
    id: "data-stream-ripple",
    category: "lens",
    description: "Data Stream Ripple Lens (Alt+3)",
    combo: { alt: true, code: "Digit3" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "data-stream-ripple-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "data-stream-ripple-active"),
  });

  manager.register({
    id: "plasma-pulse",
    category: "lens",
    description: "Plasma Pulse Lens (Alt+4)",
    combo: { alt: true, code: "Digit4" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "plasma-pulse-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "plasma-pulse-active"),
  });

  manager.register({
    id: "quantum-ripple",
    category: "lens",
    description: "Quantum Ripple Lens (Alt+5)",
    combo: { alt: true, code: "Digit5" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "quantum-ripple-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "quantum-ripple-active"),
  });

  manager.register({
    id: "prismatic-echo",
    category: "lens",
    description: "Prismatic Echo Lens (Alt+6)",
    combo: { alt: true, code: "Digit6" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "prismatic-echo-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "prismatic-echo-active"),
  });

  manager.register({
    id: "void-shatter",
    category: "lens",
    description: "Void Shatter Lens (Alt+7)",
    combo: { alt: true, code: "Digit7" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "void-shatter-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "void-shatter-active"),
  });

  manager.register({
    id: "quantum-flux",
    category: "lens",
    description: "Quantum Flux Lens (Alt+8)",
    combo: { alt: true, code: "Digit8" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "quantum-flux-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "quantum-flux-active"),
  });


  manager.register({
    id: "neural-link",
    category: "lens",
    description: "Neural Link Lens (Ctrl+Alt+Shift+B)",
    combo: { ctrl: true, alt: true, shift: true, code: 'KeyB' },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("loupe-active", "neural-link-active"),
    onUp: () => body.classList.remove("loupe-active", "neural-link-active"),
  });

  manager.register({
    id: "cyber-tear",
    category: "lens",
    description: "Cyberpunk Neon Tear Lens (Ctrl+Alt+Shift+O)",
    combo: { ctrl: true, alt: true, shift: true, code: 'KeyO' },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("loupe-active", "cyber-tear-active"),
    onUp: () => body.classList.remove("loupe-active", "cyber-tear-active"),
  });

  manager.register({
    id: "temporal-stutter",
    category: "lens",
    description: "Temporal Stutter Lens (Ctrl+Alt+Shift+T)",
    combo: { ctrl: true, alt: true, shift: true, code: 'KeyT' },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("loupe-active", "temporal-stutter-active"),
    onUp: () => body.classList.remove("loupe-active", "temporal-stutter-active"),
  });

  manager.register({
    id: "chrono-shift",
    category: "lens",
    description: "Chrono-Shift Resonator Lens (Ctrl+Alt+Shift+V)",
    combo: { ctrl: true, alt: true, shift: true, code: "KeyV" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "chrono-shift-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "chrono-shift-active"),
  });

  manager.register({
    id: "crystal-hex",
    category: "lens",
    description: "Crystal-Hex Lattice Lens (Ctrl+Alt+Shift+X)",
    combo: { ctrl: true, alt: true, shift: true, code: "KeyX" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "crystal-hex-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "crystal-hex-active"),
  });

  manager.register({
    id: "stellar-parallax",
    category: "lens",
    description: "Stellar Parallax Lens (Alt+9)",
    combo: { alt: true, code: "Digit9" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "stellar-parallax-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "stellar-parallax-active"),
  });

  manager.register({
    id: "hyper-tesseract",
    category: "lens",
    description: "Hyper-Tesseract Lens (Alt+Ctrl+Shift+Y)",
    combo: { ctrl: true, alt: true, shift: true, code: "KeyY" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "hyper-tesseract-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "hyper-tesseract-active"),
  });

  manager.register({
    id: "bio-bloom",
    category: "lens",
    description: "Bio-luminescent Bloom Lens (Alt+Ctrl+Shift+W)",
    combo: { ctrl: true, alt: true, shift: true, code: "KeyW" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "bio-bloom-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "bio-bloom-active"),
  });

  manager.register({
    id: "neon-grid",
    category: "lens",
    description: "Neon Grid Lens (Ctrl+Alt+Shift+G)",
    combo: { ctrl: true, alt: true, shift: true, code: "KeyG" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "neon-grid-lens-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "neon-grid-lens-active"),
  });

  manager.register({
    id: "cosmic-web",
    category: "lens",
    description: "Cosmic Web Lens (Ctrl+Alt+Shift+C)",
    combo: { ctrl: true, alt: true, shift: true, code: "KeyC" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "cosmic-web-lens-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "cosmic-web-lens-active"),
  });

  manager.register({
    id: "cyber-pulse",
    category: "lens",
    description: "Cyber-Pulse Lens (Ctrl+Alt+Shift+P)",
    combo: { ctrl: true, alt: true, shift: true, code: "KeyP" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "cyber-pulse-lens-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "cyber-pulse-lens-active"),
  });

  manager.register({
    id: "hyper-nova-flare",
    category: "lens",
    description: "Hyper-Nova Flare Lens (Ctrl+Alt+Shift+N)",
    combo: { ctrl: true, alt: true, shift: true, code: "KeyN" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "hyper-nova-flare-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "hyper-nova-flare-active"),
  });

  manager.register({
    id: "dark-matter-vortex",
    category: "lens",
    description: "Dark Matter Vortex Lens (Ctrl+Alt+Shift+M)",
    combo: { ctrl: true, alt: true, shift: true, code: "KeyM" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "dark-matter-vortex-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "dark-matter-vortex-active"),
  });

  manager.register({
    id: "digital-mirage",
    category: "lens",
    description: "Digital Mirage Lens (Ctrl+Alt+Shift+L)",
    combo: { ctrl: true, alt: true, shift: true, code: "KeyL" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "digital-mirage-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "digital-mirage-active"),
  });

  manager.register({
    id: "echo-shift",
    category: "lens",
    description: "Echo Shift Lens (Ctrl+Alt+1)",
    combo: { ctrl: true, alt: true, code: "Digit1" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "echo-shift-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "echo-shift-active"),
  });

  manager.register({
    id: "quantum-fold",
    category: "lens",
    description: "Quantum Fold Lens (Ctrl+Alt+2)",
    combo: { ctrl: true, alt: true, code: "Digit2" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "quantum-fold-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "quantum-fold-active"),
  });

  manager.register({
    id: "neon-nexus",
    category: "lens",
    description: "Neon Nexus Lens (Ctrl+Alt+3)",
    combo: { ctrl: true, alt: true, code: "Digit3" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "neon-nexus-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "neon-nexus-active"),
  });

  manager.register({
    id: "void-prism",
    category: "lens",
    description: "Void Prism Lens (Ctrl+Alt+4)",
    combo: { ctrl: true, alt: true, code: "Digit4" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "void-prism-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "void-prism-active"),
  });

  manager.register({
    id: "celestial-echo",
    category: "lens",
    description: "Celestial Echo Lens (Ctrl+Alt+5)",
    combo: { ctrl: true, alt: true, code: "Digit5" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "celestial-echo-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "celestial-echo-active"),
  });

  manager.register({
    id: "quantum-singularity",
    category: "lens",
    description: "Quantum Singularity Lens (Ctrl+Alt+Shift+Z)",
    combo: { ctrl: true, alt: true, shift: true, code: "KeyZ" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "quantum-singularity-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "quantum-singularity-active"),
  });

}
