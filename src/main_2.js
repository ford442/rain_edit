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

document.addEventListener("mousemove", (e) => {
  if (isAutofocusActive) {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const echoDoc = target?.closest(".echo-document");
    if (echoDoc) {
      const depth = parseInt(echoDoc.dataset.depth || "0", 10);
      if (depth === 0) autofocusTargetZ = -400;
      else if (depth === 1) autofocusTargetZ = 0;
      else if (depth === 2) autofocusTargetZ = 400;
    } else {
      autofocusTargetZ = 0; // Default to active plane if hovering nothing
    }
  }

  if (
    isTesseractDragging &&
    document.body.classList.contains("tesseract-active")
  ) {
    const deltaX = e.clientX - tesseractLastX;
    const deltaY = e.clientY - tesseractLastY;

    tesseractRotY += deltaX * 0.5;
    tesseractRotX -= deltaY * 0.5;

    document.documentElement.style.setProperty(
      "--tesseract-rot-x",
      `${tesseractRotX}deg`,
    );
    document.documentElement.style.setProperty(
      "--tesseract-rot-y",
      `${tesseractRotY}deg`,
    );

    tesseractLastX = e.clientX;
    tesseractLastY = e.clientY;
  }

  // Gravitational Cursor Tracking for UI Elements (Dock & Tabs)
  const mx = e.clientX;
  const my = e.clientY;

  // Track cursor position globally for CSS effects
  document.body.style.setProperty("--mouse-x", `${mx}px`);
  document.body.style.setProperty("--mouse-y", `${my}px`);

  // Normalized mouse coordinates from -1 to 1 for advanced 3D tilting
  const nx = (mx / window.innerWidth) * 2 - 1;
  const ny = (my / window.innerHeight) * 2 - 1;
  document.body.style.setProperty("--mouse-nx", nx);
  document.body.style.setProperty("--mouse-ny", ny);

  // "Parallax Edge Fanning" & "Dynamic Parallax Fan"
  // Fanning documents outward based on mouse distance from center
  const edgeFanMagnitude = 80; // Increased magnitude for a more pronounced fan
  // We apply a continuous dynamic fan instead of just at the edges (nx > 0.6)
  const edgeFanX = nx * edgeFanMagnitude;
  const edgeFanY = ny * edgeFanMagnitude;

  // Calculate dynamic rotation fan based on mouse X for a card-like spread
  const fanRot = nx * 15; // up to 15 degrees rotation

  document.body.style.setProperty("--mouse-edge-x", nx);
  document.body.style.setProperty("--mouse-edge-y", ny);


  if (echoLayerEl) {
    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    echoes.forEach((echo, index) => {
      // Multiply effect by depth index to increase fanning on deeper elements
      const depthMultiplier = (index + 1) * 0.5;
      echo.style.setProperty(
        "--edge-fan-tx",
        `${edgeFanX * depthMultiplier}px`,
      );
      echo.style.setProperty(
        "--edge-fan-ty",
        `${edgeFanY * depthMultiplier}px`,
      );
      // Dynamic rotation based on depth and mouse position
      const dir = (index % 2 === 0 ? 1 : -1);
      echo.style.setProperty(
        "--edge-fan-rot",
        `${fanRot * depthMultiplier * dir}deg`,
      );
    });
  }

  // Apply localized 3D tilt to UI elements based on normalized cursor position
  const uiDockEl = document.getElementById("dock");
  const uiTabsEl = document.getElementById("tabs-container");
  if (uiDockEl) {
    uiDockEl.style.transform = `perspective(1000px) rotateX(${ny * -10}deg) rotateY(${nx * 10}deg) translateZ(10px)`;
  }
  if (uiTabsEl) {
    uiTabsEl.style.transform = `perspective(1000px) rotateX(${ny * -10}deg) rotateY(${nx * 10}deg) translateZ(10px)`;
  }

  // Update targets for Depth Spotlight and Hologram Preview
  if (
    document.body.classList.contains("depth-spotlight-active") ||
    document.body.classList.contains("hologram-preview-active")
  ) {
    const echoes = Array.from(document.querySelectorAll(".echo-document"));
    let closestEcho = null;
    let minDistance = Infinity;

    echoes.forEach((echo) => {
      const rect = echo.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(cx - mx, cy - my);

      // Clean up previous classes
      echo.classList.remove("spotlight-target");
      echo.classList.remove("hologram-target");

      if (dist < minDistance) {
        minDistance = dist;
        closestEcho = echo;
      }
    });

    if (closestEcho) {
      if (document.body.classList.contains("depth-spotlight-active")) {
        closestEcho.classList.add("spotlight-target");
      }
      if (document.body.classList.contains("hologram-preview-active")) {
        closestEcho.classList.add("hologram-target");
      }
    }
  }

  // 3D Magnifying Glass Effect (Shift Key)
  if (e.shiftKey && tabManager && tabManager.files) {
    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    echoes.forEach((echo) => {
      const rect = echo.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.sqrt(Math.pow(mx - cx, 2) + Math.pow(my - cy, 2));

      if (dist < 300) {
        // Apply magnetic pull and lens effect
        const pullFactor = 1 - dist / 300;
        echo.style.setProperty("--lens-pull", pullFactor);
        echo.classList.add("shift-lens-hit");
      } else {
        echo.style.setProperty("--lens-pull", 0);
        echo.classList.remove("shift-lens-hit");
      }
    });
    window.__lensActive = true;
  } else if (echoLayerEl && window.__lensActive) {
    // Clear lens effect if shift is released or mouse moves away
    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    echoes.forEach((echo) => {
      echo.style.setProperty("--lens-pull", 0);
      echo.classList.remove("shift-lens-hit");
    });
    window.__lensActive = false;
  }

  // --- NEW: Calculate local coordinates for echo-documents (for magnetic-edge and holographic glares) ---
  if (echoLayerEl) {
    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    echoes.forEach((echo) => {
      const rect = echo.getBoundingClientRect();
      // Only calculate if document is reasonably visible or nearby to save performance
      const localX = mx - rect.left;
      const localY = my - rect.top;

      echo.style.setProperty("--mouse-local-x", `${localX}px`);
      echo.style.setProperty("--mouse-local-y", `${localY}px`);

      // Calculate normalized local coords for 3D tilt
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const hoverRotY = ((localX - centerX) / centerX) * 5; // max 5deg tilt
      const hoverRotX = -((localY - centerY) / centerY) * 5;

      echo.style.setProperty("--hover-rot-x", `${hoverRotX}deg`);
      echo.style.setProperty("--hover-rot-y", `${hoverRotY}deg`);
    });
  }
  // --- END NEW ---

  // Define UI elements that exert "gravity"
  const dockEl = document.getElementById("dock");
  const tabsEl = document.getElementById("tabs-container");

  const applyGravity = (element, maxDist, strength) => {
    if (!element) return;

    // Cache original rect to avoid layout thrashing and feedback loops
    if (!element._origRect) {
      // Temporarily remove transform to get true original position
      const currentTransform = element.style.transform;
      element.style.transform = "none";
      element._origRect = element.getBoundingClientRect();
      element.style.transform = currentTransform;
    }

    const cx = element._origRect.left + element._origRect.width / 2;
    const cy = element._origRect.top + element._origRect.height / 2;
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < maxDist) {
      // Linear pull based on proximity
      const pullX = (dx / dist) * (maxDist - dist) * strength;
      const pullY = (dy / dist) * (maxDist - dist) * strength;
      element.style.transform = `translate(${pullX}px, ${pullY}px)`;
      // Optionally add a dynamic glow when pulled
      element.style.boxShadow = `0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 ${maxDist - dist}px rgba(0, 229, 255, 0.3)`;
    } else {
      element.style.transform = `translate(0px, 0px)`;
      element.style.boxShadow = ""; // Reset to class defaults
    }
  };

  applyGravity(dockEl, 300, 0.05); // 300px radius, weak pull
  applyGravity(tabsEl, 200, 0.03); // 200px radius, weaker pull

  // 3D Parallax on Active Editor
  const activeEditorEl = document.getElementById("editor");

  // Exclude parallax effect when any active view modes that use transforms are enabled.
  const activeViewsClasses = Array.from(document.body.classList).filter((c) =>
    c.endsWith("-active"),
  );

  if (activeEditorEl && activeViewsClasses.length === 0) {
    const xOffset = (e.clientX / window.innerWidth - 0.5) * 20; // max +/- 10px shift
    const yOffset = (e.clientY / window.innerHeight - 0.5) * 20;
    const rotateX = (e.clientY / window.innerHeight - 0.5) * -5; // max +/- 2.5 deg tilt
    const rotateY = (e.clientX / window.innerWidth - 0.5) * 5;

    // We use CSS variables to play nicely with default position/transforms.
    activeEditorEl.style.setProperty("--px", `${xOffset}px`);
    activeEditorEl.style.setProperty("--py", `${yOffset}px`);
    activeEditorEl.style.setProperty("--rx", `${rotateX}deg`);
    activeEditorEl.style.setProperty("--ry", `${rotateY}deg`);

    // Parallax the dock slightly as well
    const dockEl = document.getElementById("dock");
    if (dockEl) {
      dockEl.style.setProperty("--rx", `${rotateX * 0.5}deg`);
      dockEl.style.setProperty("--ry", `${rotateY * 0.5}deg`);
    }
  } else if (activeEditorEl) {
    // Reset variables if a view mode is active
    activeEditorEl.style.removeProperty("--px");
    activeEditorEl.style.removeProperty("--py");
    activeEditorEl.style.removeProperty("--rx");
    activeEditorEl.style.removeProperty("--ry");

    const dockEl = document.getElementById("dock");
    if (dockEl) {
      dockEl.style.removeProperty("--rx");
      dockEl.style.removeProperty("--ry");
    }
  }

  // Gravitational Wormhole (Ctrl + Alt)
  if (isWormholeActive && echoLayerEl) {
    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    echoes.forEach((echo) => {
      const rect = echo.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const maxDist = 300;
      if (dist < maxDist) {
        const pull = 1 - dist / maxDist; // 0 to 1
        const pullFactor = Math.pow(pull, 2); // stronger near center

        echo.style.setProperty("--wormhole-tx", `${dx * pullFactor * 0.8}px`);
        echo.style.setProperty("--wormhole-ty", `${dy * pullFactor * 0.8}px`);
        echo.style.setProperty("--wormhole-tz", `${pullFactor * 150}px`); // pull forward
        echo.style.setProperty("--wormhole-scale", `${1 + pullFactor * 0.2}`);
      } else {
        echo.style.setProperty("--wormhole-tx", "0px");
        echo.style.setProperty("--wormhole-ty", "0px");
        echo.style.setProperty("--wormhole-tz", "0px");
        echo.style.setProperty("--wormhole-scale", "1");
      }
    });
  }

  if (
    typeof isPeelActive !== "undefined" &&
    isPeelActive &&
    echoLayerEl &&
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
    !tabManager.isSphereView
  ) {
    // Calculate peel factor based on mouse Y
    const pctY = e.clientY / window.innerHeight; // 0 to 1
    const echoes = echoLayerEl.querySelectorAll(".echo-document");

    echoes.forEach((echo, index) => {
      if (echo.classList.contains("peek")) return;

      // Fan them out vertically and push back slightly less
      const targetY = (pctY - 0.5) * 800 * (index + 1); // Spread
      const baseTz = -(index + 1) * 50;
      const targetZ = baseTz + pctY * 150; // Pull forward as you fan
      const targetRotX = (pctY - 0.5) * 40; // Tilt

      echo.style.setProperty("--peel-ty", `${targetY}px`);
      echo.style.setProperty("--peel-tz", `${targetZ}px`);
      echo.style.setProperty("--peel-rot-x", `${targetRotX}deg`);
    });
  }

  const rect = editorEl.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;

  // 3D Free-Cam Logic
  if (isAltDragActive && echoLayerEl) {
    const deltaX = e.clientX - altDragStartX;
    const deltaY = e.clientY - altDragStartY;

    // Sensitivity of rotation
    sceneRotY = currentSceneRotY + deltaX * 0.5;
    sceneRotX = currentSceneRotX - deltaY * 0.5;

    echoLayerEl.style.transform = `rotateX(${sceneRotX}deg) rotateY(${sceneRotY}deg)`;
    // Continue to next handlers but maybe skip some parallax to avoid conflict
  }

  // Flashlight Effect: clear a large area of fog
  if (isFlashlightActive && fogManager) {
    fogManager.clearFogAt(e.clientX, e.clientY, 250);
  }
  if (bgLayer) bgLayer.setParallax(x * 0.4, y * 0.4);
  if (fgLayer) fgLayer.setParallax(x, y);

  // Update fog mask position for "wiping" effect
  if (fogManager) {
    fogManager.clearFogAt(e.clientX, e.clientY, 60);
  }

  // Update CSS variables for X-Ray and Lantern
  document.body.style.setProperty("--mouse-x", `${e.clientX}px`);
  document.body.style.setProperty("--mouse-y", `${e.clientY}px`);

  // Update Neon Scatter Layer position
  if (neonScatterLayer) {
    neonScatterLayer.style.setProperty("--mouse-x", `${e.clientX}px`);
    neonScatterLayer.style.setProperty("--mouse-y", `${e.clientY}px`);
  }

  // Parallax for Echo Layers (Ghost Documents)
  if (echoLayerEl && !tabManager.isCascadeView) {
    const echoes = echoLayerEl.querySelectorAll(".echo-document");

    if (tabManager.isOrbitView) {
      // Rotate entire echo layer based on horizontal mouse position
      const orbitRot = -x * 360;
      echoLayerEl.style.setProperty("--orbit-global-rot", `${orbitRot}deg`);
    }

    if (tabManager.isSolarSystemView) {
      // Tilt entire solar system based on mouse position
      const solarRotX = y * 30 + 60; // Base tilt 60deg + 30deg from mouse
      const solarRotY = x * 20;
      echoLayerEl.style.setProperty("--solar-global-rot-x", `${solarRotX}deg`);
      echoLayerEl.style.setProperty("--solar-global-rot-y", `${solarRotY}deg`);
    }

    if (tabManager.isHelixView) {
      // Rotate entire echo layer based on horizontal mouse position
      const helixRot = -x * 360;
      echoLayerEl.style.setProperty("--helix-global-rot", `${helixRot}deg`);
    }

    echoes.forEach((echo, index) => {
      // Don't apply parallax if peeking (handled by CSS)
      if (echo.classList.contains("peek")) return;

      const depthOffset = (index + 1) * 2;
      const moveX = -x * 20 * depthOffset;
      const moveY = -y * 20 * depthOffset;

      echo.style.setProperty("--tx", `${depthOffset * 2 + moveX}px`);
      echo.style.setProperty("--ty", `${depthOffset * 2 + moveY}px`);

      // Holographic Tilt
      const rotX = y * 5 * depthOffset;
      const rotY = -x * 5 * depthOffset;
      echo.style.setProperty("--rot-x", `${rotX}deg`);
      echo.style.setProperty("--rot-y", `${rotY}deg`);
    });

    // Magnifying Glass / Focus Lens Logic
    if (isMagnifierMode) {
      echoes.forEach((echo) => {
        const echoRect = echo.getBoundingClientRect();
        // Fallback for centering if properties aren't set
        const centerX = echoRect.left + echoRect.width / 2;
        const centerY = echoRect.top + echoRect.height / 2;
        const dist = Math.sqrt(
          Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2),
        );

        if (dist < 300) {
          // Add the improved 'loupe-active' feature instead of the old 'magnifier-active'
          echo.classList.add("loupe-active");
          echo.classList.remove("magnifier-active");

          // Because 'loupe-active' centers the element perfectly on the screen (-50%, -50% transform on left: 50%, top: 50%),
          // we must calculate mouse coordinates relative to the center of the viewport for the mask-image
          const x = e.clientX - window.innerWidth / 2 + echo.offsetWidth / 2;
          const y = e.clientY - window.innerHeight / 2 + echo.offsetHeight / 2;
          echo.style.setProperty("--mouse-x", `${x}px`);
          echo.style.setProperty("--mouse-y", `${y}px`);
        } else {
          echo.classList.remove("loupe-active");
          echo.classList.remove("magnifier-active");
        }
      });
    }
    // Proximity Wake Logic
    echoes.forEach((echo) => {
      // Skip if peeking or magnifier is active, let CSS handle it completely
      if (
        echo.classList.contains("peek") ||
        echo.classList.contains("magnifier-active") ||
        echo.classList.contains("is-peeking")
      ) {
        echo.style.removeProperty("--wake-dist");
        return;
      }

      const rect = echo.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dist = Math.sqrt(
        Math.pow(e.clientX - cx, 2) + Math.pow(e.clientY - cy, 2),
      );

      // Calculate a value from 0 (far) to 1 (cursor is dead center) based on a radius
      const maxDist = 400; // How far the proximity wake reaches
      let wakeFactor = 0;
      if (dist < maxDist) {
        wakeFactor = 1 - dist / maxDist;
        // Ease the wake factor so it's smooth
        wakeFactor = Math.pow(wakeFactor, 1.5);
      }

      echo.style.setProperty("--wake-factor", wakeFactor.toFixed(3));

      // Local mouse coords for Holographic Foil logic
      if (dist < maxDist) {
        const pctX = ((e.clientX - rect.left) / rect.width) * 100;
        const pctY = ((e.clientY - rect.top) / rect.height) * 100;
        echo.style.setProperty("--foil-x", `${pctX}%`);
        echo.style.setProperty("--foil-y", `${pctY}%`);
      }

      // Echo Wave Distortion
      if (dist < 150 && !echo.classList.contains("echo-wave-distortion")) {
        echo.classList.add("echo-wave-distortion");
        setTimeout(() => {
          echo.classList.remove("echo-wave-distortion");
        }, 500);
      }

      // Fluid Repulsion
      if (dist < maxDist) {
        const repelFactor = Math.pow(1 - dist / maxDist, 2);
        const dx = cx - e.clientX;
        const dy = cy - e.clientY;
        const normalizedDx = dx / (dist || 1);
        const normalizedDy = dy / (dist || 1);
        const maxRepel = 80; // pixels to repel
        echo.style.setProperty(
          "--repel-tx",
          `${normalizedDx * maxRepel * repelFactor}px`,
        );
        echo.style.setProperty(
          "--repel-ty",
          `${normalizedDy * maxRepel * repelFactor}px`,
        );
      } else {
        echo.style.setProperty("--repel-tx", `0px`);
        echo.style.setProperty("--repel-ty", `0px`);
      }

      // Neon Tracing logic
      if (wakeFactor > 0.5) {
        echo.classList.add("neon-tracing");
      } else {
        echo.classList.remove("neon-tracing");
      }
    });
  }
});

document.addEventListener("mousedown", (e) => {
  if (raindrops) {
    raindrops.splash(e.clientX, e.clientY, 5);
  }
});

document.addEventListener("dblclick", (e) => {
  if (echoLayerEl) {
    const echoes = echoLayerEl.querySelectorAll(".echo-document");

    echoes.forEach((echo) => {
      // Wave propagates backwards through depth layers consecutively
      const index = parseInt(echo.dataset.index || 0, 10);
      const delay = index * 150; // 150ms delay per depth layer

      setTimeout(() => {
        echo.classList.remove("z-depth-wave-hit");
        void echo.offsetWidth; // Force reflow
        echo.classList.add("z-depth-wave-hit");

        setTimeout(() => {
          echo.classList.remove("z-depth-wave-hit");
        }, 600); // Duration of the z-depth-wave animation
      }, delay);
    });
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Control" || e.key === "Meta") {
    editorEl.classList.add("x-ray-active");
    document.body.classList.add("x-ray-active");
  }

  // Semantic X-Ray toggle (Alt + Shift) -> CHANGED TO HOLOGRAPHIC SIPHON MODE
  if (e.altKey && e.shiftKey) {
    document.body.classList.add("siphon-mode-active");
    document.body.classList.remove("semantic-xray-active"); // Ensure old behavior is overridden or merged
  }
});

editorEl.addEventListener("dragover", (e) => {
  if (document.body.classList.contains("siphon-mode-active")) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }
});

editorEl.addEventListener("drop", (e) => {
  if (!document.body.classList.contains("siphon-mode-active")) return;

  e.preventDefault();
  const selectedText = e.dataTransfer.getData("text/plain");
  if (!selectedText || !selectedText.trim()) return;

  if (window.editor) {
    // Find the target position from the drop coordinates
    const targetPosition = window.editor.getTargetAtClientPoint(
      e.clientX,
      e.clientY,
    );

    let position = window.editor.getPosition();
    if (targetPosition && targetPosition.position) {
      position = targetPosition.position;
    }

    // Fire Siphon Packet Animation from cursor to drop location
    fireSiphonPacket(selectedText, e.clientX, e.clientY - 100);

    if (position) {
      window.editor.executeEdits("siphon-drop", [
        {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column,
          ),
          text: selectedText,
          forceMoveMarkers: true,
        },
      ]);

      // Visual feedback on the editor
      document.body.classList.add("shockwave-hit");
      setTimeout(() => document.body.classList.remove("shockwave-hit"), 400);
    }
  }
});
