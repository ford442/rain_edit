import * as monaco from "monaco-editor";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.js";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.js";
import "monaco-editor/esm/vs/language/json/monaco.contribution";
import "monaco-editor/esm/vs/basic-languages/html/html.js";
import "monaco-editor/esm/vs/basic-languages/css/css.js";
import "monaco-editor/esm/vs/basic-languages/markdown/markdown.js";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import RainLayer from "./RainLayer";
import Raindrops from "./vendor/raindrops.js";
import { ReferenceManager } from "./ReferenceManager.js";
import { ConnectionManager } from "./ConnectionManager.js";
import { FogManager } from "./FogManager.js";
import { HoloManager } from "./HoloManager.js";
import { TabManager } from "./TabManager.js";
import { StorageAPI } from "./StorageAPI.js";
import { Cabinet3D } from "./Cabinet3D.js";
import { VPSFileBrowser } from "./VPSFileBrowser.js";
import DataSiphon from "./DataSiphon.js";
import { VeilExcavator } from "./VeilExcavator.js";
import { HolographicMinimap } from "./HolographicMinimap.js";
import backFrag from "./shaders/water-back.frag?glslify";
import frontFrag from "./shaders/water.frag?glslify";
import vertSrc from "./shaders/simple.vert?glslify";


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

document.addEventListener("keyup", (e) => {
  if (e.key === "Alt") {
    if (depthCursorEl) {
      depthCursorEl.remove();
      depthCursorEl = null;
    }
    document.body.classList.remove("depth-cursor-active");
    const echoes = document.querySelectorAll(".echo-document");
    echoes.forEach(doc => doc.classList.remove("depth-cursor-hit"));
  }
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

document.addEventListener("keydown", (e) => {
  // Card Shuffle Spread (Alt + Shift + D)
  if (e.altKey && e.shiftKey && e.code === "KeyD") {
    e.preventDefault();
    if (!window.isCardShuffleActive) {
      window.isCardShuffleActive = true;
      document.body.classList.add("card-shuffle-active");
    }
  }

  // Explode View (Ctrl + Alt + E)
  if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === "KeyE") {
    e.preventDefault();
    triggerExplodeView();
    return;
  }

  // Innovate: Focus Pull Interaction (Alt + F)
  if (e.altKey && e.code === "KeyF" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    if (!document.body.classList.contains("focus-pull-active")) {
      document.body.classList.add("focus-pull-active");
    }
  }

  // Innovate: Sonar Pulse Reveal (Alt + O)
  if (e.altKey && e.code === "KeyO" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    if (!document.body.classList.contains("sonar-pulse-active")) {
      document.body.classList.add("sonar-pulse-active");
    }
  }

  // Innovate: Prismatic Depth Separation (Alt + U)
  if (e.altKey && e.code === "KeyU" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    if (!document.body.classList.contains("prism-depth-active")) {
      document.body.classList.add("prism-depth-active");
    }
  }

  // Depth X-Ray Scan (Alt + Z)
  if (e.altKey && e.code === "KeyZ" && !e.ctrlKey && !e.shiftKey) {
    e.preventDefault();
    if (!window.isDepthScanActive) {
      window.isDepthScanActive = true;
      document.body.classList.add("depth-scan-active");

      // Start scanning animation
      window.__depthScanTarget = 0;
      const animateScan = () => {
        if (!window.isDepthScanActive) return;

        window.__depthScanTarget = (window.__depthScanTarget + 0.1) % 15; // Assuming max depth ~15
        document.body.style.setProperty("--scan-depth", window.__depthScanTarget);

        if (window.echoLayerEl) {
          const echoes = window.echoLayerEl.querySelectorAll(".echo-document");
          echoes.forEach((doc) => {
            const idx = parseInt(doc.dataset.index || 0, 10);
            const dist = Math.abs(idx - window.__depthScanTarget);

            if (dist < 1.5) {
              doc.classList.add("scan-highlight");
            } else {
              doc.classList.remove("scan-highlight");
            }
          });
        }

        requestAnimationFrame(animateScan);
      };
      requestAnimationFrame(animateScan);
    }
    return;
  }

  // Depth Lens (Ctrl + Alt + Z)
  if (e.ctrlKey && e.altKey && e.code === "KeyZ") {
    e.preventDefault();
    document.body.classList.toggle("depth-lens-active");

    // Create lens element if it doesn't exist
    if (!document.getElementById("depth-lens-element")) {
      const lens = document.createElement("div");
      lens.id = "depth-lens-element";
      document.body.appendChild(lens);
    }

    // Clean up focus state if deactivating
    if (!document.body.classList.contains("depth-lens-active")) {
      document.querySelectorAll(".depth-lens-focus").forEach(el => el.classList.remove("depth-lens-focus"));
    }
    return;
  }

  // Document Fanning (Alt + C)
  if (e.altKey && e.code === "KeyC") {
    if (!isFanningActive) {
      isFanningActive = true;
      document.body.classList.add("fanning-active");

      if (echoLayerEl) {
        const echoes = echoLayerEl.querySelectorAll(
          ".echo-document:not(.peek)",
        );
        const total = echoes.length;
        if (total > 0) {
          const maxAngle = Math.min(120, total * 15); // max spread 120deg
          const startAngle = -maxAngle / 2;
          const angleStep = total > 1 ? maxAngle / (total - 1) : 0;
          const radius = 600; // Radius of the fanning arc

          echoes.forEach((echo, index) => {
            const angleDeg = startAngle + index * angleStep;
            const angleRad = (angleDeg * Math.PI) / 180;
            const tx = Math.sin(angleRad) * radius;
            // Negative ty to push them slightly upwards forming an arch
            const ty = -Math.cos(angleRad) * radius + radius * 0.8;

            // Optional: push them a bit forward to pop them
            const tz = 100 + index * 5;

            echo.style.setProperty("--fan-tx", `${tx}px`);
            echo.style.setProperty("--fan-ty", `${ty}px`);
            echo.style.setProperty("--fan-tz", `${tz}px`);
            echo.style.setProperty("--fan-rot-z", `${angleDeg}deg`);
          });
        }
      }
    }
    e.preventDefault();
    return;
  }

  // Holographic Portal Mode (Alt + P)
  if (e.altKey && e.code === "KeyP") {
    isPortalModeActive = !isPortalModeActive;
    if (portalToggle) portalToggle.checked = isPortalModeActive;
    if (isPortalModeActive) {
      document.body.classList.add("portal-mode-active");
    } else {
      document.body.classList.remove("portal-mode-active");
    }
    e.preventDefault();
    return;
  }

  // Hyper-Jump
  if (e.altKey && e.shiftKey && e.key === "J") {
    if (!document.body.classList.contains("hyper-jump-active")) {
      document.body.classList.add("hyper-jump-active");
      setTimeout(
        () => document.body.classList.remove("hyper-jump-active"),
        1000,
      );
    }
    e.preventDefault();
    return;
  }

  if (e.altKey && e.shiftKey) {
    if (!isPeelActive) {
      isPeelActive = true;
      document.body.classList.add("peel-active");
    }
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
      window.__lensActive = false;
    }
  }

  if (e.key === "Alt" || e.key === "Shift") {
    if (!e.altKey || !e.shiftKey) {
      isPeelActive = false;
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
        const echoes = echoLayerEl.querySelectorAll(".echo-document");
        echoes.forEach((echo) => {
          echo.style.removeProperty("transform");
          echo.style.setProperty(
            "--tz-val",
            echo.style.getPropertyValue("--tz"),
          );
        });
      }
    }
  }
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
document.addEventListener("keydown", (e) => {
  if (e.altKey && e.key.toLowerCase() === "r" && !e.shiftKey && !e.ctrlKey) {
    if (!document.body.classList.contains("ripple-wave-active")) {
      document.body.classList.add("ripple-wave-active");
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "r" || !e.altKey) {
    document.body.classList.remove("ripple-wave-active");
  }
});

document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("ripple-wave-active")) {
    document.body.style.setProperty("--ripple-x", `${e.clientX}px`);
    document.body.style.setProperty("--ripple-y", `${e.clientY}px`);
  }
});

document.addEventListener("keydown", (e) => {
  if (
    e.altKey &&
    e.code === "KeyT" &&
    !e.shiftKey &&
    !e.ctrlKey &&
    !e.metaKey
  ) {
    if (!document.body.classList.contains("fabric-tear-active")) {
      document.body.classList.add("fabric-tear-active");
    }
  }

  if (e.altKey && e.shiftKey && e.code === "KeyS") {
    e.preventDefault();
    document.body.classList.toggle("depth-spotlight-active");
  }
  if (e.altKey && e.shiftKey && e.code === "KeyH") {
    e.preventDefault();
    document.body.classList.toggle("hologram-preview-active");
  }
  if (e.altKey && e.shiftKey && e.code === "KeyF") {
    e.preventDefault();
    document.body.classList.add("focus-torch-active");
  }

  // Venetian Blinds Interaction (Alt + Shift + B)
  if (e.altKey && e.shiftKey && e.code === "KeyB") {
    e.preventDefault();
    if (!window.isVenetianBlindsActive) {
      window.isVenetianBlindsActive = true;
      document.body.classList.add("venetian-blinds-interaction-active");
    }
  }

  // Stepped Crater Reveal (Alt + Shift + C)
  if (e.altKey && e.shiftKey && e.code === "KeyC") {
    e.preventDefault();
    if (!window.isSteppedCraterActive) {
      window.isSteppedCraterActive = true;
      document.body.classList.add("stepped-crater-active");
    }
  }

  // Fold-out Gallery Interaction (Alt + Shift + G)
  if (e.altKey && e.shiftKey && e.code === "KeyG") {
    e.preventDefault();
    if (!window.isFoldOutGalleryActive) {
      window.isFoldOutGalleryActive = true;
      document.body.classList.add("fold-out-gallery-active");

      if (window.echoLayerEl) {
        const echoes = Array.from(window.echoLayerEl.querySelectorAll(".echo-document"));
        const total = echoes.length;
        echoes.forEach((doc, i) => {
          // Spread logic: even indices go right, odd indices go left
          const isRight = i % 2 === 0;
          const spreadIndex = Math.floor(i / 2) + 1;
          const xOffset = spreadIndex * 350; // Horizontal spacing

          const tx = isRight ? xOffset : -xOffset;
          const ty = (i * 10) - (total * 5); // Slight vertical arc
          const tz = -100 - (spreadIndex * 50); // Push further ones back slightly
          const ry = isRight ? -15 : 15; // Angle them inwards

          doc.style.setProperty("--fold-tx", `${tx}px`);
          doc.style.setProperty("--fold-ty", `${ty}px`);
          doc.style.setProperty("--fold-tz", `${tz}px`);
          doc.style.setProperty("--fold-ry", `${ry}deg`);
        });
      }
    }
  }
  // Matrix Dissolve Reveal (Alt+Y)
  if (e.altKey && e.code === "KeyY" && !e.shiftKey) {
    e.preventDefault();
    document.body.classList.add("matrix-dissolve-active");
  }

  // Holographic Document Dispersion (Alt+X)
  if (e.altKey && e.code === "KeyX" && !e.shiftKey) {
    e.preventDefault();
    document.body.classList.add("dispersion-active");
  }

  // Holographic Curtain Pull (Alt+P)
  if (e.altKey && e.code === "KeyP" && !e.shiftKey) {
    e.preventDefault();
    document.body.classList.add("curtain-pull-active");
  }
});

document.addEventListener("keyup", (e) => {
  // Matrix Dissolve Reveal (Alt+Y)
  if (e.key === "y" || e.key === "Y" || e.key === "Alt") {
    document.body.classList.remove("matrix-dissolve-active");
  }

  // Depth X-Ray Scan (Alt + Z)
  if (e.key === "z" || e.key === "Z" || e.key === "Alt") {
    if (window.isDepthScanActive && (!e.altKey || e.code === "KeyZ")) {
      window.isDepthScanActive = false;
      document.body.classList.remove("depth-scan-active");
      if (window.echoLayerEl) {
        window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
          doc.classList.remove("scan-highlight");
        });
      }
    }
  }

  // Holographic Document Dispersion (Alt+X)
  if (e.key === "x" || e.key === "X" || e.key === "Alt") {
    document.body.classList.remove("dispersion-active");
  }

  // Holographic Curtain Pull (Alt+P)
  if (e.key === "p" || e.key === "P" || e.key === "Alt") {
    document.body.classList.remove("curtain-pull-active");
  }

  if (e.key === "t" || e.key === "T" || e.key === "Alt") {
    document.body.classList.remove("fabric-tear-active");
    if (editorEl) {
      editorEl.style.removeProperty("--tear-mask");
    }
  }

  if (e.key === "f" || e.key === "F" || e.key === "Alt" || e.key === "Shift") {
    document.body.classList.remove("focus-torch-active");
  }

  if (e.key === "b" || e.key === "B" || e.key === "Alt" || e.key === "Shift") {
    if (window.isVenetianBlindsActive && (!e.altKey || !e.shiftKey || e.code === "KeyB")) {
      window.isVenetianBlindsActive = false;
      document.body.classList.remove("venetian-blinds-interaction-active");
    }
  }

  if (e.key === "c" || e.key === "C" || e.key === "Alt" || e.key === "Shift") {
    if (window.isSteppedCraterActive && (!e.altKey || !e.shiftKey || e.code === "KeyC")) {
      window.isSteppedCraterActive = false;
      document.body.classList.remove("stepped-crater-active");
      if (window.echoLayerEl) {
        window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
          doc.style.removeProperty("--crater-radius");
        });
      }
    }
  }

  if (e.key === "g" || e.key === "G" || e.key === "Alt" || e.key === "Shift") {
    if (window.isFoldOutGalleryActive && (!e.altKey || !e.shiftKey || e.code === "KeyG")) {
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
    }
  }

  if (e.key === "d" || e.key === "D" || e.key === "Alt" || e.key === "Shift") {
    if (window.isCardShuffleActive && (!e.altKey || !e.shiftKey || e.code === "KeyD")) {
      window.isCardShuffleActive = false;
      document.body.classList.remove("card-shuffle-active");
    }
  }

  if (e.key === "s" || e.key === "S" || e.key === "Alt" || e.key === "Shift") {
    document.body.classList.remove("holographic-slice-active");
  }
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

document.addEventListener("keydown", (e) => {
  if (e.key === "Shift" && !document.body.classList.contains("x-ray-active")) {
    document.body.classList.add("quantum-depth-active");
  }
});

// Peel Reveal logic
let isPeeling = false;

document.addEventListener("keydown", (e) => {
  if (e.altKey && e.shiftKey && e.key.toLowerCase() === "v" && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    document.body.classList.add("peel-reveal-active");
    document.body.style.setProperty("--peel-x", `100vw`);
    document.body.style.setProperty("--peel-y", `0px`);
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "v" || e.key === "Alt" || e.key === "Shift") {
    document.body.classList.remove("peel-reveal-active");
    isPeeling = false;
  }
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

document.addEventListener("keydown", (e) => {
  if (e.altKey && e.key.toLowerCase() === "m") {
    e.preventDefault();
    document.body.classList.add("magnetic-pulse-active");

    // Play a ripple effect or sound if available, otherwise just remove class after animation
    setTimeout(() => {
      document.body.classList.remove("magnetic-pulse-active");
    }, 600); // 600ms matching CSS transition/animation
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Shift") {
    document.body.classList.remove("quantum-depth-active");
    document.body.removeAttribute("data-active-depth");
  }
});

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

document.addEventListener("keydown", (e) => {
  if (
    e.key.toLowerCase() === "b" &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    document.activeElement.tagName !== "TEXTAREA" &&
    document.activeElement.tagName !== "INPUT"
  ) {
    document.body.classList.add("depth-beam-active");
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "b") {
    document.body.classList.remove("depth-beam-active");
    if (echoLayerEl) {
      echoLayerEl.querySelectorAll(".echo-document").forEach((echo) => {
        echo.classList.remove("depth-beam-intersect");
      });
    }
  }
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
document.addEventListener("keydown", (e) => {
  if (e.key === "Alt") {
    document.body.classList.add("depth-slice-active");
    updateDepthSlicer();
  }
});
document.addEventListener("keyup", (e) => {
  if (e.key === "Alt") {
    document.body.classList.remove("depth-slice-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        doc.classList.remove("depth-slice-hidden");
        doc.classList.remove("depth-slice-focus");
      });
    }
  }
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

document.addEventListener("keydown", (e) => {
  if (e.altKey && e.code === "KeyJ" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    document.body.classList.add("pulse-wave-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        const index = parseInt(doc.dataset.index || "0", 10);
        doc.style.setProperty("--pulse-delay", `${index * 0.1}s`);
      });
    }

    // Remove class after animation finishes
    setTimeout(() => {
      document.body.classList.remove("pulse-wave-active");
    }, 1500); // Wait long enough for wave to pass through layers
  }
});

// Interactive Drawer Peek logic
document.addEventListener("keydown", (e) => {
  if (e.key === "Shift") {
    document.body.classList.add("drawer-peek-ready");
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Shift") {
    document.body.classList.remove("drawer-peek-ready");
  }
});

// Layer Isolate Logic (Hold 'I')
document.addEventListener("keydown", (e) => {
  if (e.key === "i" || e.key === "I") {
    // Only trigger if not typing in an input or textarea
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.classList.contains("monaco-editor")) return;
    document.body.classList.add("layer-isolate-active");
  }
});
document.addEventListener("keyup", (e) => {
  if (e.key === "i" || e.key === "I") {
    document.body.classList.remove("layer-isolate-active");
  }
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
document.addEventListener("keydown", (e) => {
  if (e.altKey && e.code === "KeyM" && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    if (!document.body.classList.contains("magnifier-active")) {
      document.body.classList.add("magnifier-active");
    if (e.shiftKey) {
      if (!document.body.classList.contains("magnetic-sep-active")) {
        document.body.classList.add("magnetic-sep-active");
      }
    } else {
      if (!document.body.classList.contains("obscured-magnifier-active")) {
        document.body.classList.add("obscured-magnifier-active");
      }
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "m" || e.key === "M" || e.key === "Alt") {
    document.body.classList.remove("magnifier-active");
  if (e.key === "m" || e.key === "M" || e.key === "Alt" || e.key === "Shift") {
    document.body.classList.remove("obscured-magnifier-active");
    document.body.classList.remove("magnetic-sep-active");
  }
});

document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("magnifier-active")) {
    document.body.style.setProperty("--lens-x", `${e.clientX}px`);
    document.body.style.setProperty("--lens-y", `${e.clientY}px`);
  }
  if (document.body.classList.contains("magnetic-sep-active")) {
    document.body.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.body.style.setProperty("--mouse-y", `${e.clientY}px`);
  }
});

// X-Ray Lens Interaction (Ctrl+Alt+X toggle)
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.altKey && e.code === "KeyX" && !e.shiftKey && !e.metaKey) {
    e.preventDefault();
    document.body.classList.toggle("xray-lens-active");

    // Set initial local coordinates if activating
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
  }
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

document.addEventListener("keydown", (e) => {
  if (e.altKey && (e.key === "s" || e.key === "S") && !e.shiftKey && !e.ctrlKey && !e.metaKey && !isTraceScannerActive) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    e.preventDefault();
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
  }
});

// Magnetic Repulsion Field (Hold M)
let isMagneticRepulsionActive = false;
document.addEventListener("keydown", (e) => {
  if ((e.key === "m" || e.key === "M") && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (!isMagneticRepulsionActive) {
      isMagneticRepulsionActive = true;
      document.body.classList.add("magnetic-repulsion-active");
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "m" || e.key === "M") {
    isMagneticRepulsionActive = false;
    document.body.classList.remove("magnetic-repulsion-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach(doc => {
        doc.style.removeProperty("--repulse-tx");
        doc.style.removeProperty("--repulse-ty");
        doc.style.removeProperty("--repulse-rot");
      });
    }
  }
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
