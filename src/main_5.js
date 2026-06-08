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

window.stormCharCount = 0;

window.STORM_decay = 4;

window.STORM_heavy = 30;

window.STORM_intense = 80;

window.atmosphereHue = 180;

window.atmosphereIntensity = 0;

window.createTypingParticle = function createTypingParticle(x, y) {
  if (!echoLayerEl) return;
  const particle = document.createElement("div");
  particle.className = "typing-particle";
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;

  // Randomize particle target destination slightly
  const dx = (Math.random() - 0.5) * 200;
  const dy = (Math.random() - 0.5) * 200;

  particle.style.setProperty("--px", `${dx}px`);
  particle.style.setProperty("--py", `${dy}px`);

  // Random size
  const size = Math.random() * 4 + 2;
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;

  echoLayerEl.appendChild(particle);

  setTimeout(() => {
    if (particle.parentNode) {
      particle.parentNode.removeChild(particle);
    }
  }, 800);
};

editor.onDidChangeModelContent((e) => {
  e.changes.forEach((change) => {
    stormCharCount += change.text.length;

    // Typing Particle Emitter
    if (change.text.length > 0) {
      const position = editor.getPosition();
      if (position) {
        const scrolledVisiblePosition =
          editor.getScrolledVisiblePosition(position);
        if (scrolledVisiblePosition) {
          const rect = editorEl.getBoundingClientRect();
          const x = scrolledVisiblePosition.left + rect.left;
          const y = scrolledVisiblePosition.top + rect.top + 10;

          // Create 1-3 particles per keystroke
          const particleCount = Math.floor(Math.random() * 3) + 1;
          for (let i = 0; i < particleCount; i++) {
            createTypingParticle(x, y);
          }
        }
      }
    }
  });

  // Innovate Keystroke Ripple Pulse
  if (echoLayerEl) {
    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    echoes.forEach((echo) => {
      echo.classList.remove("ripple-active");
      void echo.offsetWidth; // Force reflow
      echo.classList.add("ripple-active");
      setTimeout(() => {
        echo.classList.remove("ripple-active");
      }, 500);
    });
  }

  // Innovated Feature: Semantic Explode on Edit
  e.changes.forEach((change) => {
    if (change.text.match(/[\s\n]$/)) {
      const position = editor.getPosition();
      if (!position) return;

      const model = editor.getModel();
      const wordInfo = model.getWordUntilPosition({
        lineNumber: position.lineNumber,
        column: position.column - 1,
      });

      if (wordInfo && wordInfo.word && wordInfo.word.length > 3) {
        const lowerWord = wordInfo.word.toLowerCase();

        tabManager.files.forEach((file) => {
          if (file.id !== tabManager.activeId) {
            let content = "";
            if (file.model) {
              content = file.model.getValue().toLowerCase();
            } else if (file.isImage) {
              content = file.name.toLowerCase();
            }

            if (content.includes(lowerWord)) {
              const echoEl = document.querySelector(
                `.echo-document[data-id="${file.id}"]`,
              );
              if (echoEl) {
                echoEl.classList.remove("shatter-active");
                void echoEl.offsetWidth; // Force reflow
                echoEl.classList.add("shatter-active");

                setTimeout(() => {
                  echoEl.classList.remove("shatter-active");
                }, 600);
              }
            }
          }
        });
      }
    }
  });
});

setInterval(() => {
  if (stormCharCount > 0) {
    stormCharCount = Math.max(0, stormCharCount - STORM_decay);
  }

  // Dynamic Hue Logic (Atmospheric Breathing & Keystroke Pulse)
  // Blend Typing Hue (Blue/Purple/Magenta) with Atmosphere Hue (Red/Orange)
  // If atmosphere is active (errors), it takes precedence
  let baseHue = window.atmosphereHue;
  let breathIntensity = 10;

  if (window.atmosphereHue === 180) {
    // No errors, use typing intensity to shift hue and intensify breathing
    // Shift hue aggressively towards magenta (300) when typing fast
    baseHue = 180 + Math.min(120, stormCharCount * 1.5);
    breathIntensity = 10 + Math.min(30, stormCharCount);
  }

  const time = Date.now() / 1000;
  // Faster heartbeat when typing intensely
  const breathSpeed = 1 + Math.min(2, stormCharCount * 0.05);
  const breathing = Math.sin(time * breathSpeed) * breathIntensity;
  const finalHue = baseHue + breathing;
  document.documentElement.style.setProperty("--dynamic-hue", finalHue);

  // Total Intensity
  const totalIntensity = stormCharCount + (window.atmosphereIntensity || 0);

  // Heat Distortion logic
  if (totalIntensity > 150) {
    if (echoLayerEl) echoLayerEl.classList.add("heat-active");
    if (referenceLayer) referenceLayer.classList.add("heat-active");
  } else {
    if (echoLayerEl) echoLayerEl.classList.remove("heat-active");
    if (referenceLayer) referenceLayer.classList.remove("heat-active");
  }

  if (referenceManager) {
    referenceManager.setStormIntensity(totalIntensity);
  }

  if (raindrops && intensitySlider) {
    const baseRate = parseInt(intensitySlider.value, 10) * 2;
    const baseChance = parseInt(intensitySlider.value, 10) / 100;

    let multiplier = 1;

    if (totalIntensity > STORM_intense) {
      multiplier = 4.0;
      // 20% chance of lightning every second during intense storm
      if (Math.random() < 0.2) triggerLightning();
    } else if (totalIntensity > STORM_heavy) {
      multiplier = 2.0;
    }

    if (multiplier > 1) {
      raindrops.options.dropletsRate = baseRate * multiplier;
      raindrops.options.rainChance = Math.min(1, baseChance * multiplier);
    } else {
      // Revert to slider values
      raindrops.options.dropletsRate = baseRate;
      raindrops.options.rainChance = baseChance;
    }

    // Toggle rain streaks on notes if intense
    if (referenceManager) {
      referenceManager.toggleRainStreaks(raindrops.options.rainChance > 0.5);
    }
  }

  // Hyper-Focus Vignette
  if (vignetteLayer) {
    const opacity = Math.min(1, totalIntensity / 60);
    vignetteLayer.style.opacity = opacity;
  }
}, 1000);

window.lastShiftTime = 0;

window.sonarActive = false;

window.sonarStartTime = 0;

window.sonarX = 0;

window.sonarY = 0;

window.cachedSonarTargets = [];

document.addEventListener("keydown", (e) => {
  if (e.key === "Shift") {
    const now = Date.now();
    if (now - lastShiftTime < 300) {
      // Double Shift detected
      triggerSonar();
    }
    lastShiftTime = now;
  }

  // Ctrl+Space for Sonar Ping
  if (e.ctrlKey && e.code === "Space") {
    e.preventDefault();
    triggerSonar();
  }
});

window.btnSonar = document.getElementById("btn-sonar-ping");

if (btnSonar) {
  btnSonar.addEventListener("click", triggerSonar);
}

window.btnZScan = document.getElementById("btn-z-scan");

if (btnZScan) {
  btnZScan.addEventListener("click", triggerZScan);
}

window.btnBlackHole = document.getElementById("btn-black-hole-view");

if (btnBlackHole) {
  btnBlackHole.addEventListener("click", () => {
    tabManager.toggleBlackHoleView();
  });
}

window.triggerZScan = function triggerZScan() {
  const scannerPlane = document.getElementById("z-scanner-plane");
  if (!scannerPlane) return;

  // Reset and start animation
  scannerPlane.classList.remove("scanning");
  void scannerPlane.offsetWidth; // Force reflow
  scannerPlane.classList.add("scanning");

  const echoes = document.querySelectorAll(".echo-document");

  // Approximate depth matching based on CSS structure and vars
  echoes.forEach((echo) => {
    let z = 0;
    const tzStyle = echo.style.getPropertyValue("--tz");

    if (tzStyle && tzStyle.includes("px")) {
      const match = tzStyle.match(/(-?\d+)/);
      if (match && !tzStyle.includes("calc")) {
        z = parseInt(match[0], 10);
      } else {
        const idx = parseInt(echo.dataset.index || 0);
        z = -(idx * 50) + (window.stackZ || 0); // approximation
      }
    }

    // Scan starts at Z=+200, ends at Z=-2000 over 4000ms. Total distance 2200px.
    // It travels at 2200px / 3800ms ≈ 0.57 px/ms.
    // Time to reach Z = (200 - Z) / 0.57
    const totalZDistance = 2200;
    const distFromStart = 200 - z;
    let delayMs = (distFromStart / totalZDistance) * 3800;

    // Clamp to positive, valid timeout bounds
    if (delayMs < 0) delayMs = 100;
    if (delayMs > 4000) delayMs = 4000;

    setTimeout(() => {
      echo.classList.add("z-scan-hit");

      // Highlight text slightly more by playing with tint
      const currentTint = echo.style.getPropertyValue("--echo-tint") || "0deg";
      echo.style.setProperty("--scan-temp-color", "rgba(255, 0, 128, 1)");

      setTimeout(() => {
        echo.classList.remove("z-scan-hit");
      }, 800);
    }, delayMs);
  });

  // Clean up scanner class
  setTimeout(() => {
    scannerPlane.classList.remove("scanning");
  }, 4500);
};

window.triggerSonar = function triggerSonar() {
  sonarActive = true;
  sonarStartTime = Date.now();

  // Get mouse position
  // Use the last known mouse position from global listener if possible,
  // but here we might need to rely on the CSS variables set by mousemove
  const mx =
    parseFloat(document.body.style.getPropertyValue("--mouse-x")) ||
    window.innerWidth / 2;
  const my =
    parseFloat(document.body.style.getPropertyValue("--mouse-y")) ||
    window.innerHeight / 2;

  sonarX = mx;
  sonarY = my;

  editorEl.style.setProperty("--sonar-x", `${sonarX}px`);
  editorEl.style.setProperty("--sonar-y", `${sonarY}px`);

  editorEl.classList.add("sonar-active");

  cachedSonarTargets = [];
  document.querySelectorAll(".note-card").forEach((card) => {
    const rect = card.getBoundingClientRect();
    cachedSonarTargets.push({
      el: card,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    });
  });
  if (echoLayerEl) {
    echoLayerEl.querySelectorAll(".echo-document").forEach((echo) => {
      const rect = echo.getBoundingClientRect();
      cachedSonarTargets.push({
        el: echo,
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
      });
    });
  }

  requestAnimationFrame(animateSonar);
};

window.animateSonar = function animateSonar() {
  if (!sonarActive) return;

  const now = Date.now();
  const elapsed = now - sonarStartTime;
  const duration = 1500;

  if (elapsed > duration) {
    sonarActive = false;
    editorEl.classList.remove("sonar-active");
    // Clear sonar-hit classes
    document
      .querySelectorAll(".sonar-hit")
      .forEach((el) => el.classList.remove("sonar-hit"));
    return;
  }

  // Easing out
  const progress = elapsed / duration;
  const radius =
    Math.max(window.innerWidth, window.innerHeight) *
    1.5 *
    (1 - Math.pow(1 - progress, 3)); // cubic ease out

  editorEl.style.setProperty("--sonar-radius", `${radius}px`);

  // Semantic Sonar: highlight elements as the ring passes over them
  const thickness = 150; // Match the mask thickness

  cachedSonarTargets.forEach((target) => {
    const dist = Math.sqrt(
      Math.pow(target.cx - sonarX, 2) + Math.pow(target.cy - sonarY, 2),
    );
    if (Math.abs(dist - radius) < thickness) {
      target.el.classList.add("sonar-hit");
    } else {
      target.el.classList.remove("sonar-hit");
    }
  });

  // Force update if portals exist (JS mask management active)
  if (portalLines.length > 0) {
    updatePortals();
  }

  requestAnimationFrame(animateSonar);
};

window.portalLines = [];

window.scanPortals = function scanPortals() {
  const model = editor.getModel();
  if (!model) return;
  portalLines = [];
  const lines = model.getLinesContent();
  lines.forEach((line, index) => {
    if (line.includes("// @portal")) {
      portalLines.push(index + 1);
    }
  });
  updatePortals();
};

window.updatePortals = function updatePortals() {
  if (!editorEl) return;

  // 1. Collect Portals
  const portals = [];
  portalLines.forEach((lineNumber) => {
    const pos = editor.getScrolledVisiblePosition({ lineNumber, column: 1 });
    if (pos) {
      // Offset to align with the comment roughly
      portals.push({ x: pos.left + 60, y: pos.top + 10 });
    }
  });

  // Update Portal Visuals
  if (portalLayer) {
    portalLayer.innerHTML = "";
    portals.forEach((p) => {
      const ring = document.createElement("div");
      ring.className = "portal-ring";
      ring.style.position = "absolute";
      ring.style.left = p.x - 50 + "px";
      ring.style.top = p.y - 50 + "px";
      ring.style.width = "100px";
      ring.style.height = "100px";
      portalLayer.appendChild(ring);
    });
  }

  // If no portals, we must clear inline styles so CSS classes work (unless we want to enforce JS masking always)
  if (portals.length === 0) {
    editorEl.style.maskImage = "";
    editorEl.style.webkitMaskImage = "";
    editorEl.style.maskComposite = "";
    editorEl.style.webkitMaskComposite = "";
    return;
  }

  const maskLayers = [];

  // Add Portal Holes
  const portalGradients = portals
    .map(
      (p) =>
        `radial-gradient(circle at ${p.x}px ${p.y}px, transparent 0px, transparent 100px, black 150px)`,
    )
    .join(", ");
  if (portalGradients) maskLayers.push(portalGradients);

  // 2. Add Interactive Mode Holes (X-Ray / Lens / Sonar)
  // We must manually add these because inline styles override CSS classes
  const isXRay = editorEl.classList.contains("x-ray-active");
  const isLens = editorEl.classList.contains("lens-active");
  const isSonar = editorEl.classList.contains("sonar-active");

  const mx = document.body.style.getPropertyValue("--mouse-x") || "50%";
  const my = document.body.style.getPropertyValue("--mouse-y") || "50%";

  if (isLens) {
    maskLayers.push(
      `radial-gradient(circle at ${mx} ${my}, transparent 160px, black 320px)`,
    );
  } else if (isXRay) {
    maskLayers.push(
      `radial-gradient(circle at ${mx} ${my}, transparent 100px, black 250px)`,
    );
  }

  if (isSonar) {
    const sx = editorEl.style.getPropertyValue("--sonar-x") || "50%";
    const sy = editorEl.style.getPropertyValue("--sonar-y") || "50%";
    const sr = editorEl.style.getPropertyValue("--sonar-radius") || "0px";
    // Sonar ring mask (transparent hole moving outwards)
    maskLayers.push(
      `radial-gradient(circle at ${sx} ${sy}, black calc(${sr} - 150px), transparent ${sr}, black calc(${sr} + 150px))`,
    );
  }

  if (maskLayers.length === 0) {
    editorEl.style.maskImage = "";
    editorEl.style.webkitMaskImage = "";
    editorEl.style.maskComposite = "";
    editorEl.style.webkitMaskComposite = "";
    return;
  }

  const finalMask = maskLayers.join(", ");

  editorEl.style.maskImage = finalMask;
  editorEl.style.webkitMaskImage = finalMask;

  // Use intersect to combine holes
  editorEl.style.maskComposite = "intersect";
  editorEl.style.webkitMaskComposite = "source-in";
};

editor.onDidChangeModelContent(scanPortals);

editor.onDidScrollChange(updatePortals);

window.addEventListener("resize", updatePortals);

document.addEventListener("keydown", (e) => {
  // slight delay to allow classList update
  requestAnimationFrame(updatePortals);
});

document.addEventListener("keyup", (e) => {
  requestAnimationFrame(updatePortals);
});

document.addEventListener("mousemove", () => {
  // Only need to update if we have portals (inline style active)
  if (portalLines.length > 0) {
    const isXRay = editorEl.classList.contains("x-ray-active");
    const isLens = editorEl.classList.contains("lens-active");
    const isSonar = editorEl.classList.contains("sonar-active");
    if (isXRay || isLens || isSonar) {
      updatePortals();
    }
  }
});

scanPortals();

document.addEventListener("keydown", (e) => {
  if (e.altKey && e.shiftKey && e.code === "KeyS" && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    document.body.classList.toggle("holographic-slice-active");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.altKey && e.shiftKey && e.code === "KeyX" && !e.ctrlKey && !e.metaKey) {
    document.body.classList.add("x-ray-active");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.altKey && e.shiftKey && e.key === "Backspace") {
    e.preventDefault();
    document.body.classList.toggle("singularity-active");
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "x" || e.key === "Shift" || e.key === "Alt") {
    document.body.classList.remove("x-ray-active");
  }
});

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
    e.preventDefault();
    _triggerVpsSave();
  }
});

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "O") {
    e.preventDefault();
    tabManager.toggleOutlineView();
    const sel = document.getElementById("view-mode-select");
    if (sel) {
      sel.value = document.body.classList.contains("outline-active")
        ? "outline"
        : "";
    }
  }
});
