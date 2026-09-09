/**
 * Single-class reveal/depth toggle bindings (card shuffle, explode view,
 * focus pull, sonar pulse, prism depth, depth scan, depth lens, fanning,
 * portal mode, hyper jump, ripple wave, fabric tear, and the remaining
 * Alt+Shift reveal toggles). Extracted from the original single-file
 * EchoDocumentInteractions.js purely to keep file size down.
 */
export function initRevealToggles(im) {
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
}
