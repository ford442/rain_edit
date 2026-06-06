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

window.initLayers = async function initLayers() {
  initDust();
  // load texture and drop images; attempt to use copied public images first
  const bgImg =
    (await awaitImage("./img/texture-rain-bg.png")) ||
    (await awaitImage("/ra1n/img/weather/texture-rain-bg.png"));
  const fgImg =
    (await awaitImage("./img/texture-rain-fg.png")) ||
    (await awaitImage("/ra1n/img/weather/texture-rain-fg.png"));
  _staticBgImg = bgImg;
  _staticFgImg = fgImg;
  const dropAlpha =
    (await awaitImage("./img/drop-alpha.png")) ||
    (await awaitImage("/ra1n/img/drop-alpha.png"));
  const dropColor =
    (await awaitImage("./img/drop-color.png")) ||
    (await awaitImage("/ra1n/img/drop-color.png"));

  const dpi = window.devicePixelRatio || 1;
  raindrops = new Raindrops(
    backCanvas.width,
    backCanvas.height,
    dpi,
    dropAlpha,
    dropColor,
  );

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
  bgLayer = new RainLayer(backCanvas, {
    vertex: vertSrc,
    fragment: backFrag,
    textures: { u_waterMap: raindrops.canvas, u_textureBg: bgImg },
    options: { u_brightness: 1.0 },
  });
  fgLayer = new RainLayer(frontCanvas, {
    vertex: vertSrc,
    fragment: frontFrag,
    textures: {
      u_waterMap: raindrops.canvas,
      u_textureFg: fgImg,
      u_textureBg: bgImg,
    },
    options,
  });

  // Pass raindrops to reference manager for shield effect
  if (referenceManager) {
    referenceManager.setRaindrops(raindrops);
  }

  // simple animation loop
  // Rain intensity: calm near focused 3D content, default otherwise
  const RAIN_CHANCE_DEFAULT = 0.3;
  const RAIN_CHANCE_CABINET = 0.12;
  let _cabinetWasVisible = false;

  function animate() {
    // Modulate rain density when cabinet opens/closes
    if (cabinet3D) {
      if (cabinet3D.visible && !_cabinetWasVisible) {
        raindrops.options.rainChance = RAIN_CHANCE_CABINET;
        _cabinetWasVisible = true;
      } else if (!cabinet3D.visible && _cabinetWasVisible) {
        raindrops.options.rainChance = RAIN_CHANCE_DEFAULT;
        _cabinetWasVisible = false;
      }
    }

    raindrops.update(); // updates raindrops.canvas internally
    // update texture bindings from the raindrops canvas
    if (bgLayer) bgLayer.bindTexture("u_waterMap", raindrops.canvas);
    if (fgLayer) fgLayer.bindTexture("u_waterMap", raindrops.canvas);

    const time = performance.now() / 1000;
    if (connectionManager && typeof connectionManager.draw === "function") {
      connectionManager.draw(time);
      if (typeof connectionManager.drawRadar === "function") {
        connectionManager.drawRadar(time);
      }

      if (
        document.body.classList.contains("constellation-active") &&
        typeof connectionManager.drawConstellationLines === "function"
      ) {
        connectionManager.drawConstellationLines(time);
      }
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

    // Tick rain effects: cabinet hover clears, splash decays, wipe animations
    rainEffects.tick(raindrops);

    // ── Continuous hover clearing ───────────────────────────────────────────
    // cabinet-rain-clear events only fire during mousemove; this keeps the clear
    // alive while the cursor is stationary over a cube, and adds an orbital flow
    // pattern that looks like rain water parting around the 3D object.
    if (cabinet3D?.visible && raindrops) {
      const hPos = cabinet3D.getHoverScreenPos();
      if (hPos) {
        raindrops.clearDroplets(hPos.x, hPos.y, hPos.r);
        // 4 small clears rotating around the cube — evokes water flowing around glass
        const ft = performance.now() * 0.0015;
        const orbitR = hPos.r * 0.6;
        for (let i = 0; i < 4; i++) {
          const angle = ft + i * (Math.PI * 0.5);
          raindrops.clearDroplets(
            hPos.x + Math.cos(angle) * orbitR,
            hPos.y + Math.sin(angle) * orbitR,
            hPos.r * 0.22,
          );
        }
      }
    }

    // ── Local storm calming near the focused document ───────────────────────
    // At depth 1 (editor between rain layers), stochastically clear small patches
    // across the editor area ~30×/sec, biased toward centre.  This statistically
    // reduces droplet density where the user is editing without a hard wipe.
    if (raindrops) {
      const _af = tabManager?.files?.find((f) => f.id === tabManager.activeId);
      if (_af && (_af.depth ?? 1) === 1) {
        const rect = editorEl.getBoundingClientRect();
        // ~50 % chance per frame ≈ 30 clears / sec; two uniform samples averaged
        // approximate a centred Gaussian without trig
        if (Math.random() < 0.5) {
          const gx = (Math.random() + Math.random() - 1) * 0.42;
          const gy = (Math.random() + Math.random() - 1) * 0.42;
          raindrops.clearDroplets(
            rect.left + rect.width * (0.5 + gx),
            rect.top + rect.height * (0.5 + gy),
            14 + Math.random() * 12,
          );
        }
      }
    }

    // When Cabinet3D is open, feed its live canvas as the rain background texture
    // so droplets refract the 3D scene. Restore static images when it closes.
    if (cabinet3D && cabinet3D.visible) {
      const cabCanvas = cabinet3D.getRendererCanvas();
      if (bgLayer) bgLayer.bindTexture("u_textureBg", cabCanvas);
      if (fgLayer) {
        fgLayer.bindTexture("u_textureBg", cabCanvas);
        fgLayer.bindTexture("u_textureFg", cabCanvas);
      }
      _usingCabinetBg = true;
    } else if (_usingCabinetBg) {
      if (bgLayer && _staticBgImg)
        bgLayer.bindTexture("u_textureBg", _staticBgImg);
      if (fgLayer && _staticBgImg)
        fgLayer.bindTexture("u_textureBg", _staticBgImg);
      if (fgLayer && _staticFgImg)
        fgLayer.bindTexture("u_textureFg", _staticFgImg);
      _usingCabinetBg = false;
    }

    if (bgLayer) bgLayer.render();
    if (fgLayer) fgLayer.render();

    if (fogManager) fogManager.render();
    drawMatrix();
    drawDust(time);
    requestAnimationFrame(animate);
  }

  animate();
};

initLayers();

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

window.isFlashlightActive = false;

window.isAltDragActive = false;

window.altDragStartX = 0;

window.altDragStartY = 0;

window.sceneRotX = 0;

window.sceneRotY = 0;

window.currentSceneRotX = 0;

window.currentSceneRotY = 0;

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

window.isWormholeActive = false;

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

window.holographicMinimap = null;

if (document.getElementById("radar-canvas")) {
  holographicMinimap = new HolographicMinimap("radar-canvas");
}

window.addEventListener("resize", () => {
  const dockEl = document.getElementById("dock");
  const tabsEl = document.getElementById("tabs-container");
  if (dockEl) dockEl._origRect = null;
  if (tabsEl) tabsEl._origRect = null;
});

window.isTesseractDragging = false;

window.tesseractLastX = 0;

window.tesseractLastY = 0;

window.tesseractRotX = 0;

window.tesseractRotY = 0;

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
