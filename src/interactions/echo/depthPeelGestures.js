/**
 * Peel-family depth gestures: Alt+Q depth peel, the shared reveal-toggle
 * keyup reset handler, Alt+Shift+Q peel (uses tabManager to skip resetting
 * transforms while a 3D view mode owns them), the z-slicer range input,
 * quantum depth inspect (hold Shift), and Alt+Shift+V peel reveal.
 * Extracted from the original single-file EchoDocumentInteractions.js
 * purely to keep file size down.
 */
export function initDepthPeelGestures(im, tabManager) {
/* ─── Improvise: Depth Peel Feature (Alt + Q) ─────────────────────────────── */
// Fanning out all partially obscured echo-document layers sideways based on cursor pos.
window.isDepthPeelActive = false;

document.addEventListener("keydown", (e) => {
  if (e.altKey && !e.shiftKey && e.code === "KeyQ" && !window.isDepthPeelActive) {
    e.preventDefault();
    window.isDepthPeelActive = true;
    document.body.classList.add("depth-peel-active");
  }
});

document.addEventListener("keyup", (e) => {
  if ((e.key === "Alt" || e.code === "KeyQ") && window.isDepthPeelActive) {
    if (!e.altKey || e.code === "KeyQ") {
      window.isDepthPeelActive = false;
      document.body.classList.remove("depth-peel-active");
      if (window.echoLayerEl) {
        window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
          doc.style.setProperty("--peel-offset", "0px");
        });
      }
    }
  }
});

document.addEventListener("mousemove", (e) => {
  if (window.isDepthPeelActive && window.echoLayerEl) {
    const peelAmount = (e.clientX - window.innerWidth / 2) * 0.5;
    window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc, idx) => {
      // Fan out more deeply buried layers further
      doc.style.setProperty("--peel-offset", `${peelAmount * (idx + 1)}px`);
    });
  }
});

document.addEventListener("keyup", (e) => {
  // Innovate: Focus Pull Interaction (Alt + F)
  if (e.key === "f" || e.key === "F" || e.key === "Alt") {
    document.body.classList.remove("focus-pull-active");
  }

  // Innovate: Sonar Pulse Reveal (Alt + O)
  if (e.key === "o" || e.key === "O" || e.key === "Alt") {
    document.body.classList.remove("sonar-pulse-active");
  }

  // Innovate: Prismatic Depth Separation (Alt + U)
  if (e.key === "u" || e.key === "U" || e.key === "Alt") {
    document.body.classList.remove("prism-depth-active");
  }

  if (e.key === "c" || e.key === "C" || e.key === "Alt") {
    if (isFanningActive && (!e.altKey || (e.code === "KeyC" && !e.altKey))) {
      isFanningActive = false;
      document.body.classList.remove("fanning-active");
      if (echoLayerEl) {
        const echoes = echoLayerEl.querySelectorAll(".echo-document");
        echoes.forEach((echo) => {
          echo.style.removeProperty("--fan-tx");
          echo.style.removeProperty("--fan-ty");
          echo.style.removeProperty("--fan-tz");
          echo.style.removeProperty("--fan-rot-z");
        });
      }
    }
  }

  if (e.key === "Shift") {
    if (echoLayerEl && window.__lensActive) {
      const echoes = echoLayerEl.querySelectorAll(".echo-document");
      echoes.forEach((echo) => {
        echo.style.setProperty("--lens-pull", 0);
        echo.classList.remove("shift-lens-hit");
      });
    }
  }
});

// Peel (reassigned from the old Alt+Shift catch-all to Alt+Shift+Q to end the
// collision with every other Alt+Shift combo).
im.register({
  id: "peel",
  category: "reveal",
  description: "Peel layers (Alt+Shift+Q)",
  combo: { alt: true, shift: true, code: "KeyQ" },
  type: "hold",
  onDown: () => {
    window.isPeelActive = true;
    document.body.classList.add("peel-active");
  },
  onUp: () => {
    window.isPeelActive = false;
    document.body.classList.remove("peel-active");
    if (
      echoLayerEl &&
      typeof tabManager !== "undefined" &&
      !tabManager.isCascadeView &&
      !tabManager.isOrbitView &&
      !tabManager.isSolarSystemView &&
      !tabManager.isScatteredView &&
      !tabManager.isIsometricView &&
      !tabManager.isStackView &&
      !tabManager.isTunnelView &&
      !tabManager.isGridView &&
      !tabManager.isHelixView &&
      !tabManager.isPinboardView &&
      !tabManager.isVortexView &&
      !tabManager.isConstellationView &&
      !tabManager.isPrismView &&
      !tabManager.isCoverflowView &&
      !tabManager.isWaveView &&
      !tabManager.isSphereView &&
      !tabManager.isMatrixRainView
    ) {
      echoLayerEl.querySelectorAll(".echo-document").forEach((echo) => {
        echo.style.removeProperty("transform");
        echo.style.setProperty("--tz-val", echo.style.getPropertyValue("--tz"));
      });
    }
  },
});

document.addEventListener("DOMContentLoaded", () => {
  const slicerRange = document.getElementById("z-slicer-range");
  if (slicerRange) {
    slicerRange.addEventListener("input", (e) => {
      const val = parseInt(e.target.value); // 0 to 100
      const maxDepth = 10; // max logical depth we expect
      const targetDepth = Math.round((val / 100) * maxDepth);

      // Highlight documents matching the target depth
      const docs = document.querySelectorAll(".echo-document");
      docs.forEach((doc) => {
        const index = parseInt(doc.dataset.index || 0);
        if (index === targetDepth) {
          doc.classList.add("slicer-highlight");
        } else {
          doc.classList.remove("slicer-highlight");
        }
      });
    });
  }
});

// Quantum Depth (hold Shift, unless x-ray lens is up)
im.register({
  id: "quantum-depth",
  category: "depth",
  description: "Quantum depth inspect (hold Shift)",
  combo: { key: "Shift" },
  type: "hold",
  preventDefault: false,
  allowInEditor: true,
  when: () => !document.body.classList.contains("x-ray-active"),
  onDown: () => document.body.classList.add("quantum-depth-active"),
  onUp: () => {
    document.body.classList.remove("quantum-depth-active");
    document.body.removeAttribute("data-active-depth");
  },
});

// Peel Reveal logic
let isPeeling = false;

im.register({
  id: "peel-reveal",
  category: "reveal",
  description: "Peel reveal (Alt+Shift+V, then drag)",
  combo: { alt: true, shift: true, code: "KeyV" },
  type: "hold",
  onDown: () => {
    document.body.classList.add("peel-reveal-active");
    document.body.style.setProperty("--peel-x", `100vw`);
    document.body.style.setProperty("--peel-y", `0px`);
  },
  onUp: () => {
    document.body.classList.remove("peel-reveal-active");
    isPeeling = false;
  },
});

document.addEventListener("mousedown", (e) => {
  if (document.body.classList.contains("peel-reveal-active")) {
    isPeeling = true;
    document.body.style.setProperty("--peel-x", `${e.clientX}px`);
    document.body.style.setProperty("--peel-y", `${e.clientY}px`);
  }
});

document.addEventListener("mousemove", (e) => {
  if (isPeeling && document.body.classList.contains("peel-reveal-active")) {
    document.body.style.setProperty("--peel-x", `${e.clientX}px`);
    document.body.style.setProperty("--peel-y", `${e.clientY}px`);
  }
});

document.addEventListener("mouseup", () => {
  if (isPeeling) {
    isPeeling = false;
    document.body.style.setProperty("--peel-x", `100vw`);
    document.body.style.setProperty("--peel-y", `0px`);
  }
});

// (Removed duplicate Alt+M "magnetic pulse" — Alt+M is the magnifier lens.
// quantum-depth release is handled by the quantum-depth binding's onUp above.)

document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("quantum-depth-active")) {
    const echoLayer = document.getElementById("echo-layer");
    if (!echoLayer) return;

    // Find echo document under cursor
    let target = document.elementFromPoint(e.clientX, e.clientY);
    let echoDoc = target ? target.closest(".echo-document") : null;

    if (echoDoc) {
      const depthIndex = echoDoc.getAttribute("data-index");
      if (depthIndex) {
        document.body.setAttribute("data-active-depth", depthIndex);
      }
    } else {
      document.body.removeAttribute("data-active-depth");
    }
  }
});
}
