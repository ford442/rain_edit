/**
 * Spatial dispersion / kinetic effects: pulse wave (Alt+J), drawer peek
 * (hold Shift), layer isolate (hold I), the editor typing ripple, layer
 * dispersion (Alt+D), holographic explode (Alt+Shift+E), orbital focus
 * scrubber (Alt+Shift+O), kinetic typography echo (Alt+T), and ripple
 * displacement pointer tracking. Extracted from the original single-file
 * EchoDocumentInteractions.js purely to keep file size down.
 */
export function initSpatialDispersionEffects(im) {
// Pulse Wave (Alt + J)
im.register({
  id: "pulse-wave",
  category: "effects",
  description: "Pulse wave (Alt+J)",
  combo: { alt: true, code: "KeyJ" },
  type: "action",
  onDown: () => {
    document.body.classList.add("pulse-wave-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        const index = parseInt(doc.dataset.index || "0", 10);
        doc.style.setProperty("--pulse-delay", `${index * 0.1}s`);
      });
    }
    setTimeout(() => document.body.classList.remove("pulse-wave-active"), 1500);
  },
});

// Interactive Drawer Peek (hold Shift)
im.register({
  id: "drawer-peek",
  category: "navigation",
  description: "Drawer peek (hold Shift)",
  combo: { key: "Shift" },
  type: "hold",
  preventDefault: false,
  allowInEditor: true,
  onDown: () => document.body.classList.add("drawer-peek-ready"),
  onUp: () => document.body.classList.remove("drawer-peek-ready"),
});

// Layer Isolate (hold I) — guarded against editor typing.
im.register({
  id: "layer-isolate",
  category: "depth",
  description: "Layer isolate (hold I)",
  combo: { key: "i" },
  type: "hold",
  preventDefault: false,
  onDown: () => document.body.classList.add("layer-isolate-active"),
  onUp: () => document.body.classList.remove("layer-isolate-active"),
});

// Echo Typing Ripple
let typingTimeout;
document.addEventListener("keydown", (e) => {
  // Only trigger if typing inside the editor, input, or textarea
  if (e.target.closest(".monaco-editor") || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
    // Ignore modifier keys
    if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;

    document.body.classList.add("typing-pulse");

    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        doc.classList.remove("typing-ripple");
        void doc.offsetWidth; // trigger reflow
        doc.classList.add("typing-ripple");
      });
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      document.body.classList.remove("typing-pulse");
      if (window.echoLayerEl) {
        window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
          doc.classList.remove("typing-ripple");
        });
      }
    }, 300); // Wait for the animation to finish
  }
});

// Interactive Layer Dispersion (Alt+D) — guarded against editor typing.
let isLayerDispersionActive = false;
im.register({
  id: "layer-dispersion",
  category: "depth",
  description: "Layer dispersion (Alt+D)",
  combo: { alt: true, code: "KeyD" },
  type: "hold",
  onDown: () => {
    if (!isLayerDispersionActive) {
      isLayerDispersionActive = true;
      document.body.classList.add("layer-dispersion-active");
    }
  },
  onUp: () => {
    if (!isLayerDispersionActive) return;
    isLayerDispersionActive = false;
    document.body.classList.remove("layer-dispersion-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        doc.style.removeProperty("--disperse-x");
        doc.style.removeProperty("--disperse-y");
        doc.style.removeProperty("--disperse-z");
        doc.style.removeProperty("--disperse-rot");
      });
    }
  },
});

document.addEventListener("mousemove", (e) => {
  if (isLayerDispersionActive && window.echoLayerEl) {
    const echoes = window.echoLayerEl.querySelectorAll(".echo-document");
    const total = echoes.length;

    // Normalize mouse position (-1 to 1)
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;

    echoes.forEach((doc, index) => {
      // Base calculation: Center is 0, outer items fan out
      const offset = index - (total - 1) / 2;

      // Horizontal mouse drives horizontal spread
      const spreadX = offset * 120 * nx;

      // Vertical mouse drives z-depth separation and tilt
      const spreadZ = offset * 80 * ny;
      const rotY = offset * -15 * nx;
      const spreadY = Math.abs(offset) * 20 * ny;

      doc.style.setProperty("--disperse-x", `${spreadX}px`);
      doc.style.setProperty("--disperse-y", `${spreadY}px`);
      doc.style.setProperty("--disperse-z", `${spreadZ}px`);
      doc.style.setProperty("--disperse-rot", `${rotY}deg`);
    });
  }
});

// Holographic Explode View (Alt+Shift+E)
im.register({
  id: "holographic-explode",
  category: "reveal",
  description: "Holographic explode view (Alt+Shift+E)",
  combo: { alt: true, shift: true, code: "KeyE" },
  type: "hold",
  onDown: () => {
    if (window.isHolographicExplodeActive) return;
    window.isHolographicExplodeActive = true;
    document.body.classList.add("holographic-explode-active");
    if (window.echoLayerEl) {
      const echoes = window.echoLayerEl.querySelectorAll(".echo-document");
      const total = echoes.length;
      if (total > 0) {
        echoes.forEach((doc, index) => {
          const phi = Math.acos(1 - (2 * (index + 0.5)) / total);
          const theta = Math.PI * (1 + Math.sqrt(5)) * index;
          const radius = 800 + Math.random() * 400;
          const tx = radius * Math.sin(phi) * Math.cos(theta);
          const ty = radius * Math.sin(phi) * Math.sin(theta);
          const tz = radius * Math.cos(phi) * 0.5;
          const rx = (Math.random() - 0.5) * 60;
          const ry = (Math.random() - 0.5) * 60;
          doc.style.setProperty("--explode-tx", `${tx}px`);
          doc.style.setProperty("--explode-ty", `${ty}px`);
          doc.style.setProperty("--explode-tz", `${tz}px`);
          doc.style.setProperty("--explode-rx", `${rx}deg`);
          doc.style.setProperty("--explode-ry", `${ry}deg`);
        });
      }
    }
  },
  onUp: () => {
    window.isHolographicExplodeActive = false;
    document.body.classList.remove("holographic-explode-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        doc.style.removeProperty("--explode-tx");
        doc.style.removeProperty("--explode-ty");
        doc.style.removeProperty("--explode-tz");
        doc.style.removeProperty("--explode-rx");
        doc.style.removeProperty("--explode-ry");
      });
    }
  },
});


/* ─── Orbital Focus Scrubber ─── reassigned Alt+D -> Alt+Shift+O to end the
   collision with Layer Dispersion (Alt+D). */
window.isOrbitalScrubberActive = false;
im.register({
  id: "orbital-scrubber",
  category: "navigation",
  description: "Orbital focus scrubber (Alt+Shift+O)",
  combo: { alt: true, shift: true, code: "KeyO" },
  type: "hold",
  onDown: () => {
    if (window.isOrbitalScrubberActive) return;
    window.isOrbitalScrubberActive = true;
    document.body.classList.add("orbital-scrubber-active");
  },
  onUp: () => {
    window.isOrbitalScrubberActive = false;
    document.body.classList.remove("orbital-scrubber-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        doc.style.removeProperty("--orbital-scrub-scale");
        doc.style.removeProperty("--orbital-scrub-angle");
        doc.style.removeProperty("--orbital-scrub-z");
      });
    }
  },
});

document.addEventListener("mousemove", (e) => {
  if (window.isOrbitalScrubberActive && window.echoLayerEl) {
    const docs = Array.from(window.echoLayerEl.querySelectorAll(".echo-document"));
    if (docs.length === 0) return;

    const pctX = e.clientX / window.innerWidth;
    const targetIndex = Math.floor(pctX * docs.length);

    docs.forEach((doc, idx) => {
      // Calculate distance from target focus
      const dist = Math.abs(idx - targetIndex);

      // Determine rotation and placement based on how far from target
      // Target is flat and forward. Others curve away into a ring/orbit.

      let scale = dist === 0 ? 1.1 : Math.max(0.7, 1 - (dist * 0.1));
      let z = dist === 0 ? 150 : - (dist * 100);
      let angle = (idx - targetIndex) * 20; // 20 degrees spread

      doc.style.setProperty("--orbital-scrub-scale", scale);
      doc.style.setProperty("--orbital-scrub-z", `${z}px`);
      doc.style.setProperty("--orbital-scrub-angle", `${angle}deg`);
    });
  }
});

/* ─── Improvise: Kinetic Typography Echo (Alt + T) ─────────────────────────────── */
// When triggered, extracts visible text from the editor, scales it up, and overlays it
// across echo documents with varying delays and opacity to create a kinetic echo effect.
window.isKineticEchoActive = false;

document.addEventListener("keydown", (e) => {
  if (e.altKey && !e.shiftKey && e.code === "KeyT" && !window.isKineticEchoActive) {
    e.preventDefault();
    window.isKineticEchoActive = true;
    document.body.classList.add("kinetic-echo-active");

    if (window.editor) {
      const code = window.editor.getValue();
      const words = code.split(/\s+/).filter(w => w.length > 3).slice(0, 10);

      if (window.echoLayerEl) {
         window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc, idx) => {
             const word = words[idx % words.length] || "ECHO";
             doc.setAttribute("data-kinetic-word", word);
         });
      }
    }
  }
});

document.addEventListener("keyup", (e) => {
  if ((e.key === "Alt" || e.code === "KeyT") && window.isKineticEchoActive) {
    if (!e.altKey || e.code === "KeyT") {
      window.isKineticEchoActive = false;
      document.body.classList.remove("kinetic-echo-active");
    }
  }
});

// Ripple Displacement Mouse Tracking (Alt+Shift+R)
document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("ripple-displacement-active")) {
    document.body.style.setProperty("--ripple-cx", `${e.clientX}px`);
    document.body.style.setProperty("--ripple-cy", `${e.clientY}px`);
  }
});
}
