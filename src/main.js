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
import { FogManager } from './FogManager.js';
import backFrag from './shaders/water-back.frag?glslify';
import frontFrag from './shaders/water.frag?glslify';
import vertSrc from './shaders/simple.vert?glslify';

const editorEl = document.getElementById('editor');
const backCanvas = document.getElementById('rain-back');
const frontCanvas = document.getElementById('rain-front');
const referenceLayer = document.getElementById('reference-layer');
const referenceOverlay = document.getElementById('reference-overlay');
const fogLayerEl = document.getElementById('fog-layer');

// Initialize Managers
const referenceManager = new ReferenceManager(referenceLayer, referenceOverlay);
const fogManager = new FogManager(fogLayerEl);

if (referenceLayer) {
  // Set initial text
  const initialMarkdown = `# REFERENCE LAYER
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

  // We don't set innerText directly anymore, we rely on manager
  referenceManager.update(initialMarkdown);
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

  // simple animation loop
  function animate(){
    raindrops.update(); // updates raindrops.canvas internally
    // update texture bindings from the raindrops canvas
    if(bgLayer) bgLayer.bindTexture('u_waterMap', raindrops.canvas);
    if(fgLayer) fgLayer.bindTexture('u_waterMap', raindrops.canvas);

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
    fogManager.clearFog(e.clientX, e.clientY, 60);
  }

  // Note: ReferenceManager handles its own mousemove for lantern effect and dragging
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
  editorEl.style.opacity = e.target.value;
});
editorEl.style.opacity = opacitySlider.value;

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
    // Restore opacity on activity
    if (editorEl.style.opacity !== opacitySlider.value) {
        editorEl.style.opacity = opacitySlider.value;
    }

    clearTimeout(ghostTimer);
    ghostTimer = setTimeout(() => {
        editorEl.style.opacity = '0.05'; // Fade out significantly
    }, 4000); // 4 seconds idle
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
    // Reset editor blur if any
    if(editorEl) editorEl.style.filter = 'none';
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
                 raindrops.clearDroplets(x, y + 10, 50);
             }, x * 0.5);
        }
    }
  }
});

editor.onDidChangeCursorPosition((e) => {
  if (!focusMode || !raindrops) return;

  const position = e.position;
  const scrolledVisiblePosition = editor.getScrolledVisiblePosition(position);

  if (scrolledVisiblePosition) {
    const x = scrolledVisiblePosition.left;
    const y = scrolledVisiblePosition.top;
    raindrops.clearDroplets(x, y, 100);
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
    // Populate input with initial text (re-extracted from Markdown if possible, or just default)
    // Since we overwrote innerHTML, we can't get it back easily.
    // But we know what we set.
    referenceInput.value = referenceManager.layer ? referenceManager.layer.innerText : "";

    // Correction: We just set HTML content using markdown parser.
    // innerText will strip tags.
    // Let's just set the initial value to the markdown string we defined above.
    // But wait, that string was local.
    // Let's refactor to make it accessible or just set it here.
    const initialMarkdown = `# REFERENCE LAYER
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

    referenceInput.value = initialMarkdown;

    referenceInput.addEventListener('input', (e) => {
        referenceManager.update(e.target.value);
    });
}

let isAltDown = false;
document.addEventListener('keydown', (e) => {
    if (e.key === 'Alt') {
        if (!isAltDown) {
            isAltDown = true;
            toggleReferenceMode(true);
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Alt') {
        isAltDown = false;
        toggleReferenceMode(false);
    }
});

function toggleReferenceMode(active) {
    if (active) {
        // Hide editor, show reference CLEARLY
        editorEl.style.opacity = '0.05';
        editorEl.style.pointerEvents = 'none';

        if (referenceOverlay) referenceOverlay.style.opacity = '0';
        if (fogLayerEl) fogLayerEl.style.opacity = '0';

    } else {
        // Restore
        // Only restore opacity if NOT in ghost mode active state?
        // If ghost mode is active and we are idle, opacity should be low.
        // But pressing Alt is an activity... so opacity should come back.
        // ResetGhostTimer handles this on keydown.
        editorEl.style.opacity = opacitySlider.value;
        editorEl.style.pointerEvents = 'auto';

        if (referenceOverlay) referenceOverlay.style.opacity = '1';
        if (fogLayerEl) fogLayerEl.style.opacity = '1';
    }
}

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
