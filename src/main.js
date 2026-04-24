import * as monaco from 'monaco-editor';
// Force-include common Monaco language contributions so Rollup bundles them
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.js';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.js';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import 'monaco-editor/esm/vs/basic-languages/html/html.js';
import 'monaco-editor/esm/vs/basic-languages/css/css.js';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.js';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  }
};

import RainLayer from './RainLayer';
import Raindrops from './vendor/raindrops.js';
import { ReferenceManager } from './ReferenceManager.js'; // New import
import { ConnectionManager } from './ConnectionManager.js';
import { FogManager } from './FogManager.js';
import { HoloManager } from './HoloManager.js';
import { TabManager } from './TabManager.js';
import { StorageAPI } from './StorageAPI.js';
import { Cabinet3D } from './Cabinet3D.js';
import { VPSFileBrowser } from './VPSFileBrowser.js';
import backFrag from './shaders/water-back.frag?glslify';
import frontFrag from './shaders/water.frag?glslify';
import vertSrc from './shaders/simple.vert?glslify';

const editorEl = document.getElementById('editor');
const backCanvas = document.getElementById('rain-back');
const frontCanvas = document.getElementById('rain-front');
const connectionsCanvas = document.getElementById('connections-layer');
const matrixLayer = document.getElementById('matrix-layer');
const referenceLayer = document.getElementById('reference-layer');
const referenceOverlay = document.getElementById('reference-overlay');
const holoLayerEl = document.getElementById('holo-layer');
const echoLayerEl = document.getElementById('echo-layer');
const dustLayerEl = document.getElementById('dust-layer');
const fogLayerEl = document.getElementById('fog-layer');
const vignetteLayer = document.getElementById('vignette-layer'); // Added
const neonScatterLayer = document.getElementById('neon-scatter-layer');

// Create Portal Visual Layer
const portalLayer = document.getElementById('portal-visuals') || document.createElement('div');
portalLayer.id = 'portal-visuals';
portalLayer.style.position = 'absolute';
portalLayer.style.inset = '0';
portalLayer.style.pointerEvents = 'none';
portalLayer.style.zIndex = '3'; // Above editor
if (document.getElementById('container') && !portalLayer.parentElement) {
    document.getElementById('container').appendChild(portalLayer);
}

// Initialize Managers
const referenceManager = new ReferenceManager(referenceLayer, referenceOverlay, monaco);
const connectionManager = new ConnectionManager(connectionsCanvas, referenceManager);
referenceManager.setConnectionManager(connectionManager);
const fogManager = new FogManager(fogLayerEl);
referenceManager.setFogManager(fogManager);

let focusDepth = 0; // 0 = Editor, 1 = Reference
let isMagnifierMode = false; // Magnifier tool state

// Initial Text
const INITIAL_MARKDOWN = `# REFERENCE LAYER
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

// create Monaco editor (no initial value — TabManager will supply the first model)
monaco.editor.defineTheme('transparent-vs-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '556677', fontStyle: 'italic' },
    { token: 'keyword', foreground: '00e5ff', fontStyle: 'bold' }
  ],
  colors: {
    'editor.background': '#00000000',
    'editor.lineHighlightBackground': '#00e5ff11',
    'editorCursor.foreground': '#00e5ff',
    'editor.selectionBackground': '#00e5ff44'
  }
});

const editor = monaco.editor.create(editorEl, {
  theme: 'transparent-vs-dark',
  automaticLayout: true,
  fontFamily: 'JetBrains Mono',
  fontSize: 14,
  minimap: { enabled: false },
  scrollbar: {
    vertical: 'hidden',
    horizontal: 'hidden'
  }
});

// Initialize TabManager
const tabsContainerEl = document.getElementById('tabs-container');
const imageViewerEl = document.getElementById('image-viewer');
const tabManager = new TabManager(editor, monaco, editorEl, tabsContainerEl, imageViewerEl, echoLayerEl);

// Add the initial demo file and make it active (depth 1 = middle, between rain layers)
const INITIAL_CODE = ['// rain-2 demo','function hello(){','  console.log("hello world");','}','','// @portal'].join('\n');
const initialFileId = tabManager.addFile('main.js', INITIAL_CODE, 'javascript');
tabManager.setActive(initialFileId);

// Check for ?note= URL param — load named note on startup
const _urlNote = new URLSearchParams(window.location.search).get('note');
if (_urlNote) {
  tabManager.openNoteAsTab(_urlNote);
}

// Initialize HoloManager
const holoManager = new HoloManager(editor, holoLayerEl);

// Initialize 3D File Cabinet
const storageAPI = new StorageAPI();
const cabinet3D  = new Cabinet3D(storageAPI, tabManager);
const cabinetBtn = document.getElementById('btn-cabinet');
if (cabinetBtn) {
  cabinetBtn.addEventListener('click', () => cabinet3D.toggle());
}

// Initialize VPS File Browser
const vpsBrowser = new VPSFileBrowser(storageAPI, tabManager);

const vpsOpenBtn = document.getElementById('btn-vps-open');
if (vpsOpenBtn) {
  vpsOpenBtn.addEventListener('click', () => vpsBrowser.open());
}

const vpsSaveBtn = document.getElementById('btn-vps-save');
if (vpsSaveBtn) {
  vpsSaveBtn.addEventListener('click', () => _triggerVpsSave());
}

/** Save the active tab to VPS. If already tagged with a vpsPath, saves directly; otherwise opens save-as panel. */
async function _triggerVpsSave() {
  const activeFile = tabManager.files.find(f => f.id === tabManager.activeId);
  if (!activeFile) return;

  if (activeFile.vpsPath) {
    // Direct save — re-upload to the same VPS path
    const content = activeFile.model
      ? activeFile.model.getValue()
      : (activeFile.content || '');

    document.body.style.cursor = 'wait';
    try {
      const result = await storageAPI.saveVPSFile(activeFile.vpsPath, content);
      if (result) {
        // Brief visual confirmation on the save button
        if (vpsSaveBtn) {
          const orig = vpsSaveBtn.textContent;
          vpsSaveBtn.textContent = '✅ Saved!';
          setTimeout(() => { vpsSaveBtn.textContent = orig; }, 1500);
        }
      } else {
        vpsBrowser.open();
        vpsBrowser.openSaveMode(activeFile.name || 'untitled.txt',
          activeFile.vpsPath.split('/').slice(0, -1).join('/'));
      }
    } catch (err) {
      console.error('[VPSFileBrowser] save error, opening save dialog:', err);
      vpsBrowser.openSaveMode(activeFile.name || 'untitled.txt');
    } finally {
      document.body.style.cursor = 'default';
    }
  } else {
    // Unknown VPS path — open the save-as browser
    vpsBrowser.openSaveMode(activeFile.name || 'untitled.txt');
  }
}

// Listen for 3D Cabinet file cube clicks with depth focus logic
window.addEventListener('fileCubeClicked', async (e) => {
  const { id, type, name } = e.detail;
  
  console.log(`Fetching ${type}: ${name}...`);
  // Show loading cursor
  document.body.style.cursor = 'wait';

  try {
    // 1. Fetch the code/json from the backend
    const fileData = await storageAPI.getFileContent(id, type);
    
    // 2. Add it to the Tab Manager
    const newFileId = tabManager.addFile(name, fileData.content, fileData.language);

    // Tag the new file with its cabinet origin so save logic can route correctly
    const newFile = tabManager.files.find(f => f.id === newFileId);
    if (newFile) {
      newFile.cabinetType = type;
      newFile.cabinetId = id;
      if (type === 'notes') {
        newFile.noteName = id;
      }
    }
    
    // 3. DEPTH FOCUS LOGIC (The Immersive Step)
    // Push all current tabs backward into the rain (Depth 1)
    tabManager.files.forEach(file => {
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
    console.error('Failed to load file:', error);
    alert(`Failed to load ${name}. Check console for details.`);
  } finally {
    document.body.style.cursor = 'default';
  }
});

// set canvas size to match editor area
function resizeCanvases(){
  const rect = editorEl.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  backCanvas.width = rect.width * dpr;
  backCanvas.height = rect.height * dpr;
  backCanvas.style.width = rect.width + 'px';
  backCanvas.style.height = rect.height + 'px';

  frontCanvas.width = rect.width * dpr;
  frontCanvas.height = rect.height * dpr;
  frontCanvas.style.width = rect.width + 'px';
  frontCanvas.style.height = rect.height + 'px';

  if (matrixLayer) {
    matrixLayer.width = rect.width * dpr;
    matrixLayer.height = rect.height * dpr;
    matrixLayer.style.width = rect.width + 'px';
    matrixLayer.style.height = rect.height + 'px';
    initMatrixRain();
  }

  if (dustLayerEl) {
    dustLayerEl.width = rect.width * dpr;
    dustLayerEl.height = rect.height * dpr;
    dustLayerEl.style.width = rect.width + 'px';
    dustLayerEl.style.height = rect.height + 'px';
  }
}
window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// --- Matrix Rain Logic ---
var matrixCols = [];
var matrixCtx = null;
var matrixActive = true;

function initMatrixRain() {
  if (!matrixLayer) return;
  matrixCtx = matrixLayer.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const fontSize = 16 * dpr;
  const columns = Math.floor(matrixLayer.width / fontSize);

  // Initialize drops if they haven't been or if the number of columns changed significantly
  if (!matrixCols || matrixCols.length === 0 || Math.abs(matrixCols.length - columns) > 5) {
      matrixCols = [];
      for (let i = 0; i < columns; i++) {
        matrixCols[i] = Math.random() * -100; // Start off-screen
      }
  }
}

function drawMatrix() {
    if (!matrixLayer || !matrixCtx || !matrixActive) return;

    const dpr = window.devicePixelRatio || 1;
    const fontSize = 16 * dpr;

    // Draw a semi-transparent black rectangle to create the fade effect
    matrixCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    matrixCtx.fillRect(0, 0, matrixLayer.width, matrixLayer.height);

    matrixCtx.fillStyle = '#0f0'; // Basic green, will be overridden
    matrixCtx.font = fontSize + 'px "JetBrains Mono", monospace';
    matrixCtx.textAlign = 'center';

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?';

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
            matrixCtx.fillStyle = '#fff';
        }

        matrixCtx.fillText(text, x, y);

        // Reset drop to top randomly
        if (y > matrixLayer.height && Math.random() > 0.975) {
            matrixCols[i] = 0;
        }

        matrixCols[i] += 0.5 + Math.random() * 0.5; // Varying speeds
    }
}

// create layers (async init)
let bgLayer = null;
let fgLayer = null;
let raindrops = null;

// helper to load image (tries to reuse parent repo assets)
function awaitImage(src){
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  return new Promise((resolve) => { img.onload = () => resolve(img); img.onerror = () => resolve(img); });
}

// --- Holographic Dust System ---
let dustCtx = null;
const dustParticles = [];
function initDust() {
    if (!dustLayerEl) return;
    dustCtx = dustLayerEl.getContext('2d');
    const count = 100;
    for (let i = 0; i < count; i++) {
        dustParticles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: Math.random() * 2 + 0.5,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.5 + 0.2
        });
    }
}

function drawDust(time) {
    if (!dustCtx || !dustLayerEl) return;

    dustCtx.clearRect(0, 0, dustLayerEl.width, dustLayerEl.height);

    // Parallax logic based on mouse CSS vars
    const mxStr = document.body.style.getPropertyValue('--mouse-x');
    const myStr = document.body.style.getPropertyValue('--mouse-y');
    const mx = mxStr ? parseFloat(mxStr) : window.innerWidth / 2;
    const my = myStr ? parseFloat(myStr) : window.innerHeight / 2;

    const pX = (mx / window.innerWidth) - 0.5;
    const pY = (my / window.innerHeight) - 0.5;

    // Intensity modifier based on typing
    const intensity = 1 + (typeof stormCharCount !== 'undefined' ? stormCharCount * 0.05 : 0);

    const dpr = window.devicePixelRatio || 1;

    dustCtx.fillStyle = '#00e5ff'; // Holographic blue

    dustParticles.forEach((p, i) => {
        // Slow drift
        p.x += p.speedX * intensity;
        p.y += p.speedY * intensity;

        // Mouse parallax
        const finalX = p.x - (pX * 50 * (i % 3 + 1));
        const finalY = p.y - (pY * 50 * (i % 3 + 1));

        // Wrap around
        if (p.x > window.innerWidth) p.x = 0;
        if (p.x < 0) p.x = window.innerWidth;
        if (p.y > window.innerHeight) p.y = 0;
        if (p.y < 0) p.y = window.innerHeight;

        dustCtx.globalAlpha = p.opacity + (Math.sin(time * 0.002 + i) * 0.2); // Twinkle

        dustCtx.beginPath();
        dustCtx.arc(finalX * dpr, finalY * dpr, p.size * dpr, 0, Math.PI * 2);
        dustCtx.fill();
    });
    dustCtx.globalAlpha = 1.0;
}

async function initLayers(){
  initDust();
  // load texture and drop images; attempt to use copied public images first
  const bgImg = await awaitImage('./img/texture-rain-bg.png') || await awaitImage('/ra1n/img/weather/texture-rain-bg.png');
  const fgImg = await awaitImage('./img/texture-rain-fg.png') || await awaitImage('/ra1n/img/weather/texture-rain-fg.png');
  const dropAlpha = await awaitImage('./img/drop-alpha.png') || await awaitImage('/ra1n/img/drop-alpha.png');
  const dropColor = await awaitImage('./img/drop-color.png') || await awaitImage('/ra1n/img/drop-color.png');

  const dpi = window.devicePixelRatio || 1;
  raindrops = new Raindrops(backCanvas.width, backCanvas.height, dpi, dropAlpha, dropColor);

  if (referenceManager) {
    referenceManager.setRaindrops(raindrops);
  }

  const options = {
    u_brightness: 1.0,
    u_alphaMultiply: 6.0,
    u_alphaSubtract: 5.0,
    u_minRefraction: 256.0,
    u_refractionDelta: 24.0,
    u_renderShine: false,
    u_renderShadow: true,
    u_parallaxFg: 20.0,
    u_parallaxBg: 5.0,
    u_textureRatio: bgImg.width / bgImg.height,
  };
  bgLayer = new RainLayer(backCanvas, { vertex: vertSrc, fragment: backFrag, textures: { u_waterMap: raindrops.canvas, u_textureBg: bgImg }, options: { u_brightness: 1.0 } });
  fgLayer = new RainLayer(frontCanvas, { vertex: vertSrc, fragment: frontFrag, textures: { u_waterMap: raindrops.canvas, u_textureFg: fgImg, u_textureBg: bgImg }, options });

  // Pass raindrops to reference manager for shield effect
  if (referenceManager) {
      referenceManager.setRaindrops(raindrops);
  }

  // simple animation loop
  function animate(){
    raindrops.update(); // updates raindrops.canvas internally
    // update texture bindings from the raindrops canvas
    if(bgLayer) bgLayer.bindTexture('u_waterMap', raindrops.canvas);
    if(fgLayer) fgLayer.bindTexture('u_waterMap', raindrops.canvas);

    const time = performance.now() / 1000;
    if (connectionManager) {
        connectionManager.draw(time);
        connectionManager.drawRadar(time);
    }

    if (referenceManager) {
        referenceManager.render(time);
    }

    // Rain Shield (Focus)
    if (referenceManager) {
        const rect = referenceManager.getFocusedNoteRect();
        if (rect) {
            // Clear slightly larger area
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const radius = Math.max(rect.width, rect.height) / 1.8;
            raindrops.clearDroplets(cx, cy, radius);
        }
    }

    if(bgLayer) bgLayer.render();
    if(fgLayer) fgLayer.render();

    if(fogManager) fogManager.render();
    drawMatrix();
    drawDust(time);
    requestAnimationFrame(animate);
  }

  animate();
}

initLayers();

// parallax from mouse
let isFlashlightActive = false;

let isAltDragActive = false;
let altDragStartX = 0;
let altDragStartY = 0;
let sceneRotX = 0;
let sceneRotY = 0;
let currentSceneRotX = 0;
let currentSceneRotY = 0;

document.addEventListener('mousedown', (e) => {
    // Middle mouse button activates Flashlight mode
    if (e.button === 1) {
        isFlashlightActive = true;
        e.preventDefault(); // Prevent default middle-click scroll behavior
    }

    if (e.altKey && e.button === 0) { // Left click + Alt
        isAltDragActive = true;
        altDragStartX = e.clientX;
        altDragStartY = e.clientY;
        currentSceneRotX = sceneRotX;
        currentSceneRotY = sceneRotY;
        e.preventDefault(); // Prevent text selection while dragging
    }
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 1) {
        isFlashlightActive = false;
    }

    if (e.button === 0) {
        isAltDragActive = false;
    }
});

let isWormholeActive = false;

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey) {
        isWormholeActive = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Control' || e.key === 'Alt') {
        if (!e.ctrlKey || !e.altKey) {
            isWormholeActive = false;
            if (echoLayerEl) {
                const echoes = echoLayerEl.querySelectorAll('.echo-document');
                echoes.forEach((echo) => {
                    echo.style.removeProperty('--wormhole-tx');
                    echo.style.removeProperty('--wormhole-ty');
                    echo.style.removeProperty('--wormhole-tz');
                    echo.style.removeProperty('--wormhole-scale');
                });
            }
        }
    }
});


// Clear gravitational cache on resize
window.addEventListener('resize', () => {
  const dockEl = document.getElementById('dock');
  const tabsEl = document.getElementById('tabs-container');
  if (dockEl) dockEl._origRect = null;
  if (tabsEl) tabsEl._origRect = null;
});

document.addEventListener('mousemove', (e) => {

  // Gravitational Cursor Tracking for UI Elements (Dock & Tabs)
  const mx = e.clientX;
  const my = e.clientY;

  // Track cursor position globally for CSS effects
  document.body.style.setProperty('--mouse-x', `${mx}px`);
  document.body.style.setProperty('--mouse-y', `${my}px`);

  // Define UI elements that exert "gravity"
  const dockEl = document.getElementById('dock');
  const tabsEl = document.getElementById('tabs-container');

  const applyGravity = (element, maxDist, strength) => {
    if (!element) return;

    // Cache original rect to avoid layout thrashing and feedback loops
    if (!element._origRect) {
        // Temporarily remove transform to get true original position
        const currentTransform = element.style.transform;
        element.style.transform = 'none';
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
      element.style.boxShadow = ''; // Reset to class defaults
    }
  };

  applyGravity(dockEl, 300, 0.05); // 300px radius, weak pull
  applyGravity(tabsEl, 200, 0.03); // 200px radius, weaker pull

  // 3D Parallax on Active Editor
  const activeEditorEl = document.getElementById('editor');

  // Exclude parallax effect when any active view modes that use transforms are enabled.
  const activeViewsClasses = Array.from(document.body.classList).filter(c => c.endsWith('-active'));

  if (activeEditorEl && activeViewsClasses.length === 0) {
      const xOffset = (e.clientX / window.innerWidth - 0.5) * 20; // max +/- 10px shift
      const yOffset = (e.clientY / window.innerHeight - 0.5) * 20;
      const rotateX = (e.clientY / window.innerHeight - 0.5) * -5; // max +/- 2.5 deg tilt
      const rotateY = (e.clientX / window.innerWidth - 0.5) * 5;

      // We use CSS variables to play nicely with default position/transforms.
      activeEditorEl.style.setProperty('--px', `${xOffset}px`);
      activeEditorEl.style.setProperty('--py', `${yOffset}px`);
      activeEditorEl.style.setProperty('--rx', `${rotateX}deg`);
      activeEditorEl.style.setProperty('--ry', `${rotateY}deg`);

      // Parallax the dock slightly as well
      const dockEl = document.getElementById('dock');
      if (dockEl) {
          dockEl.style.setProperty('--rx', `${rotateX * 0.5}deg`);
          dockEl.style.setProperty('--ry', `${rotateY * 0.5}deg`);
      }
  } else if (activeEditorEl) {
      // Reset variables if a view mode is active
      activeEditorEl.style.removeProperty('--px');
      activeEditorEl.style.removeProperty('--py');
      activeEditorEl.style.removeProperty('--rx');
      activeEditorEl.style.removeProperty('--ry');

      const dockEl = document.getElementById('dock');
      if (dockEl) {
          dockEl.style.removeProperty('--rx');
          dockEl.style.removeProperty('--ry');
      }
  }

  // Gravitational Wormhole (Ctrl + Alt)
  if (isWormholeActive && echoLayerEl) {
      const echoes = echoLayerEl.querySelectorAll('.echo-document');
      echoes.forEach(echo => {
          const rect = echo.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;

          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 300;
          if (dist < maxDist) {
              const pull = 1 - (dist / maxDist); // 0 to 1
              const pullFactor = Math.pow(pull, 2); // stronger near center

              echo.style.setProperty('--wormhole-tx', `${dx * pullFactor * 0.8}px`);
              echo.style.setProperty('--wormhole-ty', `${dy * pullFactor * 0.8}px`);
              echo.style.setProperty('--wormhole-tz', `${pullFactor * 150}px`); // pull forward
              echo.style.setProperty('--wormhole-scale', `${1 + pullFactor * 0.2}`);
          } else {
              echo.style.setProperty('--wormhole-tx', '0px');
              echo.style.setProperty('--wormhole-ty', '0px');
              echo.style.setProperty('--wormhole-tz', '0px');
              echo.style.setProperty('--wormhole-scale', '1');
          }
      });
  }

  if (typeof isPeelActive !== 'undefined' && isPeelActive && echoLayerEl && !tabManager.isCascadeView && !tabManager.isOrbitView && !tabManager.isScatteredView && !tabManager.isIsometricView && !tabManager.isStackView && !tabManager.isTunnelView && !tabManager.isGridView && !tabManager.isHelixView && !tabManager.isPinboardView && !tabManager.isVortexView && !tabManager.isConstellationView && !tabManager.isPrismView && !tabManager.isCoverflowView && !tabManager.isWaveView && !tabManager.isSphereView) {
      // Calculate peel factor based on mouse Y
      const pctY = e.clientY / window.innerHeight; // 0 to 1
      const echoes = echoLayerEl.querySelectorAll('.echo-document');

      echoes.forEach((echo, index) => {
          if (echo.classList.contains('peek')) return;

          // Fan them out vertically and push back slightly less
          const targetY = (pctY - 0.5) * 800 * (index + 1); // Spread
          const baseTz = -(index + 1) * 50;
          const targetZ = baseTz + (pctY * 150); // Pull forward as you fan
          const targetRotX = (pctY - 0.5) * 40; // Tilt

          echo.style.setProperty('--peel-ty', `${targetY}px`);
          echo.style.setProperty('--peel-tz', `${targetZ}px`);
          echo.style.setProperty('--peel-rot-x', `${targetRotX}deg`);
      });
  }

  const rect = editorEl.getBoundingClientRect();
  const x = ( (e.clientX - rect.left) / rect.width ) * 2 - 1;
  const y = ( (e.clientY - rect.top) / rect.height ) * 2 - 1;

  // 3D Free-Cam Logic
  if (isAltDragActive && echoLayerEl) {
      const deltaX = e.clientX - altDragStartX;
      const deltaY = e.clientY - altDragStartY;

      // Sensitivity of rotation
      sceneRotY = currentSceneRotY + (deltaX * 0.5);
      sceneRotX = currentSceneRotX - (deltaY * 0.5);

      echoLayerEl.style.transform = `rotateX(${sceneRotX}deg) rotateY(${sceneRotY}deg)`;
      // Continue to next handlers but maybe skip some parallax to avoid conflict
  }

  // Flashlight Effect: clear a large area of fog
  if (isFlashlightActive && fogManager) {
      fogManager.clearFogAt(e.clientX, e.clientY, 250);
  }
  if(bgLayer) bgLayer.setParallax(x*0.4, y*0.4);
  if(fgLayer) fgLayer.setParallax(x, y);

  // Update fog mask position for "wiping" effect
  if (fogManager) {
    fogManager.clearFogAt(e.clientX, e.clientY, 60);
  }

  // Update CSS variables for X-Ray and Lantern
  document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
  document.body.style.setProperty('--mouse-y', `${e.clientY}px`);

  // Update Neon Scatter Layer position
  if (neonScatterLayer) {
    neonScatterLayer.style.setProperty('--mouse-x', `${e.clientX}px`);
    neonScatterLayer.style.setProperty('--mouse-y', `${e.clientY}px`);
  }

  // Parallax for Echo Layers (Ghost Documents)
  if (echoLayerEl && !tabManager.isCascadeView) {
    const echoes = echoLayerEl.querySelectorAll('.echo-document');

    if (tabManager.isOrbitView) {
      // Rotate entire echo layer based on horizontal mouse position
      const orbitRot = -x * 360;
      echoLayerEl.style.setProperty('--orbit-global-rot', `${orbitRot}deg`);
    }

    if (tabManager.isHelixView) {
      // Rotate entire echo layer based on horizontal mouse position
      const helixRot = -x * 360;
      echoLayerEl.style.setProperty('--helix-global-rot', `${helixRot}deg`);
    }

    echoes.forEach((echo, index) => {
      // Don't apply parallax if peeking (handled by CSS)
      if (echo.classList.contains('peek')) return;

      const depthOffset = (index + 1) * 2;
      const moveX = -x * 20 * depthOffset;
      const moveY = -y * 20 * depthOffset;

      echo.style.setProperty('--tx', `${depthOffset * 2 + moveX}px`);
      echo.style.setProperty('--ty', `${depthOffset * 2 + moveY}px`);

      // Holographic Tilt
      const rotX = y * 5 * depthOffset;
      const rotY = -x * 5 * depthOffset;
      echo.style.setProperty('--rot-x', `${rotX}deg`);
      echo.style.setProperty('--rot-y', `${rotY}deg`);
    });

    // Magnifying Glass Logic
    if (isMagnifierMode) {
      echoes.forEach(echo => {
        const echoRect = echo.getBoundingClientRect();
        const centerX = echoRect.left + echoRect.width / 2;
        const centerY = echoRect.top + echoRect.height / 2;
        const dist = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));

        if (dist < 300) {
          echo.classList.add('magnifier-active');
          // Update internal mouse coordinates relative to the echo document for the radial mask
          const rect = echo.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          echo.style.setProperty('--mouse-x', `${x}px`);
          echo.style.setProperty('--mouse-y', `${y}px`);
        } else {
          echo.classList.remove('magnifier-active');
        }
      });
    }
    // Proximity Wake Logic
    echoes.forEach(echo => {
      // Skip if peeking or magnifier is active, let CSS handle it completely
      if (echo.classList.contains('peek') || echo.classList.contains('magnifier-active') || echo.classList.contains('is-peeking')) {
          echo.style.removeProperty('--wake-dist');
          return;
      }

      const rect = echo.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dist = Math.sqrt(Math.pow(e.clientX - cx, 2) + Math.pow(e.clientY - cy, 2));

      // Calculate a value from 0 (far) to 1 (cursor is dead center) based on a radius
      const maxDist = 400; // How far the proximity wake reaches
      let wakeFactor = 0;
      if (dist < maxDist) {
         wakeFactor = 1 - (dist / maxDist);
         // Ease the wake factor so it's smooth
         wakeFactor = Math.pow(wakeFactor, 1.5);
      }

      echo.style.setProperty('--wake-factor', wakeFactor.toFixed(3));

      // Local mouse coords for Holographic Foil logic
      if (dist < maxDist) {
        const pctX = ((e.clientX - rect.left) / rect.width) * 100;
        const pctY = ((e.clientY - rect.top) / rect.height) * 100;
        echo.style.setProperty('--foil-x', `${pctX}%`);
        echo.style.setProperty('--foil-y', `${pctY}%`);
      }

      // Echo Wave Distortion
      if (dist < 150 && !echo.classList.contains('echo-wave-distortion')) {
          echo.classList.add('echo-wave-distortion');
          setTimeout(() => {
              echo.classList.remove('echo-wave-distortion');
          }, 500);
      }

      // Neon Tracing logic
      if (wakeFactor > 0.5) {
         echo.classList.add('neon-tracing');
      } else {
         echo.classList.remove('neon-tracing');
      }
    });
}
});

document.addEventListener('mousedown', (e) => {
    if (raindrops) {
        raindrops.splash(e.clientX, e.clientY, 5);
    }
});

// --- Kinetic Ripple Interaction ---
document.addEventListener('dblclick', (e) => {
    if (echoLayerEl) {
        const echoes = echoLayerEl.querySelectorAll('.echo-document');
        const cx = e.clientX;
        const cy = e.clientY;

        echoes.forEach(echo => {
            const rect = echo.getBoundingClientRect();
            const eCx = rect.left + rect.width / 2;
            const eCy = rect.top + rect.height / 2;
            const dist = Math.sqrt(Math.pow(cx - eCx, 2) + Math.pow(cy - eCy, 2));

            // Wave propagates outwards
            const delay = dist * 1.5;

            setTimeout(() => {
                echo.classList.remove('kinetic-ripple-hit');
                void echo.offsetWidth; // Force reflow
                echo.classList.add('kinetic-ripple-hit');

                setTimeout(() => {
                    echo.classList.remove('kinetic-ripple-hit');
                }, 600); // Duration of the kinetic-ripple animation
            }, delay);
        });
    }
});

// --- X-Ray Mode Logic ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
        editorEl.classList.add('x-ray-active');
        document.body.classList.add('x-ray-active');
    }

    // Semantic X-Ray toggle (Alt + Shift) -> CHANGED TO HOLOGRAPHIC SIPHON MODE
    if (e.altKey && e.shiftKey) {
        document.body.classList.add('siphon-mode-active');
        document.body.classList.remove('semantic-xray-active'); // Ensure old behavior is overridden or merged
    }
});

// Holographic Siphon Mode Logic - Listen for text selection (mouseup) inside echo documents
// Holographic Siphon Drag & Drop Drop logic
editorEl.addEventListener('dragover', (e) => {
    if (document.body.classList.contains('siphon-mode-active')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }
});

editorEl.addEventListener('drop', (e) => {
    if (!document.body.classList.contains('siphon-mode-active')) return;

    e.preventDefault();
    const selectedText = e.dataTransfer.getData('text/plain');
    if (!selectedText || !selectedText.trim()) return;

    if (window.editor) {
        // Find the target position from the drop coordinates
        const targetPosition = window.editor.getTargetAtClientPoint(e.clientX, e.clientY);

        let position = window.editor.getPosition();
        if (targetPosition && targetPosition.position) {
            position = targetPosition.position;
        }

        // Fire Siphon Packet Animation from cursor to drop location
        fireSiphonPacket(selectedText, e.clientX, e.clientY - 100);

        if (position) {
            window.editor.executeEdits("siphon-drop", [{
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                text: selectedText,
                forceMoveMarkers: true
            }]);

            // Visual feedback on the editor
            document.body.classList.add('shockwave-hit');
            setTimeout(() => document.body.classList.remove('shockwave-hit'), 400);
        }
    }
});

document.addEventListener('mouseup', (e) => {
    if (!document.body.classList.contains('siphon-mode-active')) return;

    // Check if we selected text inside an echo document
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString();
    if (!selectedText.trim()) return;

    // Check if target is inside an echo document
    let target = e.target;
    let inEchoDoc = false;
    while (target && target !== document.body) {
        if (target.classList && target.classList.contains('echo-document')) {
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
            window.editor.executeEdits("siphon", [{
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                text: selectedText,
                forceMoveMarkers: true
            }]);

            // Visual feedback on the editor
            document.body.classList.add('shockwave-hit');
            setTimeout(() => document.body.classList.remove('shockwave-hit'), 400);
        }
    }
});

function fireSiphonPacket(text, startX, startY) {
    const packet = document.createElement('div');
    packet.className = 'siphon-packet';

    // Truncate long text for visual
    const displayStr = text.length > 20 ? text.substring(0, 20) + '...' : text;
    packet.textContent = displayStr;

    packet.style.left = startX + 'px';
    packet.style.top = startY + 'px';

    // Calculate destination (center of screen, approximating editor cursor if not known exactly in DOM coords)
    // A better approach would be mapping editor coords, but center screen works as a general "suck into editor" effect
    const destX = window.innerWidth / 2;
    const destY = window.innerHeight / 2;

    const dx = destX - startX;
    const dy = destY - startY;

    packet.style.setProperty('--dx', dx + 'px');
    packet.style.setProperty('--dy', dy + 'px');

    document.body.appendChild(packet);

    // Clean up
    setTimeout(() => {
        if (packet.parentNode) {
            packet.parentNode.removeChild(packet);
        }
    }, 600);
}

document.addEventListener('keyup', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
        editorEl.classList.remove('x-ray-active');
        document.body.classList.remove('x-ray-active');
    }

    // Semantic X-Ray toggle removal
    if (!e.altKey || !e.shiftKey) {
        document.body.classList.remove('semantic-xray-active');
        document.body.classList.remove('siphon-mode-active');
    }
});

// controls
document.getElementById('toggle-back').addEventListener('change', (e) => { if(bgLayer) bgLayer.setVisible(e.target.checked); });
document.getElementById('toggle-front').addEventListener('change', (e) => { if(fgLayer) fgLayer.setVisible(e.target.checked); });
document.getElementById('toggle-front-on-top').addEventListener('change', (e) => {
  frontCanvas.style.zIndex = e.target.checked ? 10 : 0;
});

// Depth control buttons - Bring Forward / Push Back
const btnDepthForward = document.getElementById('btn-depth-forward');
const btnDepthBack = document.getElementById('btn-depth-back');

if (btnDepthForward) {
  btnDepthForward.addEventListener('click', () => {
    const activeFile = tabManager.files.find(f => f.id === tabManager.activeId);
    if (!activeFile) return;

    // Cycle depth forward: 0 -> 1 -> 2 -> 0
    activeFile.depth = (activeFile.depth + 1) % 3;
    tabManager.applyDepth(activeFile.depth);
    tabManager._renderTabs();

    console.log(`[Depth] ${activeFile.name} moved to depth ${activeFile.depth} (${['Deep', 'Middle', 'Front'][activeFile.depth]})`);
  });
}

if (btnDepthBack) {
  btnDepthBack.addEventListener('click', () => {
    const activeFile = tabManager.files.find(f => f.id === tabManager.activeId);
    if (!activeFile) return;

    // Cycle depth backward: 0 -> 2 -> 1 -> 0
    activeFile.depth = activeFile.depth <= 0 ? 2 : activeFile.depth - 1;
    tabManager.applyDepth(activeFile.depth);
    tabManager._renderTabs();

    console.log(`[Depth] ${activeFile.name} moved to depth ${activeFile.depth} (${['Deep', 'Middle', 'Front'][activeFile.depth]})`);
  });
}

const viewModeSelect = document.getElementById('view-mode-select');
if (viewModeSelect) {
    viewModeSelect.addEventListener('change', (e) => {
        const view = e.target.value;
        if (view === 'waterfall') tabManager.toggleWaterfallView();
        else if (view === 'cascade') tabManager.toggleCascadeView();
        else if (view === 'orbit') tabManager.toggleOrbitView();
        else if (view === 'scattered') tabManager.toggleScatteredView();
        else if (view === 'isometric') tabManager.toggleIsometricView();
        else if (view === 'stack') tabManager.toggleStackView();
        else if (view === 'timeline') tabManager.toggleTimelineView();
        else if (view === 'tunnel') tabManager.toggleTunnelView();
        else if (view === 'grid') tabManager.toggleGridView();
        else if (view === 'helix') tabManager.toggleHelixView();
        else if (view === 'pinboard') tabManager.togglePinboardView();
        else if (view === 'vortex') tabManager.toggleVortexView();
        else if (view === 'constellation') tabManager.toggleConstellationView();
        else if (view === 'prism') tabManager.togglePrismView();
        else if (view === 'coverflow') tabManager.toggleCoverflowView();
        else if (view === 'sphere') tabManager.toggleSphereView();
        else if (view === 'wave') tabManager.toggleWaveView();
        else if (view === 'black-hole') tabManager.toggleBlackHoleView();
        else if (view === 'rolodex') tabManager.toggleRolodexView();
        else if (view === 'cylinder') tabManager.toggleCylinderView();
        else if (view === 'galaxy') tabManager.toggleGalaxyView();
        else tabManager._deactivateAllViews(); // Default view
    });
}

// Theater Mode Logic
const theaterToggle = document.getElementById('theater-mode');
if (theaterToggle) {
    theaterToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('theater-active');
        } else {
            document.body.classList.remove('theater-active');
        }
    });
}

const opacitySlider = document.getElementById('editor-opacity');
opacitySlider.addEventListener('input', (e) => {
  updateFocusVisuals();
});

// Link editor scrolling to echo layer for 3D parallax effect
let lastScrollTop = 0;
let lastScrollTime = performance.now();
editor.onDidScrollChange((e) => {
    if (echoLayerEl) {
        echoLayerEl.style.setProperty('--editor-scroll-y', `${e.scrollTop}px`);

        // Scroll-Linked Kinetic Chromatic Aberration
        const now = performance.now();
        const dt = now - lastScrollTime;
        if (dt > 0) {
            const dy = e.scrollTop - lastScrollTop;
            const velocity = Math.abs(dy / dt);
            // Clamp velocity
            const clampedVel = Math.min(velocity * 10, 50); // Scale for visual effect
            document.body.style.setProperty('--scroll-vel', clampedVel);

            // Auto-decay the velocity effect
            clearTimeout(window._scrollDecayTimer);
            window._scrollDecayTimer = setTimeout(() => {
                document.body.style.setProperty('--scroll-vel', 0);
            }, 100);
        }
        lastScrollTop = e.scrollTop;
        lastScrollTime = now;
    }
});
// Initial set handled by updateFocusVisuals call later or manually
// editorEl.style.opacity = opacitySlider.value;

// New controls: Storm Intensity & Focus Mode
const intensitySlider = document.getElementById('storm-intensity');
intensitySlider.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  if (raindrops) {
    raindrops.options.rainChance = val / 100;
    raindrops.options.dropletsRate = val * 2;
  }
});

let focusMode = false;
document.getElementById('focus-mode').addEventListener('change', (e) => {
  focusMode = e.target.checked;
});

// Lantern Mode Toggle
const lanternToggle = document.getElementById('lantern-mode');
if (lanternToggle) {
    lanternToggle.addEventListener('change', (e) => {
        referenceManager.setLanternMode(e.target.checked);
    });
}

// Wiper Mode Logic
let wiperMode = false;
let wiperAnimationId = null;
let wiperX = 0;
let wiperDirection = 1;

const wiperToggle = document.getElementById('wiper-mode');

function animateWiper() {
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
}

if (wiperToggle) {
    wiperToggle.addEventListener('change', (e) => {
        wiperMode = e.target.checked;
        if (wiperMode) {
            wiperX = wiperDirection === 1 ? -100 : window.innerWidth + 100;
            animateWiper();
        } else {
            cancelAnimationFrame(wiperAnimationId);
        }
    });
}

// Ghost Peeking Custom Event Bridge
document.addEventListener('echo-peek', (e) => {
    if (fogManager && e.detail) {
        // Focus Spotlight logic
        const radius = e.detail.radius || 120;

        // Heavily clear fog where user is peeking
        fogManager.clearFogAt(e.detail.x, e.detail.y, radius, e.detail.isFocusSpotlight);

        // If it's the full focus spotlight, clear rain too
        if (e.detail.isFocusSpotlight && raindrops) {
            raindrops.clearDroplets(e.detail.x, e.detail.y, radius);
        }
    }
});

// Document Splash Custom Event Bridge
document.addEventListener('document-splash', (e) => {
    if (raindrops && e.detail) {
        // Create a large splash effect
        raindrops.splash(e.detail.x, e.detail.y, 15);
    }
});

// Expose Mode Logic
const exposeToggle = document.getElementById('expose-mode');
if (exposeToggle) {
    exposeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('expose-active');
        } else {
            document.body.classList.remove('expose-active');
        }
    });
}

// Ghost Mode Logic
let ghostMode = false;
let ghostTimer = null;
const ghostToggle = document.getElementById('ghost-mode');

function resetGhostTimer() {
    if (!ghostMode) return;
    if (focusDepth > 0.1) return; // Don't interfere if focusing on reference

    // Restore opacity on activity
    if (editorEl.style.opacity !== opacitySlider.value) {
        updateFocusVisuals();
    }

    clearTimeout(ghostTimer);
    ghostTimer = setTimeout(() => {
        if (focusDepth < 0.1) {
             editorEl.style.opacity = '0.05';
        }
    }, 4000);
}

if (ghostToggle) {
    ghostToggle.addEventListener('change', (e) => {
        ghostMode = e.target.checked;
        if (!ghostMode) {
            clearTimeout(ghostTimer);
            editorEl.style.opacity = opacitySlider.value;
        } else {
            resetGhostTimer();
        }
    });
}

// Attach Ghost Mode reset to inputs
['mousemove', 'keydown', 'mousedown', 'wheel'].forEach(evt => {
  window.addEventListener(evt, () => {
    resetGhostTimer();
    // Fog is cleared by mousemove via FogManager directly
    // Reset editor blur only if NOT in focus depth mode
    if(editorEl && focusDepth < 0.1) editorEl.style.filter = 'none';
  });
});


// Blueprint Mode
document.getElementById('blueprint-mode').addEventListener('change', (e) => {
  if (e.target.checked) {
      if (referenceLayer) {
        referenceLayer.classList.add('blueprint-mode');
        // Make editor slightly more transparent in blueprint mode
        editorEl.style.opacity = '0.7';
      }
  } else {
      if (referenceLayer) {
        referenceLayer.classList.remove('blueprint-mode');
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
        const echoes = echoLayerEl.querySelectorAll('.echo-document');
        echoes.forEach(echo => {
            echo.classList.remove('shockwave-hit');
            void echo.offsetWidth; // Force reflow
            echo.classList.add('shockwave-hit');
            setTimeout(() => {
                echo.classList.remove('shockwave-hit');
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
          document.body.style.setProperty('--cursor-y-percent', `${cursorYPercent}%`);
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
              connectionManager.setEditorFocus(currentWord, x + rect.left, y + rect.top + 10); // +10 for approximate line height center
          } else {
              // If no word, we can still pass a dummy word or empty to tether hovered/resonating documents if we want
              // But setEditorFocus uses the word for highlighting cards. Let's pass the cursor coordinates anyway.
              const rect = editorEl.getBoundingClientRect();
              connectionManager.setEditorFocus("___CURSOR_TETHER___", x + rect.left, y + rect.top + 10);
          }
      }

      // Semantic Resonance & Hover Cursor Tether: highlight echo documents matching the word
      if (echoLayerEl) {
          const echoes = echoLayerEl.querySelectorAll('.echo-document');
          echoes.forEach(echo => {
              echo.classList.remove('resonance-hit');
              // Remove magnetic surfacing local overrides if they exist
              if (echo.style.getPropertyValue('--tz-override')) {
                  echo.style.removeProperty('--tz-override');
                  echo.style.setProperty('--tz', echo.dataset.originalTz || '0px');
              }
          });

          let matchedEchoes = [];

          // Add resonating files
          if (currentWord && currentWord.length > 3) {
              const lowerWord = currentWord.toLowerCase();

              tabManager.files.forEach(file => {
                  if (file.id !== tabManager.activeId) {
                      let content = '';
                      if (file.isImage) {
                          content = file.name.toLowerCase();
                      } else if (file.model) {
                          content = file.model.getValue().toLowerCase();
                      }

                      if (content.includes(lowerWord)) {
                          const echoEl = echoLayerEl.querySelector(`.echo-document[data-id="${file.id}"]`);
                          if (echoEl) {
                              echoEl.classList.add('resonance-hit');
                              // Magnetic Surfacing: Pull the matched document forward in Z-space
                              if (!echoEl.dataset.originalTz) {
                                  echoEl.dataset.originalTz = echoEl.style.getPropertyValue('--tz') || '0px';
                              }
                              // Override the tz variable to pull it physically closer before the pulse animation takes over
                              echoEl.style.setProperty('--tz-override', '1');
                              echoEl.style.setProperty('--tz', '30px');

                              // Semantic Depth Linking: Provide the depth level to the connection manager
                              const rect = echoEl.getBoundingClientRect();
                              matchedEchoes.push({
                                  left: rect.left,
                                  top: rect.top,
                                  width: rect.width,
                                  height: rect.height,
                                  depthIndex: parseInt(echoEl.dataset.index || 0, 10),
                                  isHovered: false
                              });
                          }
                      }
                  }
              });
          }

          // Add currently hovered files for the tether feature
          echoes.forEach(echoEl => {
              if (echoEl.matches(':hover') && !echoEl.classList.contains('resonance-hit')) {
                   const rect = echoEl.getBoundingClientRect();
                   matchedEchoes.push({
                       left: rect.left,
                       top: rect.top,
                       width: rect.width,
                       height: rect.height,
                       depthIndex: parseInt(echoEl.dataset.index || 0, 10),
                       isHovered: true
                   });
              }
          });

          if (connectionManager) {
              connectionManager.setEchoFocus(matchedEchoes);
          }

          // Trigger semantic sparks for hovered items
          matchedEchoes.forEach(match => {
              if (match.isHovered && Math.random() > 0.7) {
                  spawnSemanticSpark(match.left + match.width / 2, match.top + match.height / 2);
              }
          });
      }
  }
});

function spawnSemanticSpark(startX, startY) {
    if (!echoLayerEl) return;
    const spark = document.createElement('div');
    spark.className = 'semantic-spark';
    spark.style.left = `${startX}px`;
    spark.style.top = `${startY}px`;

    // Editor is roughly in the center
    const editorRect = editorEl.getBoundingClientRect();
    const endX = editorRect.left + editorRect.width / 2 + (Math.random() - 0.5) * 100;
    const endY = editorRect.top + editorRect.height / 2 + (Math.random() - 0.5) * 100;

    const dx = endX - startX;
    const dy = endY - startY;

    spark.style.setProperty('--tx', `${dx}px`);
    spark.style.setProperty('--ty', `${dy}px`);

    echoLayerEl.appendChild(spark);

    setTimeout(() => {
        if (spark.parentNode) {
            spark.parentNode.removeChild(spark);
        }
    }, 1000);
}

// --- Fog / Condensation Logic ---
// Handled by FogManager (canvas overlay)
// Obscures entire view when idle, cleared by mouse.

// --- Lightning Logic ---
const lightningLayer = document.getElementById('lightning-layer');

function triggerLightning() {
  if (!lightningLayer) return;
  const brightness = 0.6 + Math.random() * 0.4;
  lightningLayer.style.opacity = brightness;
  setTimeout(() => {
    lightningLayer.style.opacity = 0;
  }, 50 + Math.random() * 100);
  scheduleLightning();
}

function scheduleLightning() {
  const delay = 10000 + Math.random() * 20000;
  setTimeout(triggerLightning, delay);
}
scheduleLightning();

// --- Reference Input Logic ---
const referenceInput = document.getElementById('reference-input');
if (referenceInput) {
    referenceInput.value = INITIAL_MARKDOWN;

    referenceInput.addEventListener('input', (e) => {
        referenceManager.update(e.target.value);
    });
}

// --- Deep Search Logic ---
const globalSearch = document.getElementById('global-search');
if (globalSearch) {
    globalSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();

        if (!searchTerm) {
            // Clear all search hits
            document.querySelectorAll('.echo-document.search-hit').forEach(el => {
                el.classList.remove('search-hit');
                if (el.style.getPropertyValue('--tz-override')) {
                    el.style.removeProperty('--tz-override');
                    el.style.setProperty('--tz', el.dataset.originalTz || '0px');
                }
            });
            return;
        }

        let matchedEchoes = [];

        tabManager.files.forEach(file => {
            if (file.id === tabManager.activeId) return;

            let content = '';
            if (file.isImage) {
                content = file.name.toLowerCase();
            } else if (file.model) {
                content = file.model.getValue().toLowerCase();
            }

            const echoEl = document.querySelector(`.echo-document[data-id="${file.id}"]`);
            if (echoEl) {
                if (content.includes(searchTerm)) {
                    echoEl.classList.add('search-hit');
                    if (!echoEl.dataset.originalTz) {
                        echoEl.dataset.originalTz = echoEl.style.getPropertyValue('--tz') || '0px';
                    }
                    echoEl.style.setProperty('--tz-override', '1');
                    echoEl.style.setProperty('--tz', '80px');

                    const rect = echoEl.getBoundingClientRect();
                    matchedEchoes.push({
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                        depthIndex: parseInt(echoEl.dataset.index || 0, 10),
                        isHovered: false
                    });
                } else {
                    echoEl.classList.remove('search-hit');
                    if (echoEl.style.getPropertyValue('--tz-override')) {
                        echoEl.style.removeProperty('--tz-override');
                        echoEl.style.setProperty('--tz', echoEl.dataset.originalTz || '0px');
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

// --- Focus Depth Logic ---
let userPreferredDepth = 1.0;

function setFocusDepth(depth) {
    focusDepth = Math.max(0, Math.min(1, depth));
    updateFocusVisuals();
}

function updateFocusVisuals() {
    const maxOpacity = parseFloat(opacitySlider.value) || 1;
    const targetEditorOpacity = maxOpacity * (1 - focusDepth * 0.95);

    // Zoom Calculation
    // When focusDepth = 1 (Reference focused), Reference scale = 1.05 (Zoom In), Editor scale = 0.95 (Zoom Out)
    const refScale = 1 + (focusDepth * 0.08);
    const editorScale = 1 - (focusDepth * 0.05);

    // Editor and Image Viewer
    const targetOpacity = Math.max(0.02, targetEditorOpacity);
    const filter = `blur(${focusDepth * 8}px)`;
    const transform = `scale(${editorScale}) translateZ(0)`;

    editorEl.style.opacity = targetOpacity;
    editorEl.style.filter = filter;
    editorEl.style.transform = transform;

    if (document.getElementById('image-viewer')) {
        document.getElementById('image-viewer').style.opacity = targetOpacity;
        document.getElementById('image-viewer').style.filter = filter;
        document.getElementById('image-viewer').style.transform = transform;
    }

    // Reference Layer
    if (referenceLayer) {
        // Use translateZ to force GPU acceleration
        referenceLayer.style.transform = `scale(${refScale}) translateZ(0)`;
    }

    // Pointer Events
    if (focusDepth > 0.6) {
        editorEl.style.pointerEvents = 'none';
        if (document.getElementById('image-viewer')) document.getElementById('image-viewer').style.pointerEvents = 'none';
    } else {
        editorEl.style.pointerEvents = 'auto';
        if (document.getElementById('image-viewer')) document.getElementById('image-viewer').style.pointerEvents = 'auto';
    }

    // Reference Overlay
    if (referenceOverlay) {
        referenceOverlay.style.opacity = 1 - focusDepth;
    }

    // Fog
    if (fogLayerEl) {
        fogLayerEl.style.opacity = 1 - (focusDepth * 0.5);
    }
}

// Initial Call
updateFocusVisuals();

let isAltDown = false;
document.addEventListener('keydown', (e) => {
    if (e.key === 'Alt') {
        if (!isAltDown) {
            isAltDown = true;
            setFocusDepth(userPreferredDepth);
            document.body.classList.add('alt-focus-active');
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Alt') {
        isAltDown = false;
        setFocusDepth(0);
        document.body.classList.remove('alt-focus-active');
    }
});

// --- Magnifier Tool Logic ---
document.addEventListener('keydown', (e) => {
  if (e.metaKey && e.shiftKey && !e.repeat) {
    isMagnifierMode = true;
    editorEl.classList.add('x-ray-active'); // Re-use x-ray hole effect for the editor
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Meta' || e.key === 'Shift') {
    isMagnifierMode = false;
    // Don't remove x-ray-active if the normal X-Ray shortcut (just Meta) is still held
    if (!e.metaKey && !e.ctrlKey) {
        editorEl.classList.remove('x-ray-active');
    }

    if (echoLayerEl) {
      echoLayerEl.querySelectorAll('.echo-document').forEach(echo => {
        echo.classList.remove('magnifier-active');
      });
    }
  }
});

let stackZ = 0;
window.addEventListener('wheel', (e) => {
    // "Layered Depth Explorer" feature mapped to Shift+Alt
    if (e.shiftKey && e.altKey && !tabManager.isCascadeView) {
        e.preventDefault();
        const delta = e.deltaY * 0.8; // Faster scroll
        stackZ += delta;

        // Clamp scroll stack depth roughly to available echoes with some padding
        const maxDepth = (tabManager.files.length * 50) + 200;
        stackZ = Math.max(-100, Math.min(maxDepth, stackZ));

        if (echoLayerEl) {
            echoLayerEl.style.setProperty('--stack-z', `${stackZ}px`);

            // Highlight intersecting documents (Layered Depth Explorer visual feedback)
            const echoes = echoLayerEl.querySelectorAll('.echo-document');
            echoes.forEach(echo => {
                // Original Z position (from TabManager: index * 50)
                const docZ = parseInt(echo.dataset.index || 0) * 50;

                // If stackZ is near docZ, it's intersecting the viewing plane
                const distance = Math.abs(docZ - stackZ);
                if (distance < 40) {
                    echo.classList.add('z-intersect');
                } else {
                    echo.classList.remove('z-intersect');
                }
            });
        }
    } else if (e.altKey) {
        e.preventDefault();
        const delta = e.deltaY * 0.001;

        // Adjust the preferred depth, clamping between 0.1 and 1
        userPreferredDepth = Math.max(0.1, Math.min(1, userPreferredDepth + delta));

        // Update current focus depth immediately if Alt is held
        setFocusDepth(userPreferredDepth);
    }
}, { passive: false });

document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift' || e.key === 'Alt') {
        // Only reset if BOTH are not held
        if (!e.shiftKey || !e.altKey) {
            stackZ = 0;
            if (echoLayerEl) {
                echoLayerEl.style.setProperty('--stack-z', '0px');
                const echoes = echoLayerEl.querySelectorAll('.echo-document');
                echoes.forEach(echo => {
                    echo.classList.remove('z-intersect');
                });
            }
        }
    }
});

// --- Lens Mode Logic ---
let isLensMode = false;
document.addEventListener('keydown', (e) => {
    // Shift + Alt to toggle Lens Mode
    if (e.altKey && e.shiftKey && !e.repeat) {
        isLensMode = !isLensMode;
        if (referenceManager) {
            referenceManager.isLensMode = isLensMode;
        }
        if (isLensMode) {
            editorEl.classList.add('lens-active');
        } else {
            editorEl.classList.remove('lens-active');
        }
        // If we have portals, we need to update the composed mask immediately
        if (typeof updatePortals === 'function') {
            requestAnimationFrame(updatePortals);
        }
    }
});

// --- Theme Logic ---
const themeSelect = document.getElementById('theme-select');
if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        document.body.classList.remove('theme-journal', 'theme-blueprint', 'theme-cyberpunk');
        if (theme !== 'cyberpunk') {
            document.body.classList.add(`theme-${theme}`);
        }
    });
}

// --- Dock Toggle Logic ---
const dock = document.getElementById('dock');
const dockToggle = document.getElementById('dock-toggle');
if (dock && dockToggle) {
    dockToggle.addEventListener('click', () => {
        dock.classList.toggle('dock-collapsed');
    });
}

// --- Syntactic Atmosphere Logic ---
function updateAtmosphere() {
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    let errorCount = 0;
    let warningCount = 0;

    markers.forEach(m => {
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
}

// Check every 2 seconds or on change
editor.onDidChangeModelDecorations(() => {
    updateAtmosphere();
});


// --- Typing Storm Logic ---
let stormCharCount = 0;
const STORM_decay = 4; // Chars per second decay
const STORM_heavy = 30; // Accumulation threshold for heavy rain
const STORM_intense = 80; // Accumulation threshold for lightning

window.atmosphereHue = 180;
window.atmosphereIntensity = 0;

function createTypingParticle(x, y) {
    if (!echoLayerEl) return;
    const particle = document.createElement('div');
    particle.className = 'typing-particle';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;

    // Randomize particle target destination slightly
    const dx = (Math.random() - 0.5) * 200;
    const dy = (Math.random() - 0.5) * 200;

    particle.style.setProperty('--px', `${dx}px`);
    particle.style.setProperty('--py', `${dy}px`);

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
}

editor.onDidChangeModelContent((e) => {
    e.changes.forEach(change => {
        stormCharCount += change.text.length;

        // Typing Particle Emitter
        if (change.text.length > 0) {
            const position = editor.getPosition();
            if (position) {
                const scrolledVisiblePosition = editor.getScrolledVisiblePosition(position);
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
        const echoes = echoLayerEl.querySelectorAll('.echo-document');
        echoes.forEach(echo => {
            echo.classList.remove('ripple-active');
            void echo.offsetWidth; // Force reflow
            echo.classList.add('ripple-active');
            setTimeout(() => {
                echo.classList.remove('ripple-active');
            }, 500);
        });
    }
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
    document.documentElement.style.setProperty('--dynamic-hue', finalHue);

    // Total Intensity
    const totalIntensity = stormCharCount + (window.atmosphereIntensity || 0);

    // Heat Distortion logic
    if (totalIntensity > 150) {
        if (echoLayerEl) echoLayerEl.classList.add('heat-active');
        if (referenceLayer) referenceLayer.classList.add('heat-active');
    } else {
        if (echoLayerEl) echoLayerEl.classList.remove('heat-active');
        if (referenceLayer) referenceLayer.classList.remove('heat-active');
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

// --- Sonar Ping Logic ---
let lastShiftTime = 0;
let sonarActive = false;
let sonarStartTime = 0;
let sonarX = 0;
let sonarY = 0;
let cachedSonarTargets = [];

document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') {
        const now = Date.now();
        if (now - lastShiftTime < 300) {
            // Double Shift detected
            triggerSonar();
        }
        lastShiftTime = now;
    }

    // Ctrl+Space for Sonar Ping
    if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        triggerSonar();
    }
});

const btnSonar = document.getElementById('btn-sonar-ping');
if (btnSonar) {
    btnSonar.addEventListener('click', triggerSonar);
}

// 3D Z-Axis Scanner Logic
const btnZScan = document.getElementById('btn-z-scan');
if (btnZScan) {
    btnZScan.addEventListener('click', triggerZScan);
}

const btnBlackHole = document.getElementById('btn-black-hole-view');
if (btnBlackHole) {
    btnBlackHole.addEventListener('click', () => { tabManager.toggleBlackHoleView(); });
}

function triggerZScan() {
    const scannerPlane = document.getElementById('z-scanner-plane');
    if (!scannerPlane) return;

    // Reset and start animation
    scannerPlane.classList.remove('scanning');
    void scannerPlane.offsetWidth; // Force reflow
    scannerPlane.classList.add('scanning');

    const echoes = document.querySelectorAll('.echo-document');

    // Approximate depth matching based on CSS structure and vars
    echoes.forEach((echo) => {
        let z = 0;
        const tzStyle = echo.style.getPropertyValue('--tz');

        if (tzStyle && tzStyle.includes('px')) {
            const match = tzStyle.match(/(-?\d+)/);
            if (match && !tzStyle.includes('calc')) {
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
            echo.classList.add('z-scan-hit');

            // Highlight text slightly more by playing with tint
            const currentTint = echo.style.getPropertyValue('--echo-tint') || '0deg';
            echo.style.setProperty('--scan-temp-color', 'rgba(255, 0, 128, 1)');

            setTimeout(() => {
                echo.classList.remove('z-scan-hit');
            }, 800);
        }, delayMs);
    });

    // Clean up scanner class
    setTimeout(() => {
        scannerPlane.classList.remove('scanning');
    }, 4500);
}

function triggerSonar() {
    sonarActive = true;
    sonarStartTime = Date.now();

    // Get mouse position
    // Use the last known mouse position from global listener if possible,
    // but here we might need to rely on the CSS variables set by mousemove
    const mx = parseFloat(document.body.style.getPropertyValue('--mouse-x')) || (window.innerWidth / 2);
    const my = parseFloat(document.body.style.getPropertyValue('--mouse-y')) || (window.innerHeight / 2);

    sonarX = mx;
    sonarY = my;

    editorEl.style.setProperty('--sonar-x', `${sonarX}px`);
    editorEl.style.setProperty('--sonar-y', `${sonarY}px`);

    editorEl.classList.add('sonar-active');


    cachedSonarTargets = [];
    document.querySelectorAll('.note-card').forEach(card => {
        const rect = card.getBoundingClientRect();
        cachedSonarTargets.push({
            el: card,
            cx: rect.left + rect.width / 2,
            cy: rect.top + rect.height / 2
        });
    });
    if (echoLayerEl) {
        echoLayerEl.querySelectorAll('.echo-document').forEach(echo => {
            const rect = echo.getBoundingClientRect();
            cachedSonarTargets.push({
                el: echo,
                cx: rect.left + rect.width / 2,
                cy: rect.top + rect.height / 2
            });
        });
    }

    requestAnimationFrame(animateSonar);
}

function animateSonar() {
    if (!sonarActive) return;

    const now = Date.now();
    const elapsed = now - sonarStartTime;
    const duration = 1500;

    if (elapsed > duration) {
        sonarActive = false;
        editorEl.classList.remove('sonar-active');
        // Clear sonar-hit classes
        document.querySelectorAll('.sonar-hit').forEach(el => el.classList.remove('sonar-hit'));
        return;
    }

    // Easing out
    const progress = elapsed / duration;
    const radius = Math.max(window.innerWidth, window.innerHeight) * 1.5 * (1 - Math.pow(1 - progress, 3)); // cubic ease out

    editorEl.style.setProperty('--sonar-radius', `${radius}px`);

    // Semantic Sonar: highlight elements as the ring passes over them
    const thickness = 150; // Match the mask thickness

    cachedSonarTargets.forEach(target => {
        const dist = Math.sqrt(Math.pow(target.cx - sonarX, 2) + Math.pow(target.cy - sonarY, 2));
        if (Math.abs(dist - radius) < thickness) {
            target.el.classList.add('sonar-hit');
        } else {
            target.el.classList.remove('sonar-hit');
        }
    });

    // Force update if portals exist (JS mask management active)
    if (portalLines.length > 0) {
        updatePortals();
    }

    requestAnimationFrame(animateSonar);
}

// --- Portal Comments Logic ---
let portalLines = [];

function scanPortals() {
    const model = editor.getModel();
    if (!model) return;
    portalLines = [];
    const lines = model.getLinesContent();
    lines.forEach((line, index) => {
        if (line.includes('// @portal')) {
            portalLines.push(index + 1);
        }
    });
    updatePortals();
}

function updatePortals() {
    if (!editorEl) return;

    // 1. Collect Portals
    const portals = [];
    portalLines.forEach(lineNumber => {
        const pos = editor.getScrolledVisiblePosition({ lineNumber, column: 1 });
        if (pos) {
             // Offset to align with the comment roughly
             portals.push({ x: pos.left + 60, y: pos.top + 10 });
        }
    });

    // Update Portal Visuals
    if (portalLayer) {
        portalLayer.innerHTML = '';
        portals.forEach(p => {
            const ring = document.createElement('div');
            ring.className = 'portal-ring';
            ring.style.position = 'absolute';
            ring.style.left = (p.x - 50) + 'px';
            ring.style.top = (p.y - 50) + 'px';
            ring.style.width = '100px';
            ring.style.height = '100px';
            portalLayer.appendChild(ring);
        });

    }

    // If no portals, we must clear inline styles so CSS classes work (unless we want to enforce JS masking always)
    if (portals.length === 0) {
        editorEl.style.maskImage = '';
        editorEl.style.webkitMaskImage = '';
        editorEl.style.maskComposite = '';
        editorEl.style.webkitMaskComposite = '';
        return;
    }

    const maskLayers = [];

    // Add Portal Holes
    const portalGradients = portals.map(p =>
        `radial-gradient(circle at ${p.x}px ${p.y}px, transparent 0px, transparent 100px, black 150px)`
    ).join(', ');
    if (portalGradients) maskLayers.push(portalGradients);

    // 2. Add Interactive Mode Holes (X-Ray / Lens / Sonar)
    // We must manually add these because inline styles override CSS classes
    const isXRay = editorEl.classList.contains('x-ray-active');
    const isLens = editorEl.classList.contains('lens-active');
    const isSonar = editorEl.classList.contains('sonar-active');

    const mx = document.body.style.getPropertyValue('--mouse-x') || '50%';
    const my = document.body.style.getPropertyValue('--mouse-y') || '50%';

    if (isLens) {
         maskLayers.push(`radial-gradient(circle at ${mx} ${my}, transparent 160px, black 320px)`);
    } else if (isXRay) {
         maskLayers.push(`radial-gradient(circle at ${mx} ${my}, transparent 100px, black 250px)`);
    }

    if (isSonar) {
        const sx = editorEl.style.getPropertyValue('--sonar-x') || '50%';
        const sy = editorEl.style.getPropertyValue('--sonar-y') || '50%';
        const sr = editorEl.style.getPropertyValue('--sonar-radius') || '0px';
        // Sonar ring mask (transparent hole moving outwards)
        maskLayers.push(`radial-gradient(circle at ${sx} ${sy}, black calc(${sr} - 150px), transparent ${sr}, black calc(${sr} + 150px))`);
    }

    if (maskLayers.length === 0) {
        editorEl.style.maskImage = '';
        editorEl.style.webkitMaskImage = '';
        editorEl.style.maskComposite = '';
        editorEl.style.webkitMaskComposite = '';
        return;
    }

    const finalMask = maskLayers.join(', ');

    editorEl.style.maskImage = finalMask;
    editorEl.style.webkitMaskImage = finalMask;

    // Use intersect to combine holes
    editorEl.style.maskComposite = 'intersect';
    editorEl.style.webkitMaskComposite = 'source-in';
}

editor.onDidChangeModelContent(scanPortals);
editor.onDidScrollChange(updatePortals);
window.addEventListener('resize', updatePortals);

// Trigger updates for X-Ray / Lens interaction
document.addEventListener('keydown', (e) => {
    // slight delay to allow classList update
    requestAnimationFrame(updatePortals);
});
document.addEventListener('keyup', (e) => {
    requestAnimationFrame(updatePortals);
});
document.addEventListener('mousemove', () => {
    // Only need to update if we have portals (inline style active)
    if (portalLines.length > 0) {
        const isXRay = editorEl.classList.contains('x-ray-active');
        const isLens = editorEl.classList.contains('lens-active');
        const isSonar = editorEl.classList.contains('sonar-active');
        if (isXRay || isLens || isSonar) {
            updatePortals();
        }
    }
});

// Initial scan
scanPortals();

// Ctrl+Shift+S — Save current document to VPS
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    _triggerVpsSave();
  }
});

// Ctrl+S — Save current tab to backend
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 's') {
    const activeFile = tabManager.files.find(f => f.id === tabManager.activeId);
    if (!activeFile || activeFile.isImage) return;

    if (activeFile.cabinetType === 'notes' || activeFile.noteName) {
      e.preventDefault();
      const noteName = activeFile.noteName || activeFile.cabinetId || activeFile.name;
      const content = activeFile.model ? activeFile.model.getValue() : '';
      storageAPI.saveNote(noteName, content).then((result) => {
        if (result && result.success) {
          tabManager._showToast(`✅ Note "${noteName}" saved!`);
        } else {
          tabManager._showToast(`❌ Failed to save note "${noteName}"`, true);
        }
      }).catch((err) => {
        console.error('Save note error:', err);
        tabManager._showToast(`❌ Error saving note: ${err.message}`, true);
      });
    }
  }
});

// Expose tabManager for testing
window.tabManager = tabManager;

// Hyper-Jump & Magnetic Peel
let isPeelActive = false;

document.addEventListener('keydown', (e) => {
    // Hyper-Jump
    if (e.altKey && e.shiftKey && e.key === 'J') {
         if (!document.body.classList.contains('hyper-jump-active')) {
             document.body.classList.add('hyper-jump-active');
             setTimeout(() => document.body.classList.remove('hyper-jump-active'), 1000);
         }
         e.preventDefault();
         return;
    }

    if (e.altKey && e.shiftKey) {
        if (!isPeelActive) {
             isPeelActive = true;
             document.body.classList.add('peel-active');
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Alt' || e.key === 'Shift') {
        if (!e.altKey || !e.shiftKey) {
            isPeelActive = false;
            document.body.classList.remove('peel-active');

            if (echoLayerEl && typeof tabManager !== 'undefined' && !tabManager.isCascadeView && !tabManager.isOrbitView && !tabManager.isScatteredView && !tabManager.isIsometricView && !tabManager.isStackView && !tabManager.isTunnelView && !tabManager.isGridView && !tabManager.isHelixView && !tabManager.isPinboardView && !tabManager.isVortexView && !tabManager.isConstellationView && !tabManager.isPrismView && !tabManager.isCoverflowView && !tabManager.isWaveView && !tabManager.isSphereView) {
                 const echoes = echoLayerEl.querySelectorAll('.echo-document');
                 echoes.forEach((echo) => {
                     echo.style.removeProperty('transform');
                     echo.style.setProperty('--tz-val', echo.style.getPropertyValue('--tz'));
                 });
            }
        }
    }
});


// Z-Axis Slicer Logic
document.addEventListener('DOMContentLoaded', () => {
    const slicerRange = document.getElementById('z-slicer-range');
    if (slicerRange) {
        slicerRange.addEventListener('input', (e) => {
            const val = parseInt(e.target.value); // 0 to 100
            const maxDepth = 10; // max logical depth we expect
            const targetDepth = Math.round((val / 100) * maxDepth);

            // Highlight documents matching the target depth
            const docs = document.querySelectorAll('.echo-document');
            docs.forEach(doc => {
                const index = parseInt(doc.dataset.index || 0);
                if (index === targetDepth) {
                    doc.classList.add('slicer-highlight');
                } else {
                    doc.classList.remove('slicer-highlight');
                }
            });
        });
    }
});
