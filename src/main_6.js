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
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "s") {
    e.preventDefault();

    // Trigger Sonic Boom animation
    document.body.classList.add("sonic-boom-active");
    setTimeout(() => {
      document.body.classList.remove("sonic-boom-active");
    }, 400);

    const activeFile = tabManager.files.find(
      (f) => f.id === tabManager.activeId,
    );
    if (!activeFile || activeFile.isImage) return;

    if (activeFile.cabinetType === "notes" || activeFile.noteName) {
      const noteName =
        activeFile.noteName || activeFile.cabinetId || activeFile.name;
      const content = activeFile.model ? activeFile.model.getValue() : "";
      storageAPI
        .saveNote(noteName, content)
        .then((result) => {
          if (result && result.success) {
            tabManager._showToast(`✅ Note "${noteName}" saved!`);
          } else {
            tabManager._showToast(`❌ Failed to save note "${noteName}"`, true);
          }
        })
        .catch((err) => {
          console.error("Save note error:", err);
          tabManager._showToast(`❌ Error saving note: ${err.message}`, true);
        });
    }
  }
});

window.tabManager = tabManager;

initSemanticResonance(editor, tabManager);

initKineticTypingPulse(editor);

window.isPeelActive = false;

window.isFanningActive = false;

window.isExplodeViewActive = false;

window.triggerExplodeView = function triggerExplodeView() {
  const echoLayerEl = document.getElementById("echo-layer");
  if (!echoLayerEl) return;

  isExplodeViewActive = !isExplodeViewActive;

  if (isExplodeViewActive) {
    document.body.classList.add("explode-view-active");
    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    const total = echoes.length;

    echoes.forEach((echo, index) => {
      // Calculate spherical coordinates for explosion
      const phi = Math.acos(1 - (2 * (index + 0.5)) / total);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;

      const radius = 800 + Math.random() * 400; // Explode outwards

      const tx = radius * Math.sin(phi) * Math.cos(theta);
      const ty = radius * Math.sin(phi) * Math.sin(theta);
      const tz = radius * Math.cos(phi) - 200;

      const rotX = (Math.random() - 0.5) * 180;
      const rotY = (Math.random() - 0.5) * 180;
      const rotZ = (Math.random() - 0.5) * 180;

      echo.style.setProperty("--exp-tx", `${tx}px`);
      echo.style.setProperty("--exp-ty", `${ty}px`);
      echo.style.setProperty("--exp-tz", `${tz}px`);
      echo.style.setProperty("--exp-rot-x", `${rotX}deg`);
      echo.style.setProperty("--exp-rot-y", `${rotY}deg`);
      echo.style.setProperty("--exp-rot-z", `${rotZ}deg`);
    });
  } else {
    document.body.classList.remove("explode-view-active");
    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    echoes.forEach((echo) => {
      echo.style.removeProperty("--exp-tx");
      echo.style.removeProperty("--exp-ty");
      echo.style.removeProperty("--exp-tz");
      echo.style.removeProperty("--exp-rot-x");
      echo.style.removeProperty("--exp-rot-y");
      echo.style.removeProperty("--exp-rot-z");
    });
  }
};

window.btnExplode = document.getElementById("btn-explode-view");

if (btnExplode) {
  btnExplode.addEventListener("click", triggerExplodeView);
}

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

window.initSemanticResonance = function initSemanticResonance(editor, tabManager) {
  let resonanceTimeout;

  editor.onDidChangeCursorSelection((e) => {
    // 1. Clear previous timeout to debounce rapid selection changes
    clearTimeout(resonanceTimeout);

    resonanceTimeout = setTimeout(() => {
      // 2. Get the currently selected text
      const selection = e.selection;
      const model = editor.getModel();
      const selectedText = model.getValueInRange(selection).trim();

      // 3. Reset all documents if selection is too short
      if (selectedText.length < 3) {
        clearAllResonances();
        return;
      }

      // 4. Check background files for the text
      tabManager.files.forEach((file) => {
        // Skip the currently active file
        if (file.id === tabManager.activeId) return;

        // Find the DOM element for this file's echo document
        const echoNode = document.querySelector(
          `.echo-document[data-id="${file.id}"]`,
        );
        if (!echoNode) return;

        // Check if the background model contains the selected text
        const fileContent = file.model.getValue();
        if (fileContent.includes(selectedText)) {
          echoNode.classList.add("semantic-resonance");
        } else {
          echoNode.classList.remove("semantic-resonance");
        }
      });
    }, 150); // 150ms debounce
  });

  function clearAllResonances() {
    document.querySelectorAll(".semantic-resonance").forEach((node) => {
      node.classList.remove("semantic-resonance");
    });
  }
};

window.initKineticTypingPulse = function initKineticTypingPulse(editor) {
  let pulseTimeout;

  editor.onDidChangeModelContent(() => {
    const echoLayerEl = document.getElementById("echo-layer");
    if (!echoLayerEl) return;

    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    echoes.forEach((echo) => {
      echo.classList.add("typing-pulse");
    });

    clearTimeout(pulseTimeout);
    pulseTimeout = setTimeout(() => {
      echoes.forEach((echo) => {
        echo.classList.remove("typing-pulse");
      });
    }, 150);
  });
};

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

  // Repulsor Field (Alt+R)
  if (e.altKey && e.code === "KeyR" && !e.shiftKey) {
    e.preventDefault();
    document.body.classList.add("repulsor-active");
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

  // Repulsor Field (Alt+R)
  if (e.key === "r" || e.key === "R" || e.key === "Alt") {
    document.body.classList.remove("repulsor-active");
    if (echoLayerEl) {
      const echoes = echoLayerEl.querySelectorAll(".echo-document");
      echoes.forEach((echo) => {
        echo.style.removeProperty("--repulse-tx");
        echo.style.removeProperty("--repulse-ty");
      });
    }
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

  // Repulsor Field calculation
  if (document.body.classList.contains("repulsor-active") && echoLayerEl) {
    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const maxDist = 300; // Repulsion radius

    echoes.forEach((echo) => {
      const rect = echo.getBoundingClientRect();
      // Calculate center of the echo
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = cx - mouseX;
      const dy = cy - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < maxDist) {
        // Calculate repulsion strength (closer = stronger)
        const strength = Math.pow((maxDist - dist) / maxDist, 2);
        // Normalize direction vector
        const dirX = dx / (dist || 1);
        const dirY = dy / (dist || 1);

        // Max push distance
        const maxPush = 200;
        const pushX = dirX * strength * maxPush;
        const pushY = dirY * strength * maxPush;

        echo.style.setProperty("--repulse-tx", `${pushX}px`);
        echo.style.setProperty("--repulse-ty", `${pushY}px`);
      } else {
        echo.style.setProperty("--repulse-tx", `0px`);
        echo.style.setProperty("--repulse-ty", `0px`);
      }
    });
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

// Gravity Well (Alt+G)
document.addEventListener("keydown", (e) => {
  if (e.altKey && e.code === "KeyG" && !e.shiftKey) {
    e.preventDefault();
    if (!document.body.classList.contains("gravity-well-active")) {
      document.body.classList.add("gravity-well-active");
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "g" || e.key === "G" || e.key === "Alt") {
    document.body.classList.remove("gravity-well-active");
    if (echoLayerEl) {
      const echoes = echoLayerEl.querySelectorAll(".echo-document");
      echoes.forEach((echo) => {
        echo.style.removeProperty("--gravity-tx");
        echo.style.removeProperty("--gravity-ty");
        echo.style.removeProperty("--gravity-tz");
      });
    }
  }
});

document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("gravity-well-active") && echoLayerEl) {
    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const maxDist = 600; // Pull radius

    echoes.forEach((echo) => {
      const rect = echo.getBoundingClientRect();
      // Calculate center of the echo
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = mouseX - cx;
      const dy = mouseY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < maxDist) {
        // Calculate gravity strength (closer = stronger pull)
        const strength = Math.pow((maxDist - dist) / maxDist, 1.5);

        // Max pull distance toward cursor
        const pullFactorX = dx * strength * 0.8;
        const pullFactorY = dy * strength * 0.8;
        const pullFactorZ = strength * 200; // Lift up toward screen

        echo.style.setProperty("--gravity-tx", `${pullFactorX}px`);
        echo.style.setProperty("--gravity-ty", `${pullFactorY}px`);
        echo.style.setProperty("--gravity-tz", `${pullFactorZ}px`);
      } else {
        echo.style.setProperty("--gravity-tx", `0px`);
        echo.style.setProperty("--gravity-ty", `0px`);
        echo.style.setProperty("--gravity-tz", `0px`);
      }
    });
  }
});
