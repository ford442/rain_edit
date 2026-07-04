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

document.addEventListener("mouseup", (e) => {
  if (!document.body.classList.contains("siphon-mode-active")) return;

  // Check if we selected text inside an echo document
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  const selectedText = selection.toString();
  if (!selectedText.trim()) return;

  // Check if target is inside an echo document
  let target = e.target;
  let inEchoDoc = false;
  while (target && target !== document.body) {
    if (target.classList && target.classList.contains("echo-document")) {
      inEchoDoc = true;
      break;
    }
    target = target.parentElement;
  }

  if (inEchoDoc && window.editor) {
    // Clear selection to prepare for next siphon
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    selection.removeAllRanges();

    // Fire Siphon Packet Animation
    fireSiphonPacket(selectedText, rect.left, rect.top);

    // Inject into editor
    const position = window.editor.getPosition();
    if (position) {
      window.editor.executeEdits("siphon", [
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

window.fireSiphonPacket = function fireSiphonPacket(text, startX, startY) {
  const packet = document.createElement("div");
  packet.className = "siphon-packet";

  // Truncate long text for visual
  const displayStr = text.length > 20 ? text.substring(0, 20) + "..." : text;
  packet.textContent = displayStr;

  packet.style.left = startX + "px";
  packet.style.top = startY + "px";

  // Calculate destination (center of screen, approximating editor cursor if not known exactly in DOM coords)
  // A better approach would be mapping editor coords, but center screen works as a general "suck into editor" effect
  const destX = window.innerWidth / 2;
  const destY = window.innerHeight / 2;

  const dx = destX - startX;
  const dy = destY - startY;

  packet.style.setProperty("--dx", dx + "px");
  packet.style.setProperty("--dy", dy + "px");

  document.body.appendChild(packet);

  // Clean up
  setTimeout(() => {
    if (packet.parentNode) {
      packet.parentNode.removeChild(packet);
    }
  }, 600);
};

document.addEventListener("keyup", (e) => {
  if (e.key === "Control" || e.key === "Meta") {
    editorEl.classList.remove("x-ray-active");
    document.body.classList.remove("x-ray-active");
  }

  // Semantic X-Ray toggle removal
  if (!e.altKey || !e.shiftKey) {
    document.body.classList.remove("semantic-xray-active");
    document.body.classList.remove("siphon-mode-active");
  }
});

document.getElementById("toggle-back").addEventListener("change", (e) => {
  if (bgLayer) bgLayer.setVisible(e.target.checked);
});

document.getElementById("toggle-front").addEventListener("change", (e) => {
  if (fgLayer) fgLayer.setVisible(e.target.checked);
});

document
  .getElementById("toggle-front-on-top")
  .addEventListener("change", (e) => {
    frontCanvas.style.zIndex = e.target.checked ? 10 : 0;
  });

window.btnDepthForward = document.getElementById("btn-depth-forward");

window.btnDepthBack = document.getElementById("btn-depth-back");

if (btnDepthForward) {
  btnDepthForward.addEventListener("click", () => {
    tabManager.cycleDepth(1);
  });
}

if (btnDepthBack) {
  btnDepthBack.addEventListener("click", () => {
    tabManager.cycleDepth(-1);
  });
}

document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;

  if (e.key === "ArrowUp") {
    e.preventDefault();
    tabManager.cycleDepth(1);
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    tabManager.cycleDepth(-1);
  }
});

window.addEventListener(
  "wheel",
  (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      // Only cycle once per wheel event based on direction
      if (e.deltaY > 0) {
        tabManager.cycleActiveTab(-1);
      } else if (e.deltaY < 0) {
        tabManager.cycleActiveTab(1);
      }
    }
  },
  { passive: false },
);

window.viewModeSelect = document.getElementById("view-mode-select");

if (viewModeSelect) {
  viewModeSelect.addEventListener("change", (e) => {
    const view = e.target.value;
    if (view === "waterfall") tabManager.toggleWaterfallView();
    else if (view === "cascade") tabManager.toggleCascadeView();
    else if (view === "orbit") tabManager.toggleOrbitView();
    else if (view === "scattered") tabManager.toggleScatteredView();
    else if (view === "isometric") tabManager.toggleIsometricView();
    else if (view === "stack") tabManager.toggleStackView();
    else if (view === "timeline") tabManager.toggleTimelineView();
    else if (view === "tunnel") tabManager.toggleTunnelView();
    else if (view === "grid") tabManager.toggleGridView();
    else if (view === "helix") tabManager.toggleHelixView();
    else if (view === "time-tunnel") tabManager.toggleTimeTunnelView();
    else if (view === "pinboard") tabManager.togglePinboardView();
    else if (view === "carousel") tabManager.toggleCarouselView();
    else if (view === "accordion") tabManager.toggleAccordionView();
    // UI binding for Infinity Mirror view mode (added in previous iteration)
    else if (view === "infinity-mirror") tabManager.toggleInfinityMirrorView();
    else if (view === "archway") tabManager.toggleArchwayView();
    else if (view === "kaleidoscope") tabManager.toggleKaleidoscopeView();
    else if (view === "torus") tabManager.toggleTorusView();
    else if (view === "vortex") tabManager.toggleVortexView();
    else if (view === "constellation") tabManager.toggleConstellationView();
    else if (view === "prism") tabManager.togglePrismView();
    else if (view === "prism-split") tabManager.togglePrismSplitView();
    else if (view === "coverflow") tabManager.toggleCoverflowView();
    else if (view === "ribbon") tabManager.toggleRibbonView();
    else if (view === "sphere") tabManager.toggleSphereView();
    else if (view === "wave") tabManager.toggleWaveView();
    else if (view === "black-hole") tabManager.toggleBlackHoleView();
    else if (view === "rolodex") tabManager.toggleRolodexView();
    else if (view === "cylinder") tabManager.toggleCylinderView();
    else if (view === "galaxy") tabManager.toggleGalaxyView();
    else if (view === "origami") tabManager.toggleOrigamiView();
    else if (view === "matrix-rain") tabManager.toggleMatrixRainView();
    else if (view === "data-hive") tabManager.toggleDataHiveView();
    else if (view === "card-spread") tabManager.toggleCardSpreadView();
    else if (view === "staircase") tabManager.toggleStaircaseView();
    else if (view === "pyramid") tabManager.togglePyramidView();
    else if (view === "crystal") tabManager.toggleCrystalView();
    else if (view === "fractal") tabManager.toggleFractalView();
    else if (view === "solar-system") tabManager.toggleSolarSystemView();
    else if (view === "neon-synth") tabManager.toggleNeonSynthView();
    else if (view === "blueprint-3d") tabManager.toggleBlueprint3dView();
    else if (view === "cyber-cortex") tabManager.toggleCyberCortexView();
    else if (view === "quantum") tabManager.toggleQuantumSuperpositionView();
    else if (view === "outline") tabManager.toggleOutlineView();
    else if (view === "bookshelf") tabManager.toggleBookshelfView();
    else if (view === "tesseract") tabManager.toggleTesseractView();
    else if (view === "cyclone") tabManager.toggleCycloneView();
    else if (view === "mobius") tabManager.toggleMobiusView();
    else if (view === "astrolabe") tabManager.toggleAstrolabeView();
    else if (view === "dominoes") tabManager.toggleDominoesView();
    else if (view === "hexagon-matrix") tabManager.toggleHexagonMatrixView();
    else if (view === "luminescence") tabManager.toggleLuminescenceView();
    else if (view === "geode") tabManager.toggleGeodeView();
    else if (view === "lotus") tabManager.toggleLotusView();
    else if (view === "hypercube") tabManager.toggleHypercubeView();
    else if (view === "theater") tabManager.toggleTheaterView();
    else if (view === "tornado") tabManager.toggleTornadoView();
    else if (view === "venetian") tabManager.toggleVenetianView();
    else if (view === "stackdeck") tabManager.toggleStackDeckView();
    else if (view === "aurora") tabManager.toggleAuroraView();
    else tabManager._deactivateAllViews(); // Default view
  });
}

window.theaterToggle = document.getElementById("theater-mode");

if (theaterToggle) {
  theaterToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.body.classList.add("theater-active");
    } else {
      document.body.classList.remove("theater-active");
    }
  });
}

window.portalToggle = document.getElementById("portal-mode-toggle");
if (portalToggle) {
  portalToggle.addEventListener("change", (e) => {
    window.isPortalModeActive = e.target.checked;
    if (window.isPortalModeActive) {
      document.body.classList.add("portal-mode-active");
    } else {
      document.body.classList.remove("portal-mode-active");
    }
  });
}

window.autofocusToggle = document.getElementById("cinematic-autofocus-mode");

window.isAutofocusActive = false;

if (autofocusToggle) {
  autofocusToggle.addEventListener("change", (e) => {
    isAutofocusActive = e.target.checked;
    if (isAutofocusActive) {
      document.body.classList.add("cinematic-autofocus-active");
      _startAutofocusLoop();
    } else {
      document.body.classList.remove("cinematic-autofocus-active");
      _stopAutofocusLoop();
    }
  });
}

window.autofocusTargetZ = 0;

window.autofocusCurrentZ = 0;

window.autofocusRafId = null;

window._startAutofocusLoop = function _startAutofocusLoop() {
  if (!autofocusRafId) {
    _autofocusStep();
  }
};

window._stopAutofocusLoop = function _stopAutofocusLoop() {
  if (autofocusRafId) {
    cancelAnimationFrame(autofocusRafId);
    autofocusRafId = null;
  }
  // Reset echoes
  if (echoLayerEl) {
    echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
      doc.style.removeProperty("--af-blur");
      doc.style.removeProperty("--af-brightness");
    });
  }
};

window._autofocusStep = function _autofocusStep() {
  if (!isAutofocusActive) {
    _stopAutofocusLoop();
    return;
  }

  // Lerp current Z to target Z for smooth focal transition
  autofocusCurrentZ += (autofocusTargetZ - autofocusCurrentZ) * 0.1;

  if (echoLayerEl) {
    echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
      // Calculate local Z depth (derived from its data-depth or var(--tz))
      // It's hard to get computed --tz reliably if it's animated, so we use an approximation based on depth
      let docZ = 0;
      const depth = parseInt(doc.dataset.depth || "0", 10);
      if (depth === 0) docZ = -400;
      else if (depth === 1) docZ = 0;
      else if (depth === 2) docZ = 400;

      const distance = Math.abs(docZ - autofocusCurrentZ);
      // Max distance is roughly 800, let's map this to blur 0px -> 15px
      const blurAmount = Math.min(15, (distance / 800) * 15);
      const brightnessAmount = 1 - Math.min(0.6, (distance / 800) * 0.6);

      doc.style.setProperty("--af-blur", `${blurAmount}px`);
      doc.style.setProperty("--af-brightness", `${brightnessAmount}`);
    });
  }

  autofocusRafId = requestAnimationFrame(_autofocusStep);
};

window.opacitySlider = document.getElementById("editor-opacity");

opacitySlider.addEventListener("input", (e) => {
  updateFocusVisuals();
});

window.lastScrollTop = 0;

window.lastScrollTime = performance.now();

editor.onDidScrollChange((e) => {
  if (echoLayerEl) {
    echoLayerEl.style.setProperty("--editor-scroll-y", `${e.scrollTop}px`);

    // Scroll-Linked Kinetic Chromatic Aberration
    const now = performance.now();
    const dt = now - lastScrollTime;
    if (dt > 0) {
      const dy = e.scrollTop - lastScrollTop;
      const velocity = Math.abs(dy / dt);
      // Clamp velocity
      const clampedVel = Math.min(velocity * 10, 50); // Scale for visual effect
      document.body.style.setProperty("--scroll-vel", clampedVel);

      // Auto-decay the velocity effect
      clearTimeout(window._scrollDecayTimer);
      window._scrollDecayTimer = setTimeout(() => {
        document.body.style.setProperty("--scroll-vel", 0);
      }, 100);
    }
    lastScrollTop = e.scrollTop;
    lastScrollTime = now;
  }
});

window.intensitySlider = document.getElementById("storm-intensity");

intensitySlider.addEventListener("input", (e) => {
  const val = parseInt(e.target.value, 10);
  if (raindrops) {
    raindrops.options.rainChance = val / 100;
    raindrops.options.dropletsRate = val * 2;
  }
});

window.focusMode = false;

document.getElementById("focus-mode").addEventListener("change", (e) => {
  focusMode = e.target.checked;
});

window.lanternToggle = document.getElementById("lantern-mode");

if (lanternToggle) {
  lanternToggle.addEventListener("change", (e) => {
    referenceManager.setLanternMode(e.target.checked);
  });
}

window.wiperMode = false;

window.wiperAnimationId = null;

window.wiperX = 0;

window.wiperDirection = 1;

window.wiperToggle = document.getElementById("wiper-mode");

window.animateWiper = function animateWiper() {
  if (!wiperMode || !raindrops) return;

  const w = window.innerWidth;
  const speed = 15;
  wiperX += speed * wiperDirection;

  if (wiperX > w + 100) {
    wiperDirection = -1;
  } else if (wiperX < -100) {
    wiperDirection = 1;
  }

  // Clear droplets along a vertical line
  const h = window.innerHeight;
  for (let y = 0; y < h; y += 30) {
    raindrops.clearDroplets(wiperX, y, 60);
    if (fogManager) {
      fogManager.clearFogAt(wiperX, y, 80);
    }
  }

  wiperAnimationId = requestAnimationFrame(animateWiper);
};

if (wiperToggle) {
  wiperToggle.addEventListener("change", (e) => {
    wiperMode = e.target.checked;
    if (wiperMode) {
      wiperX = wiperDirection === 1 ? -100 : window.innerWidth + 100;
      animateWiper();
    } else {
      cancelAnimationFrame(wiperAnimationId);
    }
  });
}

document.addEventListener("echo-peek", (e) => {
  if (fogManager && e.detail) {
    // Focus Spotlight logic
    const radius = e.detail.radius || 120;

    // Heavily clear fog where user is peeking
    fogManager.clearFogAt(
      e.detail.x,
      e.detail.y,
      radius,
      e.detail.isFocusSpotlight,
    );

    // If it's the full focus spotlight, clear rain too
    if (e.detail.isFocusSpotlight && raindrops) {
      raindrops.clearDroplets(e.detail.x, e.detail.y, radius);
    }
  }
});

document.addEventListener("document-splash", (e) => {
  if (raindrops && e.detail) {
    // Create a large splash effect
    raindrops.splash(e.detail.x, e.detail.y, 15);
  }
});

window.exposeToggle = document.getElementById("expose-mode");

if (exposeToggle) {
  exposeToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.body.classList.add("expose-active");
    } else {
      document.body.classList.remove("expose-active");
    }
  });
}

window.ghostMode = false;

window.ghostTimer = null;

window.ghostToggle = document.getElementById("ghost-mode");

window.resetGhostTimer = function resetGhostTimer() {
  if (!ghostMode) return;
  if (focusDepth > 0.1) return; // Don't interfere if focusing on reference

  // Restore opacity on activity
  if (editorEl.style.opacity !== opacitySlider.value) {
    updateFocusVisuals();
  }

  clearTimeout(ghostTimer);
  ghostTimer = setTimeout(() => {
    if (focusDepth < 0.1) {
      editorEl.style.opacity = "0.05";
    }
  }, 4000);
};

if (ghostToggle) {
  ghostToggle.addEventListener("change", (e) => {
    ghostMode = e.target.checked;
    if (!ghostMode) {
      clearTimeout(ghostTimer);
      editorEl.style.opacity = opacitySlider.value;
    } else {
      resetGhostTimer();
    }
  });
}

["mousemove", "keydown", "mousedown", "wheel"].forEach((evt) => {
  window.addEventListener(evt, () => {
    resetGhostTimer();
    // Fog is cleared by mousemove via FogManager directly
    // Reset editor blur only if NOT in focus depth mode
    if (editorEl && focusDepth < 0.1) editorEl.style.filter = "none";
  });
});

window.isCinematicAutofocusActive = false;

window.currentCinematicZ = 0;

window.targetCinematicZ = 0;

window.cinematicAnimationId = null;

window.cinematicToggle = document.getElementById("cinematic-autofocus-mode");

if (cinematicToggle) {
  cinematicToggle.addEventListener("change", (e) => {
    isCinematicAutofocusActive = e.target.checked;

    if (isCinematicAutofocusActive) {
      document.body.classList.add("cinematic-autofocus-active");
      if (!cinematicAnimationId) {
        animateCinematicFocus();
      }
    } else {
      document.body.classList.remove("cinematic-autofocus-active");
      if (cinematicAnimationId) {
        cancelAnimationFrame(cinematicAnimationId);
        cinematicAnimationId = null;
      }
      resetCinematicFocus();
    }
  });
}

window.updateCinematicTarget = function updateCinematicTarget(e) {
  if (!isCinematicAutofocusActive) return;

  // Find element under cursor
  const target = document.elementFromPoint(e.clientX, e.clientY);
  const echoDoc = target ? target.closest(".echo-document") : null;
  const isEditor = target ? target.closest("#editor") : null;

  if (echoDoc) {
    // Determine depth based on index
    const indexStr = echoDoc.style.getPropertyValue("--depth-index") || "0";
    targetCinematicZ = parseInt(indexStr, 10);
  } else if (isEditor) {
    targetCinematicZ = -1; // Editor is foreground
  } else {
    // If not hovering anything, subtly drift focus back to the front
    targetCinematicZ = -0.5;
  }
};

document.addEventListener("mousemove", updateCinematicTarget);

window.animateCinematicFocus = function animateCinematicFocus() {
  if (!isCinematicAutofocusActive) return;

  // Lerp towards target
  currentCinematicZ += (targetCinematicZ - currentCinematicZ) * 0.08;

  // Apply to styles
  applyCinematicStyles();

  cinematicAnimationId = requestAnimationFrame(animateCinematicFocus);
};

window.applyCinematicStyles = function applyCinematicStyles() {
  if (!echoLayerEl) return;

  const echoes = echoLayerEl.querySelectorAll(".echo-document");

  // Apply to editor (foreground)
  const editorDist = Math.abs(currentCinematicZ - -1);
  const editorBlur = editorDist * 2.5; // blur amount
  const editorOpacity = Math.max(0.3, 1 - editorDist * 0.15);

  if (editorEl) {
    editorEl.style.filter = `blur(${editorBlur}px)`;
    editorEl.style.opacity = editorOpacity;
  }

  // Apply to echoes
  echoes.forEach((echo) => {
    const indexStr = echo.style.getPropertyValue("--depth-index") || "0";
    const zIndex = parseInt(indexStr, 10);

    // Distance from focal plane
    const dist = Math.abs(currentCinematicZ - zIndex);

    // Calculate blur and brightness based on distance from focal plane
    const blurAmount = dist * 2.5;
    const brightness = Math.max(0.4, 1 - dist * 0.1);
    const opacity = Math.max(0.2, 0.8 - dist * 0.08);

    echo.style.filter = `blur(${blurAmount}px) brightness(${brightness})`;
    echo.style.opacity = opacity;
  });
};

window.resetCinematicFocus = function resetCinematicFocus() {
  if (editorEl) {
    editorEl.style.filter = "";
    // Opacity is handled by sliders, avoid clobbering completely, but clear inline
    editorEl.style.opacity = opacitySlider ? opacitySlider.value : "";
  }

  if (echoLayerEl) {
    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    echoes.forEach((echo) => {
      echo.style.filter = "";
      echo.style.opacity = "";
    });
  }
};
