import RainLayer from "../RainLayer";
import { WaterMapSim } from "./WaterMapSim.js";
import { createRainEffects } from "./rainEffects.js";
import { resizeCanvasToDisplaySize } from "../rendering/createGLContext.js";
import backFrag from "../shaders/water-back.frag?glslify";
import frontFrag from "../shaders/water.frag?glslify";
import vertSrc from "../shaders/simple.vert?glslify";

const RAIN_CHANCE_DEFAULT = 0.3;
const RAIN_CHANCE_CABINET = 0.12;
const RAIN_CHANCE_CABINET_FACTOR = RAIN_CHANCE_CABINET / RAIN_CHANCE_DEFAULT;

/** @param {string} src */
function awaitImage(src) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  return new Promise((resolve) => {
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
  });
}

/**
 * The dual-layer WebGL rain: water-map simulation, back/front refraction
 * passes, and the per-frame droplet-clearing effects.
 *
 * Runs as the AppClock `rain` task. While the 3D cabinet is open the task
 * also renders the cabinet (`cabinet3D.renderFrame()`) and uploads its canvas
 * as the rain background texture in the same tick — see
 * `docs/rendering-contexts.md` for why render + upload must be adjacent.
 * The task idles while either WebGL context is lost and resumes once both are
 * restored.
 */
export class RainScene {
  /**
   * @param {{
   *   backCanvas: HTMLCanvasElement,
   *   frontCanvas: HTMLCanvasElement,
   *   editorEl: HTMLElement,
   *   clock: import("../runtime/AppClock.js").AppClock,
   *   weatherSystem: import("./WeatherSystem.js").WeatherSystem,
   *   ctx: Partial<typeof import("../appContext.js")>,
   *   onRaindrops?: (sim: WaterMapSim) => void,
   *   onLayers?: (layers: { bgLayer: RainLayer, fgLayer: RainLayer }) => void,
   * }} deps
   */
  constructor({ backCanvas, frontCanvas, editorEl, clock, weatherSystem, ctx, onRaindrops, onLayers }) {
    this.backCanvas = backCanvas;
    this.frontCanvas = frontCanvas;
    this.editorEl = editorEl;
    this.clock = clock;
    this.weatherSystem = weatherSystem;
    this.ctx = ctx;
    this.onRaindrops = onRaindrops;
    this.onLayers = onLayers;
    this.effects = createRainEffects();
    /** @type {WaterMapSim | null} */
    this.raindrops = null;
    /** @type {RainLayer | null} */
    this.bgLayer = null;
    /** @type {RainLayer | null} */
    this.fgLayer = null;
    this.ready = false;
    this.contextPaused = false;
    /** Max device-pixel ratio for the rain canvases (lowered under low LOD). */
    this.dprCap = Infinity;
    /** @type {HTMLImageElement | null} */
    this._staticBgImg = null;
    /** @type {HTMLImageElement | null} */
    this._staticFgImg = null;
    this._usingCabinetBg = false;
    this._cabinetWasVisible = false;
  }

  /** True when this tick's rain task will render the cabinet itself. */
  get rendersCabinet() {
    return this.ready && !this.contextPaused;
  }

  resize() {
    const sizingElement = this.backCanvas.parentElement || this.editorEl;
    const rect = sizingElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    if (this.bgLayer) this.bgLayer.setSize(rect.width, rect.height, dpr);
    else resizeCanvasToDisplaySize(this.backCanvas, rect.width, rect.height, dpr);
    if (this.fgLayer) this.fgLayer.setSize(rect.width, rect.height, dpr);
    else resizeCanvasToDisplaySize(this.frontCanvas, rect.width, rect.height, dpr);
  }

  /** @param {number} cap */
  setDprCap(cap) {
    if (cap === this.dprCap) return;
    this.dprCap = cap;
    this.resize();
  }

  async init() {
    const bgImg =
      (await awaitImage("./img/texture-rain-bg.png")) ||
      (await awaitImage("/ra1n/img/weather/texture-rain-bg.png"));
    const fgImg =
      (await awaitImage("./img/texture-rain-fg.png")) ||
      (await awaitImage("/ra1n/img/weather/texture-rain-fg.png"));
    this._staticBgImg = bgImg;
    this._staticFgImg = fgImg;
    const dropAlpha =
      (await awaitImage("./img/drop-alpha.png")) ||
      (await awaitImage("/ra1n/img/drop-alpha.png"));
    const dropColor =
      (await awaitImage("./img/drop-color.png")) ||
      (await awaitImage("/ra1n/img/drop-color.png"));

    const raindrops = await WaterMapSim.create(
      this.backCanvas.width,
      this.backCanvas.height,
      window.devicePixelRatio || 1,
      dropAlpha,
      dropColor,
    );
    this.raindrops = raindrops;
    this.onRaindrops?.(raindrops);
    this._bindBackendSelect(raindrops);

    const lifecycle = {
      onContextLost: () => {
        this.contextPaused = true;
      },
      onContextRestored: () => {
        if (this.bgLayer?.contextLost || this.fgLayer?.contextLost) return;
        this.contextPaused = false;
      },
    };

    this.bgLayer = new RainLayer(this.backCanvas, {
      vertex: vertSrc,
      fragment: backFrag,
      textures: { u_waterMap: raindrops.canvas, u_textureBg: bgImg },
      options: { u_brightness: 1.0 },
      ...lifecycle,
    });
    this.fgLayer = new RainLayer(this.frontCanvas, {
      vertex: vertSrc,
      fragment: frontFrag,
      textures: {
        u_waterMap: raindrops.canvas,
        u_textureFg: fgImg,
        u_textureBg: bgImg,
      },
      options: {
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
      },
      ...lifecycle,
    });
    this.onLayers?.({ bgLayer: this.bgLayer, fgLayer: this.fgLayer });
    this.resize();

    this.weatherSystem.attach({ raindrops, bgLayer: this.bgLayer, fgLayer: this.fgLayer });

    this.clock.register({
      id: "rain",
      active: () => this.rendersCabinet,
      update: () => this._update(),
      render: () => this._render(),
    });
    this.ready = true;
    return this;
  }

  /** @param {WaterMapSim} raindrops */
  _bindBackendSelect(raindrops) {
    const select = /** @type {HTMLSelectElement | null} */ (
      document.getElementById("rain-sim-backend")
    );
    if (!select) return;
    select.value = raindrops.preference || raindrops.backend;
    select.addEventListener("change", async () => {
      try {
        await raindrops.setBackend(/** @type {any} */ (select.value));
        console.info("[rain] water-map backend:", raindrops.getDiagnostics());
      } catch (err) {
        console.warn("[rain] failed to switch water-map backend", err);
      }
      select.value = raindrops.preference || raindrops.backend;
    });
  }

  _update() {
    const raindrops = /** @type {WaterMapSim} */ (this.raindrops);
    const { cabinet3D, referenceManager, tabManager } = this.ctx;

    // Calm the rain while the cabinet is open.
    if (cabinet3D && cabinet3D.visible !== this._cabinetWasVisible) {
      this.weatherSystem.setSceneMultiplier(cabinet3D.visible ? RAIN_CHANCE_CABINET_FACTOR : 1);
      this._cabinetWasVisible = cabinet3D.visible;
    }

    // rainChance / dropletsRate / refraction from weather mode + editor activity.
    this.weatherSystem.update();
    raindrops.update();
    this.bgLayer?.bindTexture("u_waterMap", raindrops.canvas);
    this.fgLayer?.bindTexture("u_waterMap", raindrops.canvas);

    // Rain shield around the focused note card.
    const rect = referenceManager?.getFocusedNoteRect();
    if (rect) {
      raindrops.clearDroplets(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        Math.max(rect.width, rect.height) / 1.8,
      );
    }

    // Cabinet hover clears, splash decay, wipe animations.
    this.effects.tick(raindrops);

    // Keep the hover clear alive while the cursor rests on a cube, plus four
    // small orbiting clears that read as water parting around glass.
    if (cabinet3D?.visible) {
      const hPos = cabinet3D.getHoverScreenPos();
      if (hPos) {
        raindrops.clearDroplets(hPos.x, hPos.y, hPos.r);
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

    // At depth 1 (editor between rain layers) stochastically clear small
    // centre-biased patches (~30/s) to calm the storm where the user edits.
    const active = tabManager?.files?.find((f) => f.id === tabManager.activeId);
    if (active && (active.depth ?? 1) === 1 && Math.random() < 0.5) {
      const r = this.editorEl.getBoundingClientRect();
      const gx = (Math.random() + Math.random() - 1) * 0.42;
      const gy = (Math.random() + Math.random() - 1) * 0.42;
      raindrops.clearDroplets(
        r.left + r.width * (0.5 + gx),
        r.top + r.height * (0.5 + gy),
        14 + Math.random() * 12,
      );
    }
  }

  _render() {
    const { bgLayer, fgLayer } = this;
    const cabinet3D = this.ctx.cabinet3D;

    // While the cabinet is open, render it and upload its live canvas as the
    // rain background in the same tick (no preserveDrawingBuffer needed).
    if (cabinet3D && cabinet3D.visible) {
      cabinet3D.renderFrame();
      const cabCanvas = cabinet3D.getRendererCanvas();
      const uploadStart = performance.now();
      bgLayer?.bindTexture("u_textureBg", cabCanvas);
      if (fgLayer) {
        fgLayer.bindTexture("u_textureBg", cabCanvas);
        fgLayer.bindTexture("u_textureFg", cabCanvas);
      }
      cabinet3D.recordRainTextureUpload(performance.now() - uploadStart);
      this._usingCabinetBg = true;
    } else if (this._usingCabinetBg) {
      if (this._staticBgImg) {
        bgLayer?.bindTexture("u_textureBg", this._staticBgImg);
        fgLayer?.bindTexture("u_textureBg", this._staticBgImg);
      }
      if (this._staticFgImg) fgLayer?.bindTexture("u_textureFg", this._staticFgImg);
      this._usingCabinetBg = false;
    }

    bgLayer?.render();
    fgLayer?.render();
  }
}
