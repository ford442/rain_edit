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

if (viewModeSelect) {
  viewModeSelect.addEventListener("change", (e) => {
    const view = e.target.value;
    if (view === "theater") tabManager.toggleTheaterView();
    else if (view === "tornado") tabManager.toggleTornadoView();
    else if (view === "waterfall") tabManager.toggleWaterfallView();
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
    // UI binding for Infinity Mirror view mode (added in previous iteration)
    else if (view === "infinity-mirror") tabManager.toggleInfinityMirrorView();
    else if (view === "archway") tabManager.toggleArchwayView();
    else if (view === "kaleidoscope") tabManager.toggleKaleidoscopeView();
    else if (view === "vortex") tabManager.toggleVortexView();
    else if (view === "constellation") tabManager.toggleConstellationView();
    else if (view === "prism") tabManager.togglePrismView();
    else if (view === "coverflow") tabManager.toggleCoverflowView();
    else if (view === "sphere") tabManager.toggleSphereView();
    else if (view === "wave") tabManager.toggleWaveView();
    else if (view === "black-hole") tabManager.toggleBlackHoleView();
    else if (view === "rolodex") tabManager.toggleRolodexView();
    else if (view === "cylinder") tabManager.toggleCylinderView();
    else if (view === "galaxy") tabManager.toggleGalaxyView();
    else if (view === "origami") tabManager.toggleOrigamiView();
    else if (view === "matrix-rain") tabManager.toggleMatrixRainView();
    else if (view === "data-hive") tabManager.toggleDataHiveView();
    else if (view === "crystal") tabManager.toggleCrystalView();
    else if (view === "fractal") tabManager.toggleFractalView();
    else if (view === "solar-system") tabManager.toggleSolarSystemView();
    else if (view === "neon-synth") tabManager.toggleNeonSynthView();
    else if (view === "blueprint-3d") tabManager.toggleBlueprint3dView();
    else if (view === "cyber-cortex") tabManager.toggleCyberCortexView();
    else if (view === "quantum") tabManager.toggleQuantumSuperpositionView();
    else if (view === "outline") tabManager.toggleOutlineView();
    else if (view === "tesseract") tabManager.toggleTesseractView();
    else if (view === "cyclone") tabManager.toggleCycloneView();
    else if (view === "mobius") tabManager.toggleMobiusView();
    else if (view === "astrolabe") tabManager.toggleAstrolabeView();
    else if (view === "dominoes") tabManager.toggleDominoesView();
    else if (view === "hexagon-matrix") tabManager.toggleHexagonMatrixView();
    else if (view === "luminescence") tabManager.toggleLuminescenceView();
    else if (view === "geode") tabManager.toggleGeodeView();
    else tabManager._deactivateAllViews(); // Default view
  });
}

if (theaterToggle) {
  theaterToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.body.classList.add("theater-active");
    } else {
      document.body.classList.remove("theater-active");
    }
  });
}

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

opacitySlider.addEventListener("input", (e) => {
  updateFocusVisuals();
});

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

intensitySlider.addEventListener("input", (e) => {
  const val = parseInt(e.target.value, 10);
  if (raindrops) {
    raindrops.options.rainChance = val / 100;
    raindrops.options.dropletsRate = val * 2;
  }
});

document.getElementById("focus-mode").addEventListener("change", (e) => {
  focusMode = e.target.checked;
});

if (lanternToggle) {
  lanternToggle.addEventListener("change", (e) => {
    referenceManager.setLanternMode(e.target.checked);
  });
}

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

if (exposeToggle) {
  exposeToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
      document.body.classList.add("expose-active");
    } else {
      document.body.classList.remove("expose-active");
    }
  });
}

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

document.addEventListener("mousemove", updateCinematicTarget);

document.getElementById("blueprint-mode").addEventListener("change", (e) => {
  if (e.target.checked) {
    if (referenceLayer) {
      referenceLayer.classList.add("blueprint-mode");
      // Make editor slightly more transparent in blueprint mode
      editorEl.style.opacity = "0.7";
    }
  } else {
    if (referenceLayer) {
      referenceLayer.classList.remove("blueprint-mode");
      // Restore opacity (or reset to slider value)
      editorEl.style.opacity = opacitySlider.value;
    }
  }
});

editor.onKeyDown((e) => {
  if (e.keyCode === monaco.KeyCode.Enter) {
    if (!raindrops) return;

    // Typing Shockwave Effect
    if (echoLayerEl) {
      const echoes = echoLayerEl.querySelectorAll(".echo-document");
      echoes.forEach((echo) => {
        echo.classList.remove("shockwave-hit");
        void echo.offsetWidth; // Force reflow
        echo.classList.add("shockwave-hit");
        setTimeout(() => {
          echo.classList.remove("shockwave-hit");
        }, 600); // match animation duration
      });
    }

    const position = editor.getPosition();
    const scrolledVisiblePosition = editor.getScrolledVisiblePosition(position);

    if (scrolledVisiblePosition) {
      const y = scrolledVisiblePosition.top;
      const width = editorEl.clientWidth;
      const step = 40;
      for (let x = 0; x < width; x += step) {
        // Wiping animation
        setTimeout(() => {
          raindrops.clearDroplets(x, y + 10, 80);
        }, x * 0.5);
      }
    }
  }
});

editor.onDidChangeCursorPosition((e) => {
  const position = e.position;
  const scrolledVisiblePosition = editor.getScrolledVisiblePosition(position);

  if (scrolledVisiblePosition) {
    const x = scrolledVisiblePosition.left;
    const y = scrolledVisiblePosition.top;

    // Calculate cursor vertical percentage for Semantic Sync Plane
    const editorHeight = editorEl.clientHeight;
    if (editorHeight > 0) {
      const cursorYPercent = (y / editorHeight) * 100;
      document.body.style.setProperty(
        "--cursor-y-percent",
        `${cursorYPercent}%`,
      );
    }

    // Focus Peeking: Highlight note behind cursor
    if (referenceManager) {
      referenceManager.highlightNoteAt(x, y);
    }

    // Rain clearing (Focus Mode)
    if (focusMode && raindrops) {
      raindrops.clearDroplets(x, y, 100);
    }

    // Fog clearing (Typing)
    if (fogManager) {
      // Adjust for relative coordinates if needed, but FogManager uses client rects
      const rect = editorEl.getBoundingClientRect();
      fogManager.clearFogAt(x + rect.left, y + rect.top, 80);
    }

    // Focus Link: Connect cursor word to reference notes and cursor tether to echo layers
    const model = editor.getModel();
    const wordAtPosition = model.getWordAtPosition(position);

    let currentWord = null;
    if (wordAtPosition) {
      currentWord = wordAtPosition.word;
    }

    if (connectionManager) {
      if (currentWord) {
        // Adjust coordinates to be relative to the viewport/canvas
        const rect = editorEl.getBoundingClientRect();
        connectionManager.setEditorFocus(
          currentWord,
          x + rect.left,
          y + rect.top + 10,
        ); // +10 for approximate line height center
      } else {
        // If no word, we can still pass a dummy word or empty to tether hovered/resonating documents if we want
        // But setEditorFocus uses the word for highlighting cards. Let's pass the cursor coordinates anyway.
        const rect = editorEl.getBoundingClientRect();
        connectionManager.setEditorFocus(
          "___CURSOR_TETHER___",
          x + rect.left,
          y + rect.top + 10,
        );
      }
    }

    // Semantic Resonance & Hover Cursor Tether: highlight echo documents matching the word
    if (echoLayerEl) {
      const echoes = echoLayerEl.querySelectorAll(".echo-document");
      echoes.forEach((echo) => {
        echo.classList.remove("resonance-hit");
        // Remove magnetic surfacing local overrides if they exist
        if (echo.style.getPropertyValue("--tz-override")) {
          echo.style.removeProperty("--tz-override");
          echo.style.setProperty("--tz", echo.dataset.originalTz || "0px");
        }
      });

      let matchedEchoes = [];

      // Add resonating files
      if (currentWord && currentWord.length > 3) {
        const lowerWord = currentWord.toLowerCase();

        tabManager.files.forEach((file) => {
          if (file.id !== tabManager.activeId) {
            let content = "";
            if (file.isImage) {
              content = file.name.toLowerCase();
            } else if (file.model) {
              content = file.model.getValue().toLowerCase();
            }

            if (content.includes(lowerWord)) {
              const echoEl = echoLayerEl.querySelector(
                `.echo-document[data-id="${file.id}"]`,
              );
              if (echoEl) {
                echoEl.classList.add("resonance-hit");
                // Magnetic Surfacing: Pull the matched document forward in Z-space
                if (!echoEl.dataset.originalTz) {
                  echoEl.dataset.originalTz =
                    echoEl.style.getPropertyValue("--tz") || "0px";
                }
                // Override the tz variable to pull it physically closer before the pulse animation takes over
                echoEl.style.setProperty("--tz-override", "1");
                echoEl.style.setProperty("--tz", "30px");

                // Semantic Depth Linking: Provide the depth level to the connection manager
                const rect = echoEl.getBoundingClientRect();
                matchedEchoes.push({
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                  depthIndex: parseInt(echoEl.dataset.index || 0, 10),
                  isHovered: false,
                });
              }
            }
          }
        });
      }

      // Add currently hovered files for the tether feature
      echoes.forEach((echoEl) => {
        if (
          echoEl.matches(":hover") &&
          !echoEl.classList.contains("resonance-hit")
        ) {
          const rect = echoEl.getBoundingClientRect();
          matchedEchoes.push({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            depthIndex: parseInt(echoEl.dataset.index || 0, 10),
            isHovered: true,
          });
        }
      });

      if (connectionManager) {
        connectionManager.setEchoFocus(matchedEchoes);
      }

      // Trigger semantic sparks for hovered items
      matchedEchoes.forEach((match) => {
        if (match.isHovered && Math.random() > 0.7) {
          spawnSemanticSpark(
            match.left + match.width / 2,
            match.top + match.height / 2,
          );
        }
      });
    }
  }
});

scheduleLightning();

if (referenceInput) {
  referenceInput.value = INITIAL_MARKDOWN;

  referenceInput.addEventListener("input", (e) => {
    referenceManager.update(e.target.value);
  });
}
