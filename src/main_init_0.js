import { monaco } from "./editor/setupMonaco.js";
import { HolographicMinimap } from "./HolographicMinimap.js";

portalLayer.id = "portal-visuals";

portalLayer.style.position = "absolute";

portalLayer.style.inset = "0";

portalLayer.style.pointerEvents = "none";

portalLayer.style.zIndex = "3";

if (document.getElementById("container") && !portalLayer.parentElement) {
  document.getElementById("container").appendChild(portalLayer);
}

referenceManager.setConnectionManager(connectionManager);

referenceManager.setFogManager(fogManager);

if (referenceLayer) {
  referenceManager.update(INITIAL_MARKDOWN);
}

monaco.editor.defineTheme("transparent-vs-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "556677", fontStyle: "italic" },
    { token: "keyword", foreground: "00e5ff", fontStyle: "bold" },
  ],
  colors: {
    "editor.background": "#00000000",
    "editor.lineHighlightBackground": "#00e5ff11",
    "editorCursor.foreground": "#00e5ff",
    "editor.selectionBackground": "#00e5ff44",
  },
});

(async () => {
  await tabManager.loadTabsFromStorage();

  // If no tabs were restored, add the initial demo file
  if (tabManager.files.length === 0) {
    const INITIAL_CODE = [
      "// rain-2 demo",
      "function hello(){",
      ' console.log("hello world");',
      "}",
      "",
      "// @portal",
    ].join("\n");

    const initialFileId = tabManager.addFile(
      "main.js",
      INITIAL_CODE,
      "javascript",
    );
    tabManager.setActive(initialFileId);
  }
})();

if (_urlNote) {
  tabManager.openNoteAsTab(_urlNote);
}

window.veilExcavator = veilExcavator;

if (cabinetBtn) {
  cabinetBtn.addEventListener("click", () => cabinet3D.toggle());
}

if (vpsOpenBtn) {
  vpsOpenBtn.addEventListener("click", () => vpsBrowser.open());
}

if (vpsSaveBtn) {
  vpsSaveBtn.addEventListener("click", () => _triggerVpsSave());
}

window.addEventListener("fileCubeClicked", async (e) => {
  const { id, type, name, fileData: eventFileData } = e.detail;

  console.log(`Fetching ${type}: ${name}...`);
  // Show loading cursor
  document.body.style.cursor = "wait";
  try {
    // 1. Fetch the code/json from the backend (handle both VPS remote files and cabinet files)
    let fileData;

    if (eventFileData && eventFileData.isRemote && eventFileData.vpsPath) {
      // Remote VPS file
      const content = await storageAPI.getVPSFile(eventFileData.vpsPath);
      const ext = name.split(".").pop().toLowerCase();
      const languageMap = {
        js: "javascript",
        jsx: "javascript",
        ts: "typescript",
        tsx: "typescript",
        json: "json",
        html: "html",
        css: "css",
        md: "markdown",
        py: "python",
        glsl: "glsl",
        wgsl: "wgsl",
        frag: "glsl",
        vert: "glsl",
      };
      const language = languageMap[ext] || "plaintext";

      fileData = { content, language };
    } else {
      // Local / Cabinet file (notes, etc.)
      fileData = await storageAPI.getFileContent(id, type);
    }

    // 2. Add it to the Tab Manager
    const newFileId = tabManager.addFile(
      name,
      fileData.content,
      fileData.language,
    );

    // 3. Tag the file so save/open logic knows where it came from
    const newFile = tabManager.files.find((f) => f.id === newFileId);
    if (newFile) {
      if (eventFileData && eventFileData.isRemote && eventFileData.vpsPath) {
        newFile.vpsPath = eventFileData.vpsPath;
      } else {
        // Cabinet origin (new system)
        newFile.cabinetType = type;
        newFile.cabinetId = id;
        if (type === "notes") {
          newFile.noteName = id; // for notes, id is the note name
        }
      }
    }
    // 3. DEPTH FOCUS LOGIC (The Immersive Step)
    // Push all current tabs backward into the rain (Depth 1)
    tabManager.files.forEach((file) => {
      if (file.id !== newFileId) {
        file.depth = 1; // Pushed into the middle rain layer
      }
    });

    // Pull the newly opened file completely to the front (Depth 2)
    if (newFile) {
      newFile.depth = 2; // Unobscured by rain
    }

    // Apply the visual depth to the editor container immediately
    tabManager.setActive(newFileId);
    tabManager.applyDepth(2);

    // 4. Update Backend Play Count
    storageAPI.recordPlay(id, type);

    // 5. Hide the 3D Cabinet so the user can see the editor
    cabinet3D.hide();
  } catch (error) {
    console.error("Failed to load file:", error);
    alert(`Failed to load ${name}. Check console for details.`);
  } finally {
    document.body.style.cursor = "default";
  }
});

window.addEventListener("resize", resizeCanvases);

resizeCanvases();

initLayers();

window.addEventListener("cabinet-rain-clear", (e) => {
  rainEffects.addClear(e.detail.x, e.detail.y, e.detail.r, 3);
});

window.addEventListener("cabinet-rain-splash", (e) => {
  const { x, y, r } = e.detail;
  // Long-lived main clear at impact radius
  rainEffects.addClear(x, y, r, 40);
  if (raindrops) {
    raindrops.splash(x, y, 14);
    // Concentric ripple rings: pushed directly to bypass position-dedup.
    // Each ring has a shorter life so the set decays outward like a real splash.
    rainEffects.clears.push({ x, y, r: r * 0.28, life: 12 });
    rainEffects.clears.push({ x, y, r: r * 0.52, life: 8 });
    rainEffects.clears.push({ x, y, r: r * 0.76, life: 5 });
  }
});

editor.onDidChangeModel(() => {
  const rect = editorEl.getBoundingClientRect();
  if (rect.width > 0) rainEffects.addWipe(rect, 50);
});

document.addEventListener("mousedown", (e) => {
  // Clear any active holo projection if clicking outside
  if (!e.target.closest(".echo-document")) {
    const echoLayerEl = document.getElementById("echo-layer");
    if (echoLayerEl) {
      echoLayerEl.querySelectorAll(".holo-projected").forEach((doc) => {
        doc.classList.remove("holo-projected");
      });
    }
  }

  // Middle mouse button activates Flashlight mode
  if (e.button === 1) {
    isFlashlightActive = true;
    e.preventDefault(); // Prevent default middle-click scroll behavior
  }

  if (e.altKey && e.button === 0) {
    // Left click + Alt
    isAltDragActive = true;
    altDragStartX = e.clientX;
    altDragStartY = e.clientY;
    currentSceneRotX = sceneRotX;
    currentSceneRotY = sceneRotY;
    e.preventDefault(); // Prevent text selection while dragging
  }
});

document.addEventListener("mouseup", (e) => {
  if (e.button === 1) {
    isFlashlightActive = false;
  }

  if (e.button === 0) {
    isAltDragActive = false;
  }
});

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.altKey) {
    isWormholeActive = true;
  }

  if (e.altKey && e.code === "KeyZ") {
    document.body.classList.toggle("gravity-well-active");
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Escape") {
    if (document.body.classList.contains("tesseract-active")) {
      const viewSelect = document.getElementById("view-mode-select");
      if (viewSelect) viewSelect.value = "";
      tabManager._deactivateAllViews();
    }
  }

  if (e.key === "Control" || e.key === "Alt") {
    if (!e.ctrlKey || !e.altKey) {
      isWormholeActive = false;
      if (echoLayerEl) {
        const echoes = echoLayerEl.querySelectorAll(".echo-document");
        echoes.forEach((echo) => {
          echo.style.removeProperty("--wormhole-tx");
          echo.style.removeProperty("--wormhole-ty");
          echo.style.removeProperty("--wormhole-tz");
          echo.style.removeProperty("--wormhole-scale");
        });
      }
    }
  }
});

if (document.getElementById("radar-canvas")) {
  holographicMinimap = new HolographicMinimap("radar-canvas");
}

window.addEventListener("resize", () => {
  const dockEl = document.getElementById("dock");
  const tabsEl = document.getElementById("tabs-container");
  if (dockEl) dockEl._origRect = null;
  if (tabsEl) tabsEl._origRect = null;
});

document.addEventListener("mousedown", (e) => {
  if (document.body.classList.contains("tesseract-active")) {
    isTesseractDragging = true;
    tesseractLastX = e.clientX;
    tesseractLastY = e.clientY;
  }
});

document.addEventListener("mouseup", () => {
  isTesseractDragging = false;
});
