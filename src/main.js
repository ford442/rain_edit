import * as monaco from 'monaco-editor';
import RainLayer from './RainLayer';
import Raindrops from '../../ra1n/src/raindrops.js';
import backFrag from './shaders/water-back.frag';
import frontFrag from './shaders/water.frag';
import vertSrc from './shaders/simple.vert';

const editorEl = document.getElementById('editor');
const backCanvas = document.getElementById('rain-back');
const frontCanvas = document.getElementById('rain-front');

// create Monaco editor
const editor = monaco.editor.create(editorEl, {
  value: ['// rain-2 demo','function hello(){','  console.log("hello world");','}'].join('\n'),
  language: 'javascript',
  theme: 'vs-light',
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

// create a Raindrops instance (re-uses original simulation)
const dpi = window.devicePixelRatio || 1;
const raindrops = new Raindrops(backCanvas.width, backCanvas.height, dpi, new Image(), new Image());

// create layers (async init)
let bgLayer = null;
let fgLayer = null;

// helper to load image (tries to reuse parent repo assets)
function awaitImage(src){
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  return new Promise((resolve) => { img.onload = () => resolve(img); img.onerror = () => resolve(img); });
}

async function initLayers(){
  const bgImg = await awaitImage('/ra1n/img/weather/texture-rain-bg.png');
  const fgImg = await awaitImage('/ra1n/img/weather/texture-rain-fg.png');

  bgLayer = new RainLayer(backCanvas, { vertex: vertSrc, fragment: backFrag, textures: { u_waterMap: raindrops.canvas, u_textureBg: bgImg }, options: {} });
  fgLayer = new RainLayer(frontCanvas, { vertex: vertSrc, fragment: frontFrag, textures: { u_waterMap: raindrops.canvas, u_textureFg: fgImg, u_textureBg: bgImg }, options: {} });

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
  bgLayer.setParallax(x*0.4, y*0.4);
  fgLayer.setParallax(x, y);
});

// controls
document.getElementById('toggle-back').addEventListener('change', (e) => bgLayer.setVisible(e.target.checked));
document.getElementById('toggle-front').addEventListener('change', (e) => fgLayer.setVisible(e.target.checked));
document.getElementById('toggle-front-on-top').addEventListener('change', (e) => {
  if(e.target.checked){
    frontCanvas.style.zIndex = 2; editorEl.style.zIndex = 1;
  } else {
    frontCanvas.style.zIndex = 0; editorEl.style.zIndex = 1;
  }
});

animate();
