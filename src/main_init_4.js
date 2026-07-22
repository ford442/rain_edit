import { monaco } from "./editor/setupMonaco.js";
import { inputManager } from "./interactions/InputManager.js";
import { initInteractions } from "./interactions/initInteractions.js";
import { registerLensBindings } from "./interactions/lensBindings.js";

const im = inputManager;


// Holographic Depth Cursor Logic
window.cursorZDepth = 0;
let depthCursorEl = document.getElementById("holographic-depth-cursor");

document.addEventListener("wheel", (e) => {
  if (e.altKey && !e.shiftKey && !e.ctrlKey) {
    e.preventDefault();

    if (!depthCursorEl) {
      depthCursorEl = document.createElement("div");
      depthCursorEl.id = "holographic-depth-cursor";
      document.body.appendChild(depthCursorEl);
      document.body.classList.add("depth-cursor-active");
    }

    // Adjust depth based on scroll (invert so scrolling down goes "deeper" / more negative)
    window.cursorZDepth -= e.deltaY * 0.5;

    // Clamp or let it go deep? Let's clamp between 500 and -5000
    if (window.cursorZDepth > 500) window.cursorZDepth = 500;
    if (window.cursorZDepth < -5000) window.cursorZDepth = -5000;

    depthCursorEl.style.setProperty("--cursor-tz", `${window.cursorZDepth}px`);

    // Throttle intersection checks for performance
    if (window.depthCursorThrottle) clearTimeout(window.depthCursorThrottle);
    window.depthCursorThrottle = setTimeout(() => {
      // Check intersection with echo-documents
      const echoes = document.querySelectorAll(".echo-document");
      echoes.forEach(doc => {
        // Get the document's computed --tz value
        const tzStr = doc.style.getPropertyValue("--tz");
        if (tzStr) {
          const match = tzStr.match(/-?\d+/);
          if (match) {
            const docZ = parseFloat(match[0]);

            // If within 150px depth, count as a hit
            if (Math.abs(docZ - window.cursorZDepth) < 150) {
              doc.classList.add("depth-cursor-hit");
              // Play a very subtle audio cue if it just entered the hit zone
              if (!doc.dataset.depthHitPlayed && window.AudioContext) {
                doc.dataset.depthHitPlayed = "true";
                try {
                  const ctx = new (window.AudioContext || window.webkitAudioContext)();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = "sine";
                  osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
                  gain.gain.setValueAtTime(0.01, ctx.currentTime); // Very low volume
                  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.1);
                } catch(e) {}
              }
            } else {
              doc.classList.remove("depth-cursor-hit");
              delete doc.dataset.depthHitPlayed;
            }
          }
        }
      });
    }, 50); // 50ms debounce
  }
}, { passive: false });

document.addEventListener("mousemove", (e) => {
  if (depthCursorEl && document.body.classList.contains("depth-cursor-active")) {
    depthCursorEl.style.setProperty("--cursor-x", `${e.clientX}px`);
    depthCursorEl.style.setProperty("--cursor-y", `${e.clientY}px`);
  }
});

// Depth cursor is created by the Alt+wheel handler above; this binding tears it
// down when Alt is released. allowInEditor so it still cleans up if focus moved.
im.register({
  id: "depth-cursor",
  category: "depth",
  description: "Alt + scroll depth cursor",
  combo: { key: "Alt" },
  type: "hold",
  preventDefault: false,
  allowInEditor: true,
  onUp: () => {
    if (depthCursorEl) {
      depthCursorEl.remove();
      depthCursorEl = null;
    }
    document.body.classList.remove("depth-cursor-active");
    document
      .querySelectorAll(".echo-document")
      .forEach((doc) => doc.classList.remove("depth-cursor-hit"));
  },
});

window.addEventListener("blur", () => {
  if (depthCursorEl) {
    depthCursorEl.remove();
    depthCursorEl = null;
  }
  document.body.classList.remove("depth-cursor-active");
  const echoes = document.querySelectorAll(".echo-document");
  echoes.forEach(doc => doc.classList.remove("depth-cursor-hit"));
});

window.isSteppedCraterActive = false;
window.isFoldOutGalleryActive = false;
window.isCardShuffleActive = false;
window.isDepthScanActive = false;
window.__depthScanTarget = 0;

// Card Shuffle Spread (Alt + Shift + D)
im.register({
  id: "card-shuffle",
  category: "reveal",
  description: "Card shuffle spread (Alt+Shift+D)",
  combo: { alt: true, shift: true, code: "KeyD" },
  type: "hold",
  onDown: () => {
    if (!window.isCardShuffleActive) {
      window.isCardShuffleActive = true;
      document.body.classList.add("card-shuffle-active");
    }
  },
  onUp: () => {
    window.isCardShuffleActive = false;
    document.body.classList.remove("card-shuffle-active");
  },
});

// Explode View (Ctrl/Cmd + Alt + E)
im.register({
  id: "explode-view",
  category: "reveal",
  description: "Explode view (Ctrl+Alt+E)",
  combo: { ctrlOrMeta: true, alt: true, code: "KeyE" },
  type: "action",
  onDown: () => window.triggerExplodeView(),
});

// Focus Pull Interaction (Alt + F)
im.register({
  id: "focus-pull",
  category: "depth",
  description: "Focus pull (Alt+F)",
  combo: { alt: true, code: "KeyF" },
  type: "hold",
  group: "reveal",
  onDown: () => document.body.classList.add("focus-pull-active"),
  onUp: () => document.body.classList.remove("focus-pull-active"),
});

// Sonar Pulse Reveal (Alt + O)
im.register({
  id: "sonar-pulse",
  category: "reveal",
  description: "Sonar pulse reveal (Alt+O)",
  combo: { alt: true, code: "KeyO" },
  type: "hold",
  onDown: () => document.body.classList.add("sonar-pulse-active"),
  onUp: () => document.body.classList.remove("sonar-pulse-active"),
});

// Prismatic Depth Separation (Alt + U)
im.register({
  id: "prism-depth",
  category: "depth",
  description: "Prismatic depth separation (Alt+U)",
  combo: { alt: true, code: "KeyU" },
  type: "hold",
  onDown: () => document.body.classList.add("prism-depth-active"),
  onUp: () => document.body.classList.remove("prism-depth-active"),
});

// Depth X-Ray Scan (Alt + Z)
im.register({
  id: "depth-scan",
  category: "depth",
  description: "Depth x-ray scan (Alt+Z)",
  combo: { alt: true, code: "KeyZ" },
  type: "hold",
  onDown: () => {
    if (window.isDepthScanActive) return;
    window.isDepthScanActive = true;
    document.body.classList.add("depth-scan-active");
    window.__depthScanTarget = 0;
    const animateScan = () => {
      if (!window.isDepthScanActive) return;
      window.__depthScanTarget = (window.__depthScanTarget + 0.1) % 15;
      document.body.style.setProperty("--scan-depth", window.__depthScanTarget);
      if (window.echoLayerEl) {
        window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
          const idx = parseInt(doc.dataset.index || 0, 10);
          const dist = Math.abs(idx - window.__depthScanTarget);
          if (dist < 1.5) doc.classList.add("scan-highlight");
          else doc.classList.remove("scan-highlight");
        });
      }
      requestAnimationFrame(animateScan);
    };
    requestAnimationFrame(animateScan);
  },
  onUp: () => {
    window.isDepthScanActive = false;
    document.body.classList.remove("depth-scan-active");
    if (window.echoLayerEl) {
      window.echoLayerEl
        .querySelectorAll(".echo-document")
        .forEach((doc) => doc.classList.remove("scan-highlight"));
    }
  },
});

// Depth Lens (Ctrl + Alt + Z)
im.register({
  id: "depth-lens",
  category: "lens",
  description: "Depth lens (Ctrl+Alt+Z)",
  combo: { ctrl: true, alt: true, code: "KeyZ" },
  type: "toggle",
  onDown: () => {
    document.body.classList.add("depth-lens-active");
    if (!document.getElementById("depth-lens-element")) {
      const lens = document.createElement("div");
      lens.id = "depth-lens-element";
      document.body.appendChild(lens);
    }
  },
  onUp: () => {
    document.body.classList.remove("depth-lens-active");
    document
      .querySelectorAll(".depth-lens-focus")
      .forEach((el) => el.classList.remove("depth-lens-focus"));
  },
});

// Document Fanning (Alt + C)
im.register({
  id: "fanning",
  category: "reveal",
  description: "Document fanning (Alt+C)",
  combo: { alt: true, code: "KeyC" },
  type: "hold",
  onDown: () => {
    if (window.isFanningActive) return;
    window.isFanningActive = true;
    document.body.classList.add("fanning-active");
    if (echoLayerEl) {
      const echoes = echoLayerEl.querySelectorAll(".echo-document:not(.peek)");
      const total = echoes.length;
      if (total > 0) {
        const maxAngle = Math.min(120, total * 15);
        const startAngle = -maxAngle / 2;
        const angleStep = total > 1 ? maxAngle / (total - 1) : 0;
        const radius = 600;
        echoes.forEach((echo, index) => {
          const angleDeg = startAngle + index * angleStep;
          const angleRad = (angleDeg * Math.PI) / 180;
          const tx = Math.sin(angleRad) * radius;
          const ty = -Math.cos(angleRad) * radius + radius * 0.8;
          const tz = 100 + index * 5;
          echo.style.setProperty("--fan-tx", `${tx}px`);
          echo.style.setProperty("--fan-ty", `${ty}px`);
          echo.style.setProperty("--fan-tz", `${tz}px`);
          echo.style.setProperty("--fan-rot-z", `${angleDeg}deg`);
        });
      }
    }
  },
  onUp: () => {
    window.isFanningActive = false;
    document.body.classList.remove("fanning-active");
    if (echoLayerEl) {
      echoLayerEl.querySelectorAll(".echo-document").forEach((echo) => {
        echo.style.removeProperty("--fan-tx");
        echo.style.removeProperty("--fan-ty");
        echo.style.removeProperty("--fan-tz");
        echo.style.removeProperty("--fan-rot-z");
      });
    }
  },
});

// Holographic Portal Mode (Alt + P)
im.register({
  id: "portal-mode",
  category: "reveal",
  description: "Holographic portal mode (Alt+P)",
  combo: { alt: true, code: "KeyP" },
  type: "toggle",
  onDown: () => {
    window.isPortalModeActive = true;
    if (portalToggle) portalToggle.checked = true;
    document.body.classList.add("portal-mode-active");
  },
  onUp: () => {
    window.isPortalModeActive = false;
    if (portalToggle) portalToggle.checked = false;
    document.body.classList.remove("portal-mode-active");
  },
});

// Hyper-Jump (Alt + Shift + J)
im.register({
  id: "hyper-jump",
  category: "effects",
  description: "Hyper jump (Alt+Shift+J)",
  combo: { alt: true, shift: true, code: "KeyJ" },
  type: "action",
  onDown: () => {
    if (!document.body.classList.contains("hyper-jump-active")) {
      document.body.classList.add("hyper-jump-active");
      setTimeout(() => document.body.classList.remove("hyper-jump-active"), 1000);
    }
  },
});

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

// Ripple Wave Hover Interaction (Alt + R)
im.register({
  id: "ripple-wave",
  category: "effects",
  description: "Ripple wave hover (Alt+R)",
  combo: { alt: true, code: "KeyR" },
  type: "hold",
  preventDefault: false,
  onDown: () => document.body.classList.add("ripple-wave-active"),
  onUp: () => document.body.classList.remove("ripple-wave-active"),
});

document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("ripple-wave-active")) {
    document.body.style.setProperty("--ripple-x", `${e.clientX}px`);
    document.body.style.setProperty("--ripple-y", `${e.clientY}px`);
  }
});

// Fabric Tear (Alt + T) — merges the old class toggle with the tear sound that
// lived in a duplicate Alt+T listener in main_init_3.
im.register({
  id: "fabric-tear",
  category: "reveal",
  description: "Fabric tear (Alt+T)",
  combo: { alt: true, code: "KeyT" },
  type: "hold",
  preventDefault: false,
  onDown: () => {
    if (!document.body.classList.contains("fabric-tear-active")) {
      document.body.classList.add("fabric-tear-active");
      if (typeof window.playTearSound === "function") window.playTearSound();
    }
  },
  onUp: () => {
    document.body.classList.remove("fabric-tear-active");
    if (editorEl) editorEl.style.removeProperty("--tear-mask");
  },
});

// Depth Spotlight (Alt + Shift + S)
im.register({
  id: "depth-spotlight",
  category: "reveal",
  description: "Depth spotlight (Alt+Shift+S)",
  combo: { alt: true, shift: true, code: "KeyS" },
  type: "toggle",
  onDown: () => document.body.classList.add("depth-spotlight-active"),
  onUp: () => document.body.classList.remove("depth-spotlight-active"),
});

// Hologram Preview (Alt + Shift + H)
im.register({
  id: "hologram-preview",
  category: "reveal",
  description: "Hologram preview (Alt+Shift+H)",
  combo: { alt: true, shift: true, code: "KeyH" },
  type: "toggle",
  onDown: () => document.body.classList.add("hologram-preview-active"),
  onUp: () => document.body.classList.remove("hologram-preview-active"),
});

// Focus Torch (Alt + Shift + F)
im.register({
  id: "focus-torch",
  category: "reveal",
  description: "Focus torch (Alt+Shift+F)",
  combo: { alt: true, shift: true, code: "KeyF" },
  type: "hold",
  onDown: () => document.body.classList.add("focus-torch-active"),
  onUp: () => document.body.classList.remove("focus-torch-active"),
});

// Venetian Blinds (Alt + Shift + B)
im.register({
  id: "venetian-blinds",
  category: "reveal",
  description: "Venetian blinds (Alt+Shift+B)",
  combo: { alt: true, shift: true, code: "KeyB" },
  type: "hold",
  onDown: () => {
    if (!window.isVenetianBlindsActive) {
      window.isVenetianBlindsActive = true;
      document.body.classList.add("venetian-blinds-interaction-active");
    }
  },
  onUp: () => {
    window.isVenetianBlindsActive = false;
    document.body.classList.remove("venetian-blinds-interaction-active");
  },
});

// Stepped Crater Reveal (Alt + Shift + C)
im.register({
  id: "stepped-crater",
  category: "reveal",
  description: "Stepped crater reveal (Alt+Shift+C)",
  combo: { alt: true, shift: true, code: "KeyC" },
  type: "hold",
  onDown: () => {
    if (!window.isSteppedCraterActive) {
      window.isSteppedCraterActive = true;
      document.body.classList.add("stepped-crater-active");
    }
  },
  onUp: () => {
    window.isSteppedCraterActive = false;
    document.body.classList.remove("stepped-crater-active");
    if (window.echoLayerEl) {
      window.echoLayerEl
        .querySelectorAll(".echo-document")
        .forEach((doc) => doc.style.removeProperty("--crater-radius"));
    }
  },
});

// Fold-out Gallery (Alt + Shift + G)
im.register({
  id: "fold-out-gallery",
  category: "reveal",
  description: "Fold-out gallery (Alt+Shift+G)",
  combo: { alt: true, shift: true, code: "KeyG" },
  type: "hold",
  onDown: () => {
    if (window.isFoldOutGalleryActive) return;
    window.isFoldOutGalleryActive = true;
    document.body.classList.add("fold-out-gallery-active");
    if (window.echoLayerEl) {
      const echoes = Array.from(window.echoLayerEl.querySelectorAll(".echo-document"));
      const total = echoes.length;
      echoes.forEach((doc, i) => {
        const isRight = i % 2 === 0;
        const spreadIndex = Math.floor(i / 2) + 1;
        const xOffset = spreadIndex * 350;
        const tx = isRight ? xOffset : -xOffset;
        const ty = i * 10 - total * 5;
        const tz = -100 - spreadIndex * 50;
        const ry = isRight ? -15 : 15;
        doc.style.setProperty("--fold-tx", `${tx}px`);
        doc.style.setProperty("--fold-ty", `${ty}px`);
        doc.style.setProperty("--fold-tz", `${tz}px`);
        doc.style.setProperty("--fold-ry", `${ry}deg`);
      });
    }
  },
  onUp: () => {
    window.isFoldOutGalleryActive = false;
    document.body.classList.remove("fold-out-gallery-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        doc.style.removeProperty("--fold-tx");
        doc.style.removeProperty("--fold-ty");
        doc.style.removeProperty("--fold-tz");
        doc.style.removeProperty("--fold-ry");
      });
    }
  },
});

// Matrix Dissolve Reveal (Alt + Y)
im.register({
  id: "matrix-dissolve",
  category: "reveal",
  description: "Matrix dissolve reveal (Alt+Y)",
  combo: { alt: true, code: "KeyY" },
  type: "hold",
  onDown: () => document.body.classList.add("matrix-dissolve-active"),
  onUp: () => document.body.classList.remove("matrix-dissolve-active"),
});

// Holographic Document Dispersion (Alt + X)
im.register({
  id: "dispersion",
  category: "reveal",
  description: "Holographic dispersion (Alt+X)",
  combo: { alt: true, code: "KeyX" },
  type: "hold",
  onDown: () => document.body.classList.add("dispersion-active"),
  onUp: () => document.body.classList.remove("dispersion-active"),
});

// Holographic Curtain Pull — reassigned Alt+P -> Alt+Shift+P (Alt+P is portal mode).
im.register({
  id: "curtain-pull",
  category: "reveal",
  description: "Holographic curtain pull (Alt+Shift+P)",
  combo: { alt: true, shift: true, code: "KeyP" },
  type: "hold",
  onDown: () => document.body.classList.add("curtain-pull-active"),
  onUp: () => document.body.classList.remove("curtain-pull-active"),
});

document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("sonar-pulse-active")) {
    document.body.style.setProperty("--sonar-x", `${e.clientX}px`);
    document.body.style.setProperty("--sonar-y", `${e.clientY}px`);

    // Use requestAnimationFrame for smooth UI updates
    if (!window.sonarPulseTicking) {
      window.requestAnimationFrame(() => {
        // Calculate local mouse position and distance for each document for the mask and blur effect
        const echoes = document.querySelectorAll(".echo-document");
        echoes.forEach((doc) => {
          const rect = doc.getBoundingClientRect();
          // Local coordinates relative to the element (for masks/backgrounds)
          const localX = e.clientX - rect.left;
          const localY = e.clientY - rect.top;
          doc.style.setProperty("--sonar-local-x", `${localX}px`);
          doc.style.setProperty("--sonar-local-y", `${localY}px`);

          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dist = Math.sqrt(Math.pow(centerX - e.clientX, 2) + Math.pow(centerY - e.clientY, 2));
          doc.style.setProperty("--sonar-dist", dist);
        });
        window.sonarPulseTicking = false;
      });
      window.sonarPulseTicking = true;
    }
  }

  if (document.body.classList.contains("depth-lens-active")) {
    document.body.style.setProperty("--lens-x", `${e.clientX}px`);
    document.body.style.setProperty("--lens-y", `${e.clientY}px`);

    // Find closest document to lens center
    const lensRadius = 125;
    let closestDoc = null;
    let minDistance = Infinity;

    // Get all echo documents that are visible
    const echoes = window.echoLayerEl ? window.echoLayerEl.querySelectorAll(".echo-document") : document.querySelectorAll(".echo-document");

    echoes.forEach((doc) => {
      doc.classList.remove("depth-lens-focus"); // reset
      const rect = doc.getBoundingClientRect();
      // Calculate center of document
      const docCenterX = rect.left + rect.width / 2;
      const docCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - docCenterX;
      const dy = e.clientY - docCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If within a reasonable radius of the lens (allowing for document size)
      if (dist < lensRadius + Math.max(rect.width, rect.height) / 2) {
         if (dist < minDistance) {
           minDistance = dist;
           closestDoc = doc;
         }
      }
    });

    if (closestDoc) {
      closestDoc.classList.add("depth-lens-focus");
    }
  }

  if (document.body.classList.contains("holographic-slice-active")) {
    document.body.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.body.style.setProperty("--mouse-y", `${e.clientY}px`);
  }

  if (document.body.classList.contains("venetian-blinds-interaction-active")) {
    const blindAngle = (e.clientY / window.innerHeight) * 100;
    document.body.style.setProperty("--blind-angle", `${blindAngle}%`);
  }

  if (document.body.classList.contains("stepped-crater-active")) {
    document.body.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.body.style.setProperty("--mouse-y", `${e.clientY}px`);

    if (window.editorEl) {
      const rect = window.editorEl.getBoundingClientRect();
      window.editorEl.style.setProperty("--mouse-local-x", `${e.clientX - rect.left}px`);
      window.editorEl.style.setProperty("--mouse-local-y", `${e.clientY - rect.top}px`);
    }

    if (window.echoLayerEl) {
      const echoes = Array.from(window.echoLayerEl.querySelectorAll(".echo-document"));
      // Map echoes to depth level
      echoes.forEach((doc, idx) => {
        // Calculate crater radius. Larger for closer elements, smaller for deeper.
        // Base is 150px, each deeper level shrinks it by 30px.
        let depth = parseInt(doc.getAttribute("data-index") || idx, 10);
        let radius = Math.max(0, 150 - (depth * 30));
        doc.style.setProperty("--crater-radius", `${radius}px`);

        // Also set local mouse coords for the crater ring glow
        const rect = doc.getBoundingClientRect();
        doc.style.setProperty("--mouse-local-x", `${e.clientX - rect.left}px`);
        doc.style.setProperty("--mouse-local-y", `${e.clientY - rect.top}px`);
      });
    }
  }
  if (document.body.classList.contains("curtain-pull-active")) {
    // Normalize mouse X from -1 to 1 based on screen width
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    document.body.style.setProperty("--mouse-x-norm", normX.toFixed(3));
  }

  if (document.body.classList.contains("peel-reveal-active")) {
    document.body.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.body.style.setProperty("--mouse-y", `${e.clientY}px`);
  }

  if (document.body.classList.contains("fabric-tear-active")) {
    if (editorEl) {
      const mouseX = e.clientX;
      const gradient = `linear-gradient(to right, black 0%, black calc(${mouseX}px - 50px), transparent calc(${mouseX}px - 20px), transparent calc(${mouseX}px + 20px), black calc(${mouseX}px + 50px), black 100%)`;
      editorEl.style.setProperty("--tear-mask", gradient);
    }
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

// Depth Beam (hold B) — guarded so it never fires while typing.
im.register({
  id: "depth-beam",
  category: "depth",
  description: "Depth beam (hold B)",
  combo: { key: "b" },
  type: "hold",
  preventDefault: false,
  onDown: () => document.body.classList.add("depth-beam-active"),
  onUp: () => {
    document.body.classList.remove("depth-beam-active");
    if (echoLayerEl) {
      echoLayerEl
        .querySelectorAll(".echo-document")
        .forEach((echo) => echo.classList.remove("depth-beam-intersect"));
    }
  },
});

document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("depth-beam-active")) {
    const beam = document.getElementById("depth-beam");
    if (beam) {
      const mx = e.clientX;
      const my = e.clientY;
      beam.style.left = `${mx - 150}px`; // Center the 300x300 radial gradient
      beam.style.top = `${my - 150}px`;
      beam.style.width = "300px";
      beam.style.height = "300px";
      beam.style.transform = `translateZ(500px)`; // visually floating
    }

    if (echoLayerEl) {
      const echoes = echoLayerEl.querySelectorAll(".echo-document");
      echoes.forEach((echo) => {
        const rect = echo.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.sqrt(
          Math.pow(e.clientX - cx, 2) + Math.pow(e.clientY - cy, 2),
        );

        if (dist < 150) {
          echo.classList.add("depth-beam-intersect");
        } else {
          echo.classList.remove("depth-beam-intersect");
        }
      });
    }
  }
});

window.archScrollOffset = 0;

document.addEventListener("wheel", (e) => {
  if (document.body.classList.contains("archway-active") && e.altKey) {
    e.preventDefault();
    const delta = e.deltaY;
    window.archScrollOffset += delta * 0.005; // Base scroll speed
    if (window.tabManager && window.tabManager.isArchwayView) {
        window.tabManager._renderEchoes();
    }
  }
}, { passive: false });

// Depth Slicer Logic (Alt + Scroll)
window.__depthSliceIndex = 0;
im.register({
  id: "depth-slice",
  category: "depth",
  description: "Depth slicer (hold Alt + scroll)",
  combo: { key: "Alt" },
  type: "hold",
  preventDefault: false,
  allowInEditor: true,
  onDown: () => {
    document.body.classList.add("depth-slice-active");
    updateDepthSlicer();
  },
  onUp: () => {
    document.body.classList.remove("depth-slice-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        doc.classList.remove("depth-slice-hidden");
        doc.classList.remove("depth-slice-focus");
      });
    }
  },
});

document.addEventListener("wheel", (e) => {
  if (e.altKey && !document.body.classList.contains("archway-active")) {
    e.preventDefault();
    if (e.deltaY > 0) {
      window.__depthSliceIndex++;
    } else {
      window.__depthSliceIndex = Math.max(0, window.__depthSliceIndex - 1);
    }
    updateDepthSlicer();
  }
}, { passive: false });

function updateDepthSlicer() {
  if (!document.body.classList.contains("depth-slice-active")) return;
  if (window.echoLayerEl) {
    const echoes = Array.from(window.echoLayerEl.querySelectorAll(".echo-document"));
    // Limit max slice index to number of background documents
    window.__depthSliceIndex = Math.min(window.__depthSliceIndex, Math.max(0, echoes.length - 1));

    echoes.forEach((doc, i) => {
      doc.classList.remove("depth-slice-hidden", "depth-slice-focus");
      if (i < window.__depthSliceIndex) {
        doc.classList.add("depth-slice-hidden");
      } else if (i === window.__depthSliceIndex) {
        doc.classList.add("depth-slice-focus");
      }
    });
  }
}

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

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      document.body.classList.remove("typing-pulse");
    }, 150); // Remove quickly for a snappy ripple
  }
});

// Obscured Layer Magnifier (Alt+M) / Magnetic Separation (Alt+Shift+M)
registerLensBindings(im);

// X-Ray Lens Interaction (Ctrl+Alt+X toggle)
im.register({
  id: "xray-lens",
  category: "lens",
  description: "X-ray lens (Ctrl+Alt+X)",
  combo: { ctrl: true, alt: true, code: "KeyX" },
  type: "toggle",
  onDown: (e) => {
    document.body.classList.add("xray-lens-active");
    const echoLayer = document.getElementById("echo-layer");
    if (echoLayer) {
      echoLayer.querySelectorAll(".echo-document").forEach((doc) => {
        const rect = doc.getBoundingClientRect();
        doc.style.setProperty("--xray-local-x", `${e.clientX - rect.left}px`);
        doc.style.setProperty("--xray-local-y", `${e.clientY - rect.top}px`);
      });
    }
  },
  onUp: () => document.body.classList.remove("xray-lens-active"),
});

document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("xray-lens-active")) {
    const echoLayer = document.getElementById("echo-layer");
    if (echoLayer) {
      echoLayer.querySelectorAll(".echo-document").forEach((doc) => {
          const rect = doc.getBoundingClientRect();
          doc.style.setProperty("--xray-local-x", `${e.clientX - rect.left}px`);
          doc.style.setProperty("--xray-local-y", `${e.clientY - rect.top}px`);
      });
    }
  }
});

// Neon Trace Scanner (Alt + S)
let isTraceScannerActive = false;
let traceScannerRaf = null;
let traceScannerY = 0;
let traceScannerVelocity = 15;
let traceScannerEl = null;

im.register({
  id: "neon-trace",
  category: "effects",
  description: "Neon trace scanner (Alt+S)",
  combo: { alt: true, code: "KeyS" },
  type: "action",
  onDown: () => {
    if (isTraceScannerActive) return;
    isTraceScannerActive = true;
    document.body.classList.add("trace-scanner-active");

    if (!traceScannerEl) {
      traceScannerEl = document.createElement("div");
      traceScannerEl.id = "trace-scanner-line";
      document.body.appendChild(traceScannerEl);
    }

    traceScannerEl.style.display = "block";
    traceScannerY = -100;

    const scanLoop = () => {
      if (!isTraceScannerActive) return;

      traceScannerY += traceScannerVelocity;
      traceScannerEl.style.transform = `translateY(${traceScannerY}px)`;

      // Hit detection
      if (window.echoLayerEl) {
        window.echoLayerEl.querySelectorAll(".echo-document").forEach(doc => {
          const rect = doc.getBoundingClientRect();
          // Check if scanline intersects with document bounding box
          if (traceScannerY > rect.top && traceScannerY < rect.bottom) {
            doc.classList.add("trace-hit");
            doc.style.setProperty("--trace-y-percent", `${((traceScannerY - rect.top) / rect.height) * 100}%`);
          } else {
            doc.classList.remove("trace-hit");
          }
        });
      }

      if (traceScannerY > window.innerHeight + 100) {
        // Reset or finish
        isTraceScannerActive = false;
        document.body.classList.remove("trace-scanner-active");
        traceScannerEl.style.display = "none";
        if (window.echoLayerEl) {
          window.echoLayerEl.querySelectorAll(".echo-document").forEach(doc => {
            doc.classList.remove("trace-hit");
          });
        }
      } else {
        traceScannerRaf = requestAnimationFrame(scanLoop);
      }
    };

    traceScannerRaf = requestAnimationFrame(scanLoop);
  },
});

// Magnetic Repulsion Field (Hold M) — guarded against editor typing.
let isMagneticRepulsionActive = false;
im.register({
  id: "magnetic-repulsion",
  category: "effects",
  description: "Magnetic repulsion field (hold M)",
  combo: { key: "m" },
  type: "hold",
  preventDefault: false,
  onDown: () => {
    if (!isMagneticRepulsionActive) {
      isMagneticRepulsionActive = true;
      document.body.classList.add("magnetic-repulsion-active");
    }
  },
  onUp: () => {
    isMagneticRepulsionActive = false;
    document.body.classList.remove("magnetic-repulsion-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        doc.style.removeProperty("--repulse-tx");
        doc.style.removeProperty("--repulse-ty");
        doc.style.removeProperty("--repulse-rot");
      });
    }
  },
});

document.addEventListener("mousemove", (e) => {
  if (isMagneticRepulsionActive && window.echoLayerEl) {
    const echoes = window.echoLayerEl.querySelectorAll(".echo-document");
    const maxDist = 300;
    echoes.forEach(doc => {
      const rect = doc.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.sqrt((cx - e.clientX)**2 + (cy - e.clientY)**2);

      if (dist < maxDist) {
        const force = Math.pow(1 - dist / maxDist, 2);
        const dx = cx - e.clientX;
        const dy = cy - e.clientY;
        const pushX = (dx / (dist || 1)) * force * 150;
        const pushY = (dy / (dist || 1)) * force * 150;
        const rot = (dx / (dist || 1)) * force * 15;

        doc.style.setProperty("--repulse-tx", `${pushX}px`);
        doc.style.setProperty("--repulse-ty", `${pushY}px`);
        doc.style.setProperty("--repulse-rot", `${rot}deg`);
      } else {
        doc.style.setProperty("--repulse-tx", `0px`);
        doc.style.setProperty("--repulse-ty", `0px`);
        doc.style.setProperty("--repulse-rot", `0deg`);
      }
    });
  }
});

// Layer Peek Glass (Alt+K)
im.register({
  id: "layer-peek-glass",
  category: "lens",
  description: "Layer peek glass (Alt+K)",
  combo: { alt: true, code: "KeyK" },
  type: "hold",
  onDown: () => document.body.classList.add("layer-peek-glass-active"),
  onUp: () => {
    document.body.classList.remove("layer-peek-glass-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        doc.classList.remove("peek-focus");
        doc.style.removeProperty("--peek-x");
        doc.style.removeProperty("--peek-y");
      });
    }
  },
});

document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("layer-peek-glass-active")) {
    // Find the topmost document under cursor that isn't the editor
    let target = document.elementFromPoint(e.clientX, e.clientY);
    let echoDoc = target ? target.closest(".echo-document") : null;

    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach(doc => {
        if (doc === echoDoc) {
          doc.classList.add("peek-focus");
        } else {
          doc.classList.remove("peek-focus");
          const rect = doc.getBoundingClientRect();
          doc.style.setProperty("--peek-x", `${e.clientX - rect.left}px`);
          doc.style.setProperty("--peek-y", `${e.clientY - rect.top}px`);
        }
      });
    }
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
// Start the unified keyboard dispatcher after every feature (across all
// main_init_* shards) has registered its bindings.
initInteractions(im);
