import { monaco } from "./editor/setupMonaco.js";
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
window.referenceManager = new ReferenceManager(
  referenceLayer,
  referenceOverlay,
  monaco,
);
window.connectionManager = new ConnectionManager(
  connectionsCanvas,
  referenceManager,
);
window.fogManager = new FogManager(fogLayerEl);
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
window._urlNote = new URLSearchParams(window.location.search).get("note");
window.holoManager = new HoloManager(editor, holoLayerEl);
window.storageAPI = new StorageAPI();
const cabinetPreserveDrawingBuffer =
  new URLSearchParams(window.location.search).get("cabinetPreserveBuffer") ===
  "1";
window.cabinet3D = new Cabinet3D(storageAPI, tabManager, monaco, {
  preserveDrawingBuffer: cabinetPreserveDrawingBuffer,
});
window.veilExcavator = new VeilExcavator(tabManager);
window.cabinetBtn = document.getElementById("btn-cabinet");
window.vpsBrowser = new VPSFileBrowser(storageAPI, tabManager);
window.vpsOpenBtn = document.getElementById("btn-vps-open");
window.vpsSaveBtn = document.getElementById("btn-vps-save");
window.matrixCols = [];
window.matrixCtx = null;
window.matrixActive = true;
window.bgLayer = null;
window.fgLayer = null;
window.raindrops = null;
window._staticBgImg = null;
window._staticFgImg = null;
window._usingCabinetBg = false;
window.dustCtx = null;
window.dustParticles = [];
window.rainEffects = {
  // Each entry: { x, y, r, life } — life counts down in frames
  clears: [],
  // Each entry: { x0, y0, x1, y1, r, frame, totalFrames }
  wipes: [],

  addClear(x, y, r, life = 4) {
    // If we already have a clear near this position, refresh it instead of stacking
    for (const c of this.clears) {
      if (Math.abs(c.x - x) < r * 0.5 && Math.abs(c.y - y) < r * 0.5) {
        c.x = x;
        c.y = y;
        c.r = r;
        c.life = life;
        return;
      }
    }
    this.clears.push({ x, y, r, life });
  },

  // Sweep a horizontal wipe across a rect (used on tab open / file open)
  addWipe(rect, totalFrames = 45) {
    this.wipes.push({
      x0: rect.left,
      y0: rect.top,
      x1: rect.right,
      y1: rect.bottom,
      r: (rect.bottom - rect.top) * 0.55,
      frame: 0,
      totalFrames,
    });
  },

  tick(drops) {
    if (!drops) return;

    // Process persistent clear spots
    this.clears = this.clears.filter((c) => c.life > 0);
    for (const c of this.clears) {
      drops.clearDroplets(c.x, c.y, c.r);
      c.life--;
    }

    // Process wipe animations
    this.wipes = this.wipes.filter((w) => w.frame < w.totalFrames);
    for (const w of this.wipes) {
      const t = w.frame / w.totalFrames;
      const cx = w.x0 + (w.x1 - w.x0) * t;
      const cy = (w.y0 + w.y1) / 2;
      drops.clearDroplets(cx, cy, w.r);
      w.frame++;
    }
  },
};
window.isFlashlightActive = false;
window.isAltDragActive = false;
window.altDragStartX = 0;
window.altDragStartY = 0;
window.sceneRotX = 0;
window.sceneRotY = 0;
window.currentSceneRotX = 0;
window.currentSceneRotY = 0;
window.isWormholeActive = false;
window.holographicMinimap = null;
window.isTesseractDragging = false;
window.tesseractLastX = 0;
window.tesseractLastY = 0;
window.tesseractRotX = 0;
window.tesseractRotY = 0;
window.btnDepthForward = document.getElementById("btn-depth-forward");
window.btnDepthBack = document.getElementById("btn-depth-back");
window.viewModeSelect = document.getElementById("view-mode-select");
window.theaterToggle = document.getElementById("theater-mode");
window.autofocusToggle = document.getElementById("cinematic-autofocus-mode");
window.isAutofocusActive = false;
window.autofocusTargetZ = 0;
window.autofocusCurrentZ = 0;
window.autofocusRafId = null;
window.opacitySlider = document.getElementById("editor-opacity");
window.lastScrollTop = 0;
window.lastScrollTime = performance.now();
window.intensitySlider = document.getElementById("storm-intensity");
window.focusMode = false;
window.lanternToggle = document.getElementById("lantern-mode");
window.wiperMode = false;
window.wiperAnimationId = null;
window.wiperX = 0;
window.wiperDirection = 1;
window.wiperToggle = document.getElementById("wiper-mode");
window.exposeToggle = document.getElementById("expose-mode");
window.portalToggle = document.getElementById("portal-mode-toggle");
window.ghostMode = false;
window.ghostTimer = null;
window.ghostToggle = document.getElementById("ghost-mode");
window.isCinematicAutofocusActive = false;
window.currentCinematicZ = 0;
window.targetCinematicZ = 0;
window.cinematicAnimationId = null;
window.cinematicToggle = document.getElementById("cinematic-autofocus-mode");
window.lightningLayer = document.getElementById("lightning-layer");
window.referenceInput = document.getElementById("reference-input");
window.globalSearch = document.getElementById("global-search");
window.userPreferredDepth = 1.0;
window.isAltDown = false;
window.zCameraOffset = 0;
window.isLensMode = false;
window.themeSelect = document.getElementById("theme-select");
window.dock = document.getElementById("dock");
window.dockToggle = document.getElementById("dock-toggle");
window.stormCharCount = 0;
window.STORM_decay = 4;
window.STORM_heavy = 30;
window.STORM_intense = 80;
window.lastShiftTime = 0;
window.sonarActive = false;
window.sonarStartTime = 0;
window.sonarX = 0;
window.sonarY = 0;
window.cachedSonarTargets = [];
window.btnSonar = document.getElementById("btn-sonar-ping");
window.btnZScan = document.getElementById("btn-z-scan");
window.btnBlackHole = document.getElementById("btn-black-hole-view");
window.portalLines = [];
window.isPeelActive = false;
window.isFanningActive = false;
window.isPortalModeActive = false;
window.isExplodeViewActive = false;
window.btnExplode = document.getElementById("btn-explode-view");
