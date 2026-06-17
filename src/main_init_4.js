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

document.addEventListener("keydown", (e) => {
  // Explode View (Ctrl + Alt + E)
  if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === "KeyE") {
    e.preventDefault();
    triggerExplodeView();
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

  if (e.key === "s" || e.key === "S" || e.key === "Alt" || e.key === "Shift") {
    document.body.classList.remove("holographic-slice-active");
  }
});

document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("holographic-slice-active")) {
    document.body.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.body.style.setProperty("--mouse-y", `${e.clientY}px`);
  }
  if (document.body.classList.contains("curtain-pull-active")) {
    // Normalize mouse X from -1 to 1 based on screen width
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    document.body.style.setProperty("--mouse-x-norm", normX.toFixed(3));
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
