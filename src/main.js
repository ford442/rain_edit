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
import backFrag from './shaders/water-back.frag?glslify';
import frontFrag from './shaders/water.frag?glslify';
import vertSrc from './shaders/simple.vert?glslify';

const editorEl = document.getElementById('editor');
const backCanvas = document.getElementById('rain-back');
const frontCanvas = document.getElementById('rain-front');
const referenceLayer = document.getElementById('reference-layer');
if (referenceLayer) {
  referenceLayer.innerText = `# REFERENCE LAYER
Use this space for documentation, specs, or notes.
It sits behind the rain but remains readable.
**Toggle visibility with Alt key.**

## API Reference
- \`raindrops.clearDroplets(x, y, r)\`
- \`render(time)\`
- \`update()\`
`.trim();
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
  if (fogLayer) {
    fogLayer.style.setProperty('--mouse-x', e.clientX + 'px');
    fogLayer.style.setProperty('--mouse-y', e.clientY + 'px');
  }

  // Parallax for notes
  const notes = document.querySelectorAll('.note-card');
  notes.forEach(note => {
      const depth = parseFloat(note.dataset.depth) || 1;
      const initialRot = parseFloat(note.dataset.initialRot) || 0;
      // move opposite to mouse
      const moveX = -x * 30 * depth;
      const moveY = -y * 30 * depth;
      note.style.transform = `translate(${moveX}px, ${moveY}px) rotate(${initialRot}deg)`;
  });
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
    // We want the position of the line we just left or the new one?
    // Usually Enter creates a new line. We probably want to wipe the line we were on or the new empty space.
    // Let's wipe the Y position of the cursor.
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

  // Get the cursor position in editor coordinates
  const position = e.position;
  const scrolledVisiblePosition = editor.getScrolledVisiblePosition(position);

  if (scrolledVisiblePosition) {
    // The scrolledVisiblePosition is relative to the editor's content content area.
    // We need to map it to the canvas coordinates.
    // Raindrops expects logical pixels (CSS pixels), so we don't multiply by DPR here
    // because Raindrops handles density internally via this.dropletsPixelDensity and this.scale
    // Wait, let's verify. clearDroplets(x, y, r) uses (x-r)*density*scale.
    // If scale is DPR, and density is 1.
    // If we pass logical pixels, it becomes logical * DPR, which matches physical pixels on canvas.
    // Yes, that seems correct.

    // We need to add the editor's offset if any (it is at 0,0 relative to container)
    // scrolledVisiblePosition is relative to the editor instance viewport.

    // Just to be safe, let's use a slightly larger radius for the "wiper" effect
    const x = scrolledVisiblePosition.left;
    const y = scrolledVisiblePosition.top;

    // Clear droplets around the cursor
    raindrops.clearDroplets(x, y, 100);

    // Also clear a bit more for the line
    // raindrops.clearDroplets(x + 20, y, 80);
    // raindrops.clearDroplets(x - 20, y, 80);
  }
});

// --- Fog / Condensation Logic ---
const fogLayer = document.getElementById('fog-layer');
let lastActivity = Date.now();
let fogBlur = 0;

function updateFog() {
  const now = Date.now();
  const timeSinceActivity = now - lastActivity;

  // If idle for more than 2 seconds, start fogging up
  if (timeSinceActivity > 2000) {
    // Increase blur slowly up to 5px
    if (fogBlur < 5) {
      fogBlur += 0.02;
    }
  } else {
    // Clear fog immediately on activity
    fogBlur = 0;
  }

  // Apply to DOM
  if (fogLayer) {
    fogLayer.style.setProperty('--blur', Math.min(fogBlur, 5).toFixed(2) + 'px');
  }

  // Idle Blur for Editor (Erosion effect)
  if (editorEl) {
    let editorBlur = 0;
    if (timeSinceActivity > 4000) {
        // Slowly blur the editor text as time passes
        // Max blur 3px after ~10 seconds
        const factor = (timeSinceActivity - 4000) / 6000;
        editorBlur = Math.min(factor * 3, 3);
    }
    editorEl.style.filter = `blur(${editorBlur.toFixed(2)}px)`;
  }

  requestAnimationFrame(updateFog);
}
updateFog();

// Reset activity on interactions
['mousemove', 'keydown', 'mousedown', 'wheel'].forEach(evt => {
  window.addEventListener(evt, () => {
    lastActivity = Date.now();
    fogBlur = 0;
    if(fogLayer) fogLayer.style.setProperty('--blur', '0px');
    if(editorEl) editorEl.style.filter = 'blur(0px)';
  });
});


// --- Lightning Logic ---
const lightningLayer = document.getElementById('lightning-layer');

function triggerLightning() {
  if (!lightningLayer) return;

  // Flash brightness
  const brightness = 0.6 + Math.random() * 0.4; // 0.6 to 1.0 opacity
  lightningLayer.style.opacity = brightness;

  // Also briefly increase background rain brightness?
  // We can't easily access the shader uniform from here without refactoring,
  // but the overlay div does a good job.

  // Fade out quickly
  setTimeout(() => {
    lightningLayer.style.opacity = 0;
  }, 50 + Math.random() * 100);

  // Schedule next strike
  scheduleLightning();
}

function scheduleLightning() {
  // Random time between 10s and 30s
  const delay = 10000 + Math.random() * 20000;
  setTimeout(triggerLightning, delay);
}

// Start lightning loop
scheduleLightning();

// --- Reference Layer Logic ---
function updateScatteredNotes(text) {
  if (!referenceLayer) return;
  referenceLayer.innerHTML = ''; // Clear existing
  if (!text) return;

  // Split by headings (# ) or horizontal rules (---)
  // We use a regex to look ahead for # at start of line, or ---
  const parts = text.split(/(?:^|\n)(?=# )|(?:\n---)/g).filter(p => p && p.trim().length > 0);

  parts.forEach((part, index) => {
    // Basic markdown parsing for the part
    let safeText = part.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = safeText
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/^\- (.*$)/gim, '<div class="md-list-item">• $1</div>')
      .replace(/\n/gim, '<br>');

    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = html;

    // Deterministic random positioning based on index
    const seed = index * 1337;
    const rnd = (n) => {
        const x = Math.sin(seed + n) * 10000;
        return x - Math.floor(x);
    };

    const left = 10 + rnd(1) * 60; // 10% to 70%
    const top = 10 + rnd(2) * 60; // 10% to 70%
    const rot = -5 + rnd(3) * 10; // -5 to 5 deg
    const depth = 0.5 + rnd(4) * 1.5; // 0.5 to 2.0

    card.style.left = left + '%';
    card.style.top = top + '%';
    card.style.transform = `rotate(${rot}deg)`;
    card.dataset.initialRot = rot; // Store for parallax
    card.dataset.depth = depth;

    referenceLayer.appendChild(card);
  });
}

const referenceInput = document.getElementById('reference-input');
if (referenceInput && referenceLayer) {
    // preserve initial text but render it as markdown
    // We use innerText to get the source, assuming it was authored as markdown in the HTML
    const initialText = referenceLayer.innerText;
    // Clear raw text to render cards
    referenceLayer.innerText = '';
    referenceInput.value = initialText;

    updateScatteredNotes(initialText);

    referenceInput.addEventListener('input', (e) => {
        updateScatteredNotes(e.target.value);
    });
}

let isAltDown = false;
document.addEventListener('keydown', (e) => {
    // Toggle on Alt key
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
        // Hide editor, show reference
        editorEl.style.opacity = '0.05';
        editorEl.style.pointerEvents = 'none';

        if (referenceLayer) {
            referenceLayer.style.opacity = '0.9';
            referenceLayer.style.filter = 'blur(0px)';
            referenceLayer.style.background = 'rgba(0,0,0,0.6)'; // Darken bg to read better
        }
        // Clear fog temporarily
        if (fogLayer) fogLayer.style.opacity = '0';

    } else {
        // Restore
        editorEl.style.opacity = opacitySlider.value;
        editorEl.style.pointerEvents = 'auto';

        if (referenceLayer) {
            referenceLayer.style.opacity = '0.2';
            referenceLayer.style.filter = 'blur(2px)';
            referenceLayer.style.background = 'radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, transparent 70%)';
        }
        if (fogLayer) fogLayer.style.opacity = '1';
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
