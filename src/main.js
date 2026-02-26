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
import backFrag from './shaders/water-back.frag?glslify';
import frontFrag from './shaders/water.frag?glslify';
import vertSrc from './shaders/simple.vert?glslify';

const editorEl = document.getElementById('editor');
const backCanvas = document.getElementById('rain-back');
const frontCanvas = document.getElementById('rain-front');
const connectionsCanvas = document.getElementById('connections-layer');
const referenceLayer = document.getElementById('reference-layer');
const referenceOverlay = document.getElementById('reference-overlay');
const holoLayerEl = document.getElementById('holo-layer');
const fogLayerEl = document.getElementById('fog-layer');
const vignetteLayer = document.getElementById('vignette-layer'); // Added

// Create Portal Visual Layer
const portalLayer = document.createElement('div');
portalLayer.id = 'portal-visuals';
portalLayer.style.position = 'absolute';
portalLayer.style.inset = '0';
portalLayer.style.pointerEvents = 'none';
portalLayer.style.zIndex = '3'; // Above editor
if (document.getElementById('container')) {
    document.getElementById('container').appendChild(portalLayer);
}

// Initialize Managers
const referenceManager = new ReferenceManager(referenceLayer, referenceOverlay, monaco);
const connectionManager = new ConnectionManager(connectionsCanvas, referenceManager);
referenceManager.setConnectionManager(connectionManager);
const fogManager = new FogManager(fogLayerEl);
referenceManager.setFogManager(fogManager);

let focusDepth = 0; // 0 = Editor, 1 = Reference

// Initial Text
const INITIAL_MARKDOWN = `# REFERENCE LAYER
Use this space for documentation, specs, or notes.
It sits behind the rain but remains readable.
**Toggle visibility with Alt key.**

## API Reference
- \`raindrops.clearDroplets(x, y, r)\`
- \`render(time)\`
- \`update()\`

> "Rain is just confetti from the sky."

\`\`\`javascript
function example() {
  return true;
}
\`\`\`
`.trim();

if (referenceLayer) {
  referenceManager.update(INITIAL_MARKDOWN);
}

// create Monaco editor
monaco.editor.defineTheme('transparent-vs-light', {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#00000000'
  }
});

const editor = monaco.editor.create(editorEl, {
  value: ['// rain-2 demo','function hello(){','  console.log("hello world");','}'].join('\n'),
  language: 'javascript',
  theme: 'transparent-vs-light',
  automaticLayout: true
});

// Initialize HoloManager
const holoManager = new HoloManager(editor, holoLayerEl);

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
}
window.addEventListener('resize', resizeCanvases);
resizeCanvases();

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

async function initLayers(){
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
    requestAnimationFrame(animate);
  }

  animate();
}

initLayers();

// parallax from mouse
document.addEventListener('mousemove', (e) => {
  const rect = editorEl.getBoundingClientRect();
  const x = ( (e.clientX - rect.left) / rect.width ) * 2 - 1;
  const y = ( (e.clientY - rect.top) / rect.height ) * 2 - 1;
  if(bgLayer) bgLayer.setParallax(x*0.4, y*0.4);
  if(fgLayer) fgLayer.setParallax(x, y);

  // Update fog mask position for "wiping" effect
  if (fogManager) {
    fogManager.clearFogAt(e.clientX, e.clientY, 60);
  }

  // Update CSS variables for X-Ray and Lantern
  document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
  document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
});

document.addEventListener('mousedown', (e) => {
    if (raindrops) {
        raindrops.splash(e.clientX, e.clientY, 5);
    }
});

// --- X-Ray Mode Logic ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
        editorEl.classList.add('x-ray-active');
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
        editorEl.classList.remove('x-ray-active');
    }
});

// controls
document.getElementById('toggle-back').addEventListener('change', (e) => { if(bgLayer) bgLayer.setVisible(e.target.checked); });
document.getElementById('toggle-front').addEventListener('change', (e) => { if(fgLayer) fgLayer.setVisible(e.target.checked); });
document.getElementById('toggle-front-on-top').addEventListener('change', (e) => {
  if(e.target.checked){
    frontCanvas.style.zIndex = 2; editorEl.style.zIndex = 1;
  } else {
    frontCanvas.style.zIndex = 0; editorEl.style.zIndex = 1;
  }
});

const opacitySlider = document.getElementById('editor-opacity');
opacitySlider.addEventListener('input', (e) => {
  updateFocusVisuals();
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

      // Focus Link: Connect cursor word to reference notes
      const model = editor.getModel();
      const wordAtPosition = model.getWordAtPosition(position);
      if (connectionManager) {
          if (wordAtPosition) {
              // Adjust coordinates to be relative to the viewport/canvas
              const rect = editorEl.getBoundingClientRect();
              connectionManager.setEditorFocus(wordAtPosition.word, x + rect.left, y + rect.top + 10); // +10 for approximate line height center
          } else {
              connectionManager.setEditorFocus(null);
          }
      }
  }
});

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

    // Editor
    editorEl.style.opacity = Math.max(0.02, targetEditorOpacity);
    editorEl.style.filter = `blur(${focusDepth * 8}px)`;
    editorEl.style.transform = `scale(${editorScale}) translateZ(0)`;

    // Reference Layer
    if (referenceLayer) {
        // Use translateZ to force GPU acceleration
        referenceLayer.style.transform = `scale(${refScale}) translateZ(0)`;
    }

    // Pointer Events
    if (focusDepth > 0.6) {
        editorEl.style.pointerEvents = 'none';
    } else {
        editorEl.style.pointerEvents = 'auto';
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
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Alt') {
        isAltDown = false;
        setFocusDepth(0);
    }
});

window.addEventListener('wheel', (e) => {
    if (e.altKey) {
        e.preventDefault();
        const delta = e.deltaY * 0.001;

        // Adjust the preferred depth, clamping between 0.1 and 1
        userPreferredDepth = Math.max(0.1, Math.min(1, userPreferredDepth + delta));

        // Update current focus depth immediately if Alt is held
        setFocusDepth(userPreferredDepth);
    }
}, { passive: false });

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

// --- Typing Storm Logic ---
let stormCharCount = 0;
const STORM_decay = 4; // Chars per second decay
const STORM_heavy = 30; // Accumulation threshold for heavy rain
const STORM_intense = 80; // Accumulation threshold for lightning

editor.onDidChangeModelContent((e) => {
    e.changes.forEach(change => {
        stormCharCount += change.text.length;
    });
});

setInterval(() => {
    if (stormCharCount > 0) {
        stormCharCount = Math.max(0, stormCharCount - STORM_decay);
    }

    // Dynamic Hue Logic
    const baseHue = 180 + Math.min(100, stormCharCount);
    const time = Date.now() / 1000;
    const breathing = Math.sin(time) * 10;
    const finalHue = baseHue + breathing;
    document.documentElement.style.setProperty('--dynamic-hue', finalHue);

    if (referenceManager) {
        referenceManager.setStormIntensity(stormCharCount);
    }

    if (raindrops && intensitySlider) {
        const baseRate = parseInt(intensitySlider.value, 10) * 2;
        const baseChance = parseInt(intensitySlider.value, 10) / 100;

        let multiplier = 1;

        if (stormCharCount > STORM_intense) {
            multiplier = 4.0;
            // 20% chance of lightning every second during intense storm
            if (Math.random() < 0.2) triggerLightning();
        } else if (stormCharCount > STORM_heavy) {
            multiplier = 2.0;
        }

        if (multiplier > 1) {
            raindrops.options.dropletsRate = baseRate * multiplier;
            raindrops.options.rainChance = Math.min(1, baseChance * multiplier);
        } else {
            // Revert to slider values
            // We only need to reset if we were previously modified,
            // but setting it every second ensures consistency.
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
        const opacity = Math.min(1, stormCharCount / 60);
        vignetteLayer.style.opacity = opacity;
    }

}, 1000);

// --- Sonar Ping Logic ---
let lastShiftTime = 0;
let sonarActive = false;
let sonarStartTime = 0;
let sonarX = 0;
let sonarY = 0;

document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') {
        const now = Date.now();
        if (now - lastShiftTime < 300) {
            // Double Shift detected
            triggerSonar();
        }
        lastShiftTime = now;
    }
});

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
        return;
    }

    // Easing out
    const progress = elapsed / duration;
    const radius = Math.max(window.innerWidth, window.innerHeight) * 1.5 * (1 - Math.pow(1 - progress, 3)); // cubic ease out

    editorEl.style.setProperty('--sonar-radius', `${radius}px`);

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
            ring.style.borderRadius = '50%';
            ring.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.4), inset 0 0 10px rgba(0, 229, 255, 0.2)';
            ring.style.border = '1px solid rgba(0, 229, 255, 0.3)';
            ring.style.animation = 'pulse-ring 2s infinite ease-in-out';
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
