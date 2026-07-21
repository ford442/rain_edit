import RainLayer from "./RainLayer";
import Raindrops from "./vendor/raindrops.js";
import { Cabinet3D } from "./Cabinet3D.js";
import { VPSFileBrowser } from "./VPSFileBrowser.js";
import { resizeCanvasToDisplaySize } from "./rendering/createGLContext.js";
import backFrag from "./shaders/water-back.frag?glslify";
import frontFrag from "./shaders/water.frag?glslify";
import vertSrc from "./shaders/simple.vert?glslify";


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
window.resizeCanvases = function resizeCanvases() {
  const sizingElement = backCanvas.parentElement || editorEl;
  const rect = sizingElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (bgLayer) bgLayer.setSize(rect.width, rect.height, dpr);
  else resizeCanvasToDisplaySize(backCanvas, rect.width, rect.height, dpr);

  if (fgLayer) fgLayer.setSize(rect.width, rect.height, dpr);
  else resizeCanvasToDisplaySize(frontCanvas, rect.width, rect.height, dpr);

  if (matrixLayer) {
    resizeCanvasToDisplaySize(matrixLayer, rect.width, rect.height, dpr);
    initMatrixRain();
  }

  if (dustLayerEl) {
    resizeCanvasToDisplaySize(dustLayerEl, rect.width, rect.height, dpr);
  }
};
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
window.awaitImage = function awaitImage(src) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  return new Promise((resolve) => {
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
  });
};
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
  let rainAnimationPaused = false;
  let rainAnimationFrame = null;

  const pauseRainAnimation = () => {
    rainAnimationPaused = true;
    if (rainAnimationFrame !== null) {
      cancelAnimationFrame(rainAnimationFrame);
      rainAnimationFrame = null;
    }
  };

  const resumeRainAnimation = () => {
    if (bgLayer?.contextLost || fgLayer?.contextLost) return;
    rainAnimationPaused = false;
    scheduleRainAnimation();
  };

  const rainContextLifecycle = {
    onContextLost: pauseRainAnimation,
    onContextRestored: resumeRainAnimation,
  };

  bgLayer = new RainLayer(backCanvas, {
    vertex: vertSrc,
    fragment: backFrag,
    textures: { u_waterMap: raindrops.canvas, u_textureBg: bgImg },
    options: { u_brightness: 1.0 },
    ...rainContextLifecycle,
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
    ...rainContextLifecycle,
  });
  resizeCanvases();

  // Pass raindrops to reference manager for shield effect
  if (referenceManager) {
    referenceManager.setRaindrops(raindrops);
  }

  // simple animation loop
  // Rain intensity: calm near focused 3D content, default otherwise
  const RAIN_CHANCE_DEFAULT = 0.3;
  const RAIN_CHANCE_CABINET = 0.12;
  let _cabinetWasVisible = false;

  function scheduleRainAnimation() {
    if (rainAnimationPaused || rainAnimationFrame !== null) return;
    rainAnimationFrame = requestAnimationFrame(animate);
  }

  function animate() {
    rainAnimationFrame = null;
    if (rainAnimationPaused) return;
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
      // Render and upload in the same RAF. This keeps the source pixels valid
      // without forcing preserveDrawingBuffer on the Three.js context.
      cabinet3D.renderFrame();
      const cabCanvas = cabinet3D.getRendererCanvas();
      const uploadStart = performance.now();
      if (bgLayer) bgLayer.bindTexture("u_textureBg", cabCanvas);
      if (fgLayer) {
        fgLayer.bindTexture("u_textureBg", cabCanvas);
        fgLayer.bindTexture("u_textureFg", cabCanvas);
      }
      cabinet3D.recordRainTextureUpload(performance.now() - uploadStart);
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
    scheduleRainAnimation();
  }

  scheduleRainAnimation();
};
window.fireSiphonPacket = function fireSiphonPacket(text, startX, startY) {
  const packet = document.createElement("div");
  packet.className = "siphon-packet";

  // Truncate long text for visual
  const displayStr = text.length > 20 ? text.substring(0, 20) + "..." : text;
  packet.textContent = displayStr;

  packet.style.left = startX + "px";
  packet.style.top = startY + "px";

  // Calculate destination (center of screen, approximating editor cursor if not known exactly in DOM coords)
  // A better approach would be mapping editor coords, but center screen works as a general "suck into editor" effect
  const destX = window.innerWidth / 2;
  const destY = window.innerHeight / 2;

  const dx = destX - startX;
  const dy = destY - startY;

  packet.style.setProperty("--dx", dx + "px");
  packet.style.setProperty("--dy", dy + "px");

  document.body.appendChild(packet);

  // Clean up
  setTimeout(() => {
    if (packet.parentNode) {
      packet.parentNode.removeChild(packet);
    }
  }, 600);
};
window._startAutofocusLoop = function _startAutofocusLoop() {
  if (!autofocusRafId) {
    _autofocusStep();
  }
};
window._stopAutofocusLoop = function _stopAutofocusLoop() {
  if (autofocusRafId) {
    cancelAnimationFrame(autofocusRafId);
    autofocusRafId = null;
  }
  // Reset echoes
  if (echoLayerEl) {
    echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
      doc.style.removeProperty("--af-blur");
      doc.style.removeProperty("--af-brightness");
    });
  }
};
