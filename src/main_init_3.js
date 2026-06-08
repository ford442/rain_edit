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

updateFocusVisuals();

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

if (dock && dockToggle) {
  dockToggle.addEventListener("click", () => {
    dock.classList.toggle("dock-collapsed");
  });
}

editor.onDidChangeModelDecorations(() => {
  updateAtmosphere();
});

window.atmosphereHue = 180;

window.atmosphereIntensity = 0;

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

if (btnSonar) {
  btnSonar.addEventListener("click", triggerSonar);
}

if (btnZScan) {
  btnZScan.addEventListener("click", triggerZScan);
}

if (btnBlackHole) {
  btnBlackHole.addEventListener("click", () => {
    tabManager.toggleBlackHoleView();
  });
}

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

if (btnExplode) {
  btnExplode.addEventListener("click", triggerExplodeView);
}
