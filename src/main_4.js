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

window.spawnSemanticSpark = function spawnSemanticSpark(startX, startY) {
  if (!echoLayerEl) return;
  const spark = document.createElement("div");
  spark.className = "semantic-spark";
  spark.style.left = `${startX}px`;
  spark.style.top = `${startY}px`;

  // Editor is roughly in the center
  const editorRect = editorEl.getBoundingClientRect();
  const endX =
    editorRect.left + editorRect.width / 2 + (Math.random() - 0.5) * 100;
  const endY =
    editorRect.top + editorRect.height / 2 + (Math.random() - 0.5) * 100;

  const dx = endX - startX;
  const dy = endY - startY;

  spark.style.setProperty("--tx", `${dx}px`);
  spark.style.setProperty("--ty", `${dy}px`);

  echoLayerEl.appendChild(spark);

  setTimeout(() => {
    if (spark.parentNode) {
      spark.parentNode.removeChild(spark);
    }
  }, 1000);
};

window.lightningLayer = document.getElementById("lightning-layer");

window.triggerLightning = function triggerLightning() {
  if (!lightningLayer) return;
  const brightness = 0.6 + Math.random() * 0.4;
  lightningLayer.style.opacity = brightness;
  setTimeout(
    () => {
      lightningLayer.style.opacity = 0;
    },
    50 + Math.random() * 100,
  );
  scheduleLightning();
};

window.scheduleLightning = function scheduleLightning() {
  const delay = 10000 + Math.random() * 20000;
  setTimeout(triggerLightning, delay);
};

scheduleLightning();

window.referenceInput = document.getElementById("reference-input");

if (referenceInput) {
  referenceInput.value = INITIAL_MARKDOWN;

  referenceInput.addEventListener("input", (e) => {
    referenceManager.update(e.target.value);
  });
}

window.globalSearch = document.getElementById("global-search");

if (globalSearch) {
  globalSearch.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();

    if (!searchTerm) {
      // Clear all search hits
      document.querySelectorAll(".echo-document.search-hit").forEach((el) => {
        el.classList.remove("search-hit");
        if (el.style.getPropertyValue("--tz-override")) {
          el.style.removeProperty("--tz-override");
          el.style.setProperty("--tz", el.dataset.originalTz || "0px");
        }
      });
      return;
    }

    let matchedEchoes = [];

    tabManager.files.forEach((file) => {
      if (file.id === tabManager.activeId) return;

      let content = "";
      if (file.isImage) {
        content = file.name.toLowerCase();
      } else if (file.model) {
        content = file.model.getValue().toLowerCase();
      }

      const echoEl = document.querySelector(
        `.echo-document[data-id="${file.id}"]`,
      );
      if (echoEl) {
        if (content.includes(searchTerm)) {
          echoEl.classList.add("search-hit");
          if (!echoEl.dataset.originalTz) {
            echoEl.dataset.originalTz =
              echoEl.style.getPropertyValue("--tz") || "0px";
          }
          echoEl.style.setProperty("--tz-override", "1");
          echoEl.style.setProperty("--tz", "80px");

          const rect = echoEl.getBoundingClientRect();
          matchedEchoes.push({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            depthIndex: parseInt(echoEl.dataset.index || 0, 10),
            isHovered: false,
          });
        } else {
          echoEl.classList.remove("search-hit");
          if (echoEl.style.getPropertyValue("--tz-override")) {
            echoEl.style.removeProperty("--tz-override");
            echoEl.style.setProperty(
              "--tz",
              echoEl.dataset.originalTz || "0px",
            );
          }
        }
      }
    });

    if (connectionManager) {
      // Setting echo focus triggers the semantic 3D threading
      connectionManager.setEchoFocus(matchedEchoes);
    }
  });
}

window.userPreferredDepth = 1.0;

window.setFocusDepth = function setFocusDepth(depth) {
  focusDepth = Math.max(0, Math.min(1, depth));
  updateFocusVisuals();
};

window.updateFocusVisuals = function updateFocusVisuals() {
  const maxOpacity = parseFloat(opacitySlider.value) || 1;
  const targetEditorOpacity = maxOpacity * (1 - focusDepth * 0.95);

  // Zoom Calculation
  // When focusDepth = 1 (Reference focused), Reference scale = 1.05 (Zoom In), Editor scale = 0.95 (Zoom Out)
  const refScale = 1 + focusDepth * 0.08;
  const editorScale = 1 - focusDepth * 0.05;

  // Editor and Image Viewer
  const targetOpacity = Math.max(0.02, targetEditorOpacity);
  const filter = `blur(${focusDepth * 8}px)`;
  const transform = `scale(${editorScale}) translateZ(0)`;

  editorEl.style.opacity = targetOpacity;
  editorEl.style.filter = filter;
  editorEl.style.transform = transform;

  if (document.getElementById("image-viewer")) {
    document.getElementById("image-viewer").style.opacity = targetOpacity;
    document.getElementById("image-viewer").style.filter = filter;
    document.getElementById("image-viewer").style.transform = transform;
  }

  // Reference Layer
  if (referenceLayer) {
    // Use translateZ to force GPU acceleration
    referenceLayer.style.transform = `scale(${refScale}) translateZ(0)`;
  }

  // Pointer Events
  if (focusDepth > 0.6) {
    editorEl.style.pointerEvents = "none";
    if (document.getElementById("image-viewer"))
      document.getElementById("image-viewer").style.pointerEvents = "none";
  } else {
    editorEl.style.pointerEvents = "auto";
    if (document.getElementById("image-viewer"))
      document.getElementById("image-viewer").style.pointerEvents = "auto";
  }

  // Reference Overlay
  if (referenceOverlay) {
    referenceOverlay.style.opacity = 1 - focusDepth;
  }

  // Fog
  if (fogLayerEl) {
    fogLayerEl.style.opacity = 1 - focusDepth * 0.5;
  }
};

updateFocusVisuals();

window.isAltDown = false;

document.addEventListener("keydown", (e) => {
  if (e.key === "Alt") {
    if (!isAltDown) {
      isAltDown = true;
      setFocusDepth(userPreferredDepth);
      document.body.classList.add("alt-focus-active");
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Alt") {
    isAltDown = false;
    setFocusDepth(0);
    document.body.classList.remove("alt-focus-active");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.metaKey && e.shiftKey && !e.repeat) {
    isMagnifierMode = true;
    editorEl.classList.add("x-ray-active"); // Re-use x-ray hole effect for the editor
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Meta" || e.key === "Shift") {
    isMagnifierMode = false;
    // Don't remove x-ray-active if the normal X-Ray shortcut (just Meta) is still held
    if (!e.metaKey && !e.ctrlKey) {
      editorEl.classList.remove("x-ray-active");
    }

    if (echoLayerEl) {
      echoLayerEl.querySelectorAll(".echo-document").forEach((echo) => {
        echo.classList.remove("magnifier-active");
        echo.classList.remove("loupe-active");
      });
    }
  }
});

window.zCameraOffset = 0;

window.addEventListener(
  "wheel",
  (e) => {
    // "Z-Axis Camera Fly-Through" mapped to Alt + Scroll (replacing old Layered Depth Explorer)
    if (e.altKey && !tabManager.isCascadeView) {
      e.preventDefault();
      const delta = e.deltaY * 1.5; // Smooth camera fly speed
      zCameraOffset += delta;

      // Clamp scroll camera depth roughly to available echoes with some padding
      const maxDepth = tabManager.files.length * 100 + 400; // Allow deeper fly-through
      zCameraOffset = Math.max(-200, Math.min(maxDepth, zCameraOffset));

      // Apply the global camera offset to the body so all layers get it
      document.body.style.setProperty(
        "--z-camera-offset",
        `${zCameraOffset}px`,
      );

      if (echoLayerEl) {
        // Highlight intersecting documents (Layered Depth Explorer visual feedback)
        const echoes = echoLayerEl.querySelectorAll(".echo-document");
        echoes.forEach((echo) => {
          // Original Z position (from TabManager: mostly derived from index, though varies by view mode. Using a general approach here)
          const docZ =
            parseInt(echo.dataset.index || 0) * 50 +
            parseInt(echo.style.getPropertyValue("--tz") || 0);

          // If zCameraOffset is near docZ, it's intersecting the viewing plane and we can apply visual feedback
          const distance = Math.abs(docZ - zCameraOffset);
          if (distance < 60) {
            echo.classList.add("z-intersect");
          } else {
            echo.classList.remove("z-intersect");
          }
        });
      }
    }
  },
  { passive: false },
);

document.addEventListener("keydown", (e) => {
  if (e.altKey && e.key.toLowerCase() === "f") {
    e.preventDefault();
    document.body.classList.toggle("flashlight-active");
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Alt") {
    zCameraOffset = 0;
    document.body.style.setProperty("--z-camera-offset", "0px");
    if (echoLayerEl) {
      const echoes = echoLayerEl.querySelectorAll(".echo-document");
      echoes.forEach((echo) => {
        echo.classList.remove("z-intersect");
      });
    }

    // Also clear the old alt focus state
    isAltDown = false;
    setFocusDepth(0);
    document.body.classList.remove("alt-focus-active");
  }
});

window.isLensMode = false;

document.addEventListener("keydown", (e) => {
  // Shift + Alt to toggle Lens Mode
  if (e.altKey && e.shiftKey && !e.repeat) {
    isLensMode = !isLensMode;
    if (referenceManager) {
      referenceManager.isLensMode = isLensMode;
    }
    if (isLensMode) {
      editorEl.classList.add("lens-active");
    } else {
      editorEl.classList.remove("lens-active");
    }
    // If we have portals, we need to update the composed mask immediately
    if (typeof updatePortals === "function") {
      requestAnimationFrame(updatePortals);
    }
  }
});

window.themeSelect = document.getElementById("theme-select");

if (themeSelect) {
  themeSelect.addEventListener("change", (e) => {
    const theme = e.target.value;
    document.body.classList.remove(
      "theme-journal",
      "theme-blueprint",
      "theme-cyberpunk",
    );
    if (theme !== "cyberpunk") {
      document.body.classList.add(`theme-${theme}`);
    }
  });
}

window.dock = document.getElementById("dock");

window.dockToggle = document.getElementById("dock-toggle");

if (dock && dockToggle) {
  dockToggle.addEventListener("click", () => {
    dock.classList.toggle("dock-collapsed");
  });
}

window.updateAtmosphere = function updateAtmosphere() {
  if (!editor || !monaco) return;
  const model = editor.getModel();
  if (!model) return;

  const markers = monaco.editor.getModelMarkers({ resource: model.uri });
  let errorCount = 0;
  let warningCount = 0;

  markers.forEach((m) => {
    if (m.severity === monaco.MarkerSeverity.Error) errorCount++;
    if (m.severity === monaco.MarkerSeverity.Warning) warningCount++;
  });

  let targetHue = 180; // Cyan (Calm)
  let intensityMod = 0;

  if (errorCount > 0) {
    targetHue = 0; // Red (Danger)
    intensityMod = Math.min(50, errorCount * 10);
  } else if (warningCount > 0) {
    targetHue = 40; // Orange (Warning)
    intensityMod = Math.min(20, warningCount * 5);
  }

  // Smoothly interpolate hue (simple approach via CSS variable)
  // We update --dynamic-hue base, which breathing effect builds upon
  // Current base is set in the interval loop below, we can override it there
  // or set a global modifier.

  window.atmosphereHue = targetHue;
  window.atmosphereIntensity = intensityMod;
};

editor.onDidChangeModelDecorations(() => {
  updateAtmosphere();
});
