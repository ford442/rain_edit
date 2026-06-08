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

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") {
      return new jsonWorker();
    }
    if (label === "css" || label === "scss" || label === "less") {
      return new cssWorker();
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return new htmlWorker();
    }
    if (label === "typescript" || label === "javascript") {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

window.editorEl = document.getElementById("editor");

window.backCanvas = document.getElementById("rain-back");

window.frontCanvas = document.getElementById("rain-front");

window.connectionsCanvas = document.getElementById("connections-layer");

window.matrixLayer = document.getElementById("matrix-layer");

window.referenceLayer = document.getElementById("reference-layer");

window.referenceOverlay = document.getElementById("reference-overlay");

window.holoLayerEl = document.getElementById("holo-layer");

window.echoLayerEl = document.getElementById("echo-layer");

window.dustLayerEl = document.getElementById("dust-layer");

window.fogLayerEl = document.getElementById("fog-layer");

window.vignetteLayer = document.getElementById("vignette-layer");

window.neonScatterLayer = document.getElementById("neon-scatter-layer");

window.portalLayer = document.getElementById("portal-visuals") || document.createElement("div");

portalLayer.id = "portal-visuals";

portalLayer.style.position = "absolute";

portalLayer.style.inset = "0";

portalLayer.style.pointerEvents = "none";

portalLayer.style.zIndex = "3";

if (document.getElementById("container") && !portalLayer.parentElement) {
  document.getElementById("container").appendChild(portalLayer);
}

window.referenceManager = new ReferenceManager(
  referenceLayer,
  referenceOverlay,
  monaco,
);

window.connectionManager = new ConnectionManager(
  connectionsCanvas,
  referenceManager,
);

referenceManager.setConnectionManager(connectionManager);

window.fogManager = new FogManager(fogLayerEl);

referenceManager.setFogManager(fogManager);

window.focusDepth = 0;

window.isMagnifierMode = false;

window.INITIAL_MARKDOWN = `# REFERENCE LAYER
Use this space for documentation, specs, or notes.
It sits behind the rain but remains readable.
**Toggle visibility with Alt key.**

## API Reference
- \`raindrops.clearDroplets(x, y, r)\`
- \`render(time)\`
- \`update()\`

> [!NOTE]
> Rain is just confetti from the sky.

\`\`\`javascript
function example() {
  return true;
}
\`\`\`

> [!WARN]
> Heavy storms ahead.

`.trim();

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

window.editor = monaco.editor.create(editorEl, {
  theme: "transparent-vs-dark",
  automaticLayout: true,
  fontFamily: "JetBrains Mono",
  fontSize: 14,
  minimap: { enabled: false },
  scrollbar: {
    vertical: "hidden",
    horizontal: "hidden",
  },
});

window.dataSiphon = new DataSiphon(editor);

window.tabsContainerEl = document.getElementById("tabs-container");

window.imageViewerEl = document.getElementById("image-viewer");

window.tabManager = new TabManager(
  editor,
  monaco,
  editorEl,
  tabsContainerEl,
  imageViewerEl,
  echoLayerEl,
);

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

window._urlNote = new URLSearchParams(window.location.search).get("note");

if (_urlNote) {
  tabManager.openNoteAsTab(_urlNote);
}

window.holoManager = new HoloManager(editor, holoLayerEl);

window.storageAPI = new StorageAPI();

window.cabinet3D = new Cabinet3D(storageAPI, tabManager, monaco);

window.veilExcavator = new VeilExcavator(tabManager);

window.veilExcavator = veilExcavator;

window.cabinetBtn = document.getElementById("btn-cabinet");

if (cabinetBtn) {
  cabinetBtn.addEventListener("click", () => cabinet3D.toggle());
}

window.vpsBrowser = new VPSFileBrowser(storageAPI, tabManager);

window.vpsOpenBtn = document.getElementById("btn-vps-open");

if (vpsOpenBtn) {
  vpsOpenBtn.addEventListener("click", () => vpsBrowser.open());
}

window.vpsSaveBtn = document.getElementById("btn-vps-save");

if (vpsSaveBtn) {
  vpsSaveBtn.addEventListener("click", () => _triggerVpsSave());
}

window._triggerVpsSave = async function _triggerVpsSave() {
  const activeFile = tabManager.files.find((f) => f.id === tabManager.activeId);
  if (!activeFile) return;

  if (activeFile.vpsPath) {
    // Direct save — re-upload to the same VPS path
    const content = activeFile.model
      ? activeFile.model.getValue()
      : activeFile.content || "";

    document.body.style.cursor = "wait";
    try {
      const result = await storageAPI.saveVPSFile(activeFile.vpsPath, content);
      if (result) {
        // Invalidate Cabinet3D preview cache for this file so next hover is fresh
        window.dispatchEvent(
          new CustomEvent("cabinet-cache-invalidate", {
            detail: { path: activeFile.vpsPath },
          }),
        );
        // Brief visual confirmation on the save button
        if (vpsSaveBtn) {
          const orig = vpsSaveBtn.textContent;
          vpsSaveBtn.textContent = "✅ Saved!";
          setTimeout(() => {
            vpsSaveBtn.textContent = orig;
          }, 1500);
        }
      } else {
        vpsBrowser.open();
        vpsBrowser.openSaveMode(
          activeFile.name || "untitled.txt",
          activeFile.vpsPath.split("/").slice(0, -1).join("/"),
        );
      }
    } catch (err) {
      console.error("[VPSFileBrowser] save error, opening save dialog:", err);
      vpsBrowser.openSaveMode(activeFile.name || "untitled.txt");
    } finally {
      document.body.style.cursor = "default";
    }
  } else {
    // Unknown VPS path — open the save-as browser
    vpsBrowser.openSaveMode(activeFile.name || "untitled.txt");
  }
};

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

window.resizeCanvases = function resizeCanvases() {
  const rect = editorEl.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  backCanvas.width = rect.width * dpr;
  backCanvas.height = rect.height * dpr;
  backCanvas.style.width = rect.width + "px";
  backCanvas.style.height = rect.height + "px";

  frontCanvas.width = rect.width * dpr;
  frontCanvas.height = rect.height * dpr;
  frontCanvas.style.width = rect.width + "px";
  frontCanvas.style.height = rect.height + "px";

  if (matrixLayer) {
    matrixLayer.width = rect.width * dpr;
    matrixLayer.height = rect.height * dpr;
    matrixLayer.style.width = rect.width + "px";
    matrixLayer.style.height = rect.height + "px";
    initMatrixRain();
  }

  if (dustLayerEl) {
    dustLayerEl.width = rect.width * dpr;
    dustLayerEl.height = rect.height * dpr;
    dustLayerEl.style.width = rect.width + "px";
    dustLayerEl.style.height = rect.height + "px";
  }
};

window.addEventListener("resize", resizeCanvases);

resizeCanvases();

window.matrixCols = [];

window.matrixCtx = null;

window.matrixActive = true;

window.initMatrixRain = function initMatrixRain() {
  if (!matrixLayer) return;
  matrixCtx = matrixLayer.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const fontSize = 16 * dpr;
  const columns = Math.floor(matrixLayer.width / fontSize);

  // Initialize drops if they haven't been or if the number of columns changed significantly
  if (
    !matrixCols ||
    matrixCols.length === 0 ||
    Math.abs(matrixCols.length - columns) > 5
  ) {
    matrixCols = [];
    for (let i = 0; i < columns; i++) {
      matrixCols[i] = Math.random() * -100; // Start off-screen
    }
  }
};

window.drawMatrix = function drawMatrix() {
  if (!matrixLayer || !matrixCtx || !matrixActive) return;

  const dpr = window.devicePixelRatio || 1;
  const fontSize = 16 * dpr;

  // Draw a semi-transparent black rectangle to create the fade effect
  matrixCtx.fillStyle = "rgba(0, 0, 0, 0.05)";
  matrixCtx.fillRect(0, 0, matrixLayer.width, matrixLayer.height);

  matrixCtx.fillStyle = "#0f0"; // Basic green, will be overridden
  matrixCtx.font = fontSize + 'px "JetBrains Mono", monospace';
  matrixCtx.textAlign = "center";

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?";

  for (let i = 0; i < matrixCols.length; i++) {
    const text = chars.charAt(Math.floor(Math.random() * chars.length));
    const x = i * fontSize + fontSize / 2;
    const y = matrixCols[i] * fontSize;

    // Random cyan/green colors
    const hue = 160 + Math.random() * 40; // 160-200 cyan/green
    const lightness = 40 + Math.random() * 40; // 40-80%
    matrixCtx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;

    // First character brighter
    if (Math.random() > 0.95) {
      matrixCtx.fillStyle = "#fff";
    }

    matrixCtx.fillText(text, x, y);

    // Reset drop to top randomly
    if (y > matrixLayer.height && Math.random() > 0.975) {
      matrixCols[i] = 0;
    }

    matrixCols[i] += 0.5 + Math.random() * 0.5; // Varying speeds
  }
};

window.bgLayer = null;

window.fgLayer = null;

window.raindrops = null;

window._staticBgImg = null;

window._staticFgImg = null;

window._usingCabinetBg = false;

window.awaitImage = function awaitImage(src) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  return new Promise((resolve) => {
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
  });
};

window.dustCtx = null;

window.dustParticles = [];

window.initDust = function initDust() {
  if (!dustLayerEl) return;
  dustCtx = dustLayerEl.getContext("2d");
  const count = 100;
  for (let i = 0; i < count; i++) {
    dustParticles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.2,
    });
  }
};

window.drawDust = function drawDust(time) {
  if (!dustCtx || !dustLayerEl) return;

  dustCtx.clearRect(0, 0, dustLayerEl.width, dustLayerEl.height);

  // Parallax logic based on mouse CSS vars
  const mxStr = document.body.style.getPropertyValue("--mouse-x");
  const myStr = document.body.style.getPropertyValue("--mouse-y");
  const mx = mxStr ? parseFloat(mxStr) : window.innerWidth / 2;
  const my = myStr ? parseFloat(myStr) : window.innerHeight / 2;

  const pX = mx / window.innerWidth - 0.5;
  const pY = my / window.innerHeight - 0.5;

  // Intensity modifier based on typing
  const intensity =
    1 + (typeof stormCharCount !== "undefined" ? stormCharCount * 0.05 : 0);

  const dpr = window.devicePixelRatio || 1;

  dustCtx.fillStyle = "#00e5ff"; // Holographic blue

  dustParticles.forEach((p, i) => {
    // Slow drift
    p.x += p.speedX * intensity;
    p.y += p.speedY * intensity;

    // Mouse parallax
    const finalX = p.x - pX * 50 * ((i % 3) + 1);
    const finalY = p.y - pY * 50 * ((i % 3) + 1);

    // Wrap around
    if (p.x > window.innerWidth) p.x = 0;
    if (p.x < 0) p.x = window.innerWidth;
    if (p.y > window.innerHeight) p.y = 0;
    if (p.y < 0) p.y = window.innerHeight;

    dustCtx.globalAlpha = p.opacity + Math.sin(time * 0.002 + i) * 0.2; // Twinkle

    dustCtx.beginPath();
    dustCtx.arc(finalX * dpr, finalY * dpr, p.size * dpr, 0, Math.PI * 2);
    dustCtx.fill();
  });
  dustCtx.globalAlpha = 1.0;
};
