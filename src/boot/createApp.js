// @ts-check
import { monaco } from "../editor/setupMonaco.js";
import * as appContext from "../appContext.js";
import { setAppContext } from "../appContext.js";
import { appClock, resolveLodMode } from "../runtime/AppClock.js";
import { queryDomRefs, ensurePortalLayer } from "./domRefs.js";
import { INITIAL_MARKDOWN, INITIAL_CODE } from "./initialContent.js";
import { createFileActions } from "./fileActions.js";
import { registerAppBindings } from "./appBindings.js";
import { bindDockControls } from "./dockControls.js";
import { bindEditorEffects } from "./editorEffects.js";
import { bindGlobalListeners } from "./globalListeners.js";
import { ReferenceManager } from "../ReferenceManager.js";
import { ConnectionManager } from "../ConnectionManager.js";
import { FogManager } from "../FogManager.js";
import { HoloManager } from "../HoloManager.js";
import { TabManager } from "../TabManager.js";
import { StorageAPI } from "../StorageAPI.js";
import { Cabinet3D } from "../Cabinet3D.js";
import { VPSFileBrowser } from "../VPSFileBrowser.js";
import DataSiphon from "../DataSiphon.js";
import { VeilExcavator } from "../VeilExcavator.js";
import { HolographicMinimap } from "../HolographicMinimap.js";
import { WeatherSystem } from "../rain/WeatherSystem.js";
import { WeatherAudio } from "../audio/WeatherAudio.js";
import { RainScene } from "../rain/RainScene.js";
import { WorkspaceSession, setWorkspaceSession } from "../workspace/WorkspaceSession.js";
import { LocalProject } from "../workspace/LocalProject.js";
import { MatrixRain } from "../effects/MatrixRain.js";
import { HoloDust } from "../effects/HoloDust.js";
import { FocusDepth } from "../effects/FocusDepth.js";
import { CinematicFocus } from "../effects/CinematicFocus.js";
import { Wiper } from "../effects/Wiper.js";
import { PortalMasks } from "../effects/PortalMasks.js";
import { Sonar } from "../effects/Sonar.js";
import { Atmosphere } from "../rain/Atmosphere.js";
import { DayCycle } from "../rain/DayCycle.js";
import { resizeCanvasToDisplaySize } from "../rendering/createGLContext.js";
import { get2DContextInfo, resolveDesync2D } from "../rendering/create2DContext.js";
import { ShaderDebugOverlay } from "../rendering/ShaderDebugOverlay.js";
import { inputManager as sharedInputManager } from "../interactions/InputManager.js";
import { initEchoDocumentInteractions } from "../interactions/EchoDocumentInteractions.js";
import { initDepthGestures } from "../interactions/initDepthGestures.js";
import { initInteractions } from "../interactions/initInteractions.js";

/**
 * @typedef {object} CreateAppOptions
 * @property {Document} [doc]
 * @property {Window} [win]
 * @property {import("../runtime/AppClock.js").AppClock} [clock]
 */

/**
 * Build the whole application in one explicit, ordered construction graph:
 * DOM refs → managers (published through `appContext.js`) → effects →
 * listeners/bindings → interactions → the AppClock frame loop.
 *
 * Nothing here writes `window.*` except `window.tabManager`, the single
 * documented debug alias used by smoke tests and manual automation.
 *
 * @param {CreateAppOptions} [options]
 */
export function createApp({ doc = document, win = window, clock = appClock } = {}) {
  if (!sharedInputManager) throw new Error("createApp: InputManager needs a document");
  const inputManager = sharedInputManager;
  const refs = queryDomRefs(doc);
  const portalLayer = ensurePortalLayer(refs, doc);
  const { editorEl, echoLayerEl } = refs;
  const search = new URLSearchParams(win.location.search);
  /** @type {Storage | null} */
  let storage = null;
  try {
    storage = win.localStorage;
  } catch {
    // Storage blocked (private mode / sandbox): flags fall back to defaults.
  }
  // Rendering switches (docs/rendering-contexts.md): `?rainGL=webgl1` forces
  // the GLSL ES 1.00 fallback, `?cabinetCompositing=upload` the legacy
  // cross-context cabinet upload, `?desync2d=1` the low-latency 2D
  // experiment, `?shaderDebug=1` the diagnostics overlay.
  const forceWebGL1 = search.get("rainGL") === "webgl1";
  const cabinetCompositing = search.get("cabinetCompositing") === "upload" ? "upload" : "shared";
  const desync2d = resolveDesync2D(win.location.search, storage);

  // ── Managers ────────────────────────────────────────────────────────────
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

  const referenceManager = new ReferenceManager(refs.referenceLayer, refs.referenceOverlay, monaco);
  const connectionManager = new ConnectionManager(refs.connectionsCanvas, referenceManager);
  const fogManager = new FogManager(refs.fogLayerEl);
  const editor = monaco.editor.create(editorEl, {
    theme: "transparent-vs-dark",
    automaticLayout: true,
    fontFamily: "JetBrains Mono",
    fontSize: 14,
    minimap: { enabled: false },
    scrollbar: { vertical: "hidden", horizontal: "hidden" },
  });
  const dataSiphon = new DataSiphon(editor);
  const tabManager = new TabManager(
    editor,
    monaco,
    editorEl,
    /** @type {HTMLElement} */ (refs.tabsContainerEl),
    /** @type {HTMLElement} */ (refs.imageViewerEl),
    /** @type {HTMLElement} */ (echoLayerEl),
  );
  const holoManager = new HoloManager(editor, refs.holoLayerEl);
  const storageAPI = new StorageAPI();
  const cabinet3D = new Cabinet3D(storageAPI, tabManager, monaco, {
    preserveDrawingBuffer: search.get("cabinetPreserveBuffer") === "1",
  });
  const veilExcavator = new VeilExcavator(tabManager);
  const vpsBrowser = new VPSFileBrowser(storageAPI, tabManager);
  const weatherAudio = new WeatherAudio();
  const weatherSystem = new WeatherSystem();
  weatherSystem.attach({ audio: weatherAudio });
  // Editor rain shield: rain calms around the focused editor.
  weatherSystem.setShieldSource(() => editorEl.getBoundingClientRect());
  const dayCycle = new DayCycle({
    onTextures: (set) => rainScene.setStaticTextures(set),
  });

  setAppContext({
    clock,
    tabManager,
    referenceManager,
    connectionManager,
    fogManager,
    holoManager,
    editor,
    editorEl,
    echoLayerEl,
    neonScatterLayer: refs.neonScatterLayer,
    storageAPI,
    cabinet3D,
    veilExcavator,
    vpsBrowser,
    weatherSystem,
    weatherAudio,
    dayCycle,
  });
  // Documented debug alias (smoke tests, manual automation). The only
  // window global createApp() installs.
  /** @type {any} */ (win).tabManager = tabManager;
  inputManager.setRefs(appContext);

  referenceManager.setConnectionManager(connectionManager);
  referenceManager.setFogManager(fogManager);
  if (refs.referenceLayer) referenceManager.update(INITIAL_MARKDOWN);

  // ── Workspace session ───────────────────────────────────────────────────
  const workspaceSession = setWorkspaceSession(
    new WorkspaceSession({
      tabManager,
      referenceManager,
      referenceInput: refs.referenceInput,
      viewModeSelect: refs.viewModeSelect,
      storageAPI,
    }),
  );
  workspaceSession.bindDockControls();
  workspaceSession.installUnloadGuard();
  const localProject = new LocalProject({ tabManager, workspaceSession });
  setAppContext({ workspaceSession, localProject });
  localProject.bindUi();

  const restored = workspaceSession
    .restore({ preferRemote: workspaceSession.remoteSync })
    .then((/** @type {boolean} */ didRestore) => {
      if (!didRestore && tabManager.files.length === 0) {
        tabManager.setActive(tabManager.addFile("main.js", INITIAL_CODE, "javascript"));
      }
      return didRestore;
    });
  const urlNote = search.get("note");
  if (urlNote) tabManager.openNoteAsTab(urlNote);

  // ── Rain + decorative layers ────────────────────────────────────────────
  const rainScene = new RainScene({
    backCanvas: refs.backCanvas,
    frontCanvas: refs.frontCanvas,
    editorEl,
    clock,
    weatherSystem,
    ctx: appContext,
    onRaindrops: (raindrops) => {
      setAppContext({ raindrops });
      referenceManager.setRaindrops(raindrops);
    },
    onLayers: ({ bgLayer, fgLayer }) => {
      setAppContext({ bgLayer, fgLayer });
      dayCycle.attachLayers(bgLayer, fgLayer);
    },
    forceWebGL1,
    cabinetCompositing,
  });
  setAppContext({ rainScene });

  const atmosphere = new Atmosphere({
    editor,
    monaco,
    weatherSystem,
    echoLayerEl,
    referenceLayer: refs.referenceLayer,
    vignetteLayer: refs.vignetteLayer,
    lightningLayer: refs.lightningLayer,
    win,
  });
  // Thunder follows lightning (scheduled on the audio clock, delayed by distance).
  atmosphere.onStrike((strike) => weatherAudio.thunder(strike));
  setAppContext({ atmosphere });
  const matrixRain = new MatrixRain(refs.matrixLayer, { desynchronized: desync2d });
  const holoDust = new HoloDust(refs.dustLayerEl, {
    getIntensity: () => 1 + atmosphere.stormCharCount * 0.05,
    desynchronized: desync2d,
  });

  const resizeCanvases = () => {
    rainScene.resize();
    const sizing = refs.backCanvas.parentElement || editorEl;
    const rect = sizing.getBoundingClientRect();
    const dpr = win.devicePixelRatio || 1;
    if (refs.matrixLayer) {
      resizeCanvasToDisplaySize(refs.matrixLayer, rect.width, rect.height, dpr);
      matrixRain.resize();
    }
    if (refs.dustLayerEl) {
      resizeCanvasToDisplaySize(refs.dustLayerEl, rect.width, rect.height, dpr);
    }
  };
  resizeCanvases();
  holoDust.init();

  const rainReady = rainScene.init().then(() => {
    weatherSystem.setManualIntensity(parseInt(refs.intensitySlider?.value ?? "30", 10));
    // DayCycle texture sets: the loaded rain set, plus sunlit textures that
    // are only fetched once a non-night time is chosen and only swapped in
    // after they finish loading.
    const rainSet = rainScene.getStaticTextures();
    if (rainSet) dayCycle.textureSets.rain = rainSet;
    const preloadSun = () => {
      if (dayCycle.textureSets.sun || dayCycle.getMode() === "night") return;
      const load = (/** @type {string} */ src) => {
        const img = new Image();
        img.src = src;
        return img;
      };
      dayCycle.textureSets.sun = {
        bg: load("./img/texture-sun-bg.png"),
        fg: load("./img/texture-sun-fg.png"),
      };
    };
    preloadSun();
    dayCycle.onModeChange(preloadSun);
    return rainScene;
  });
  rainReady.catch((err) => console.error("[rain] failed to initialize", err));

  // ── Effects ─────────────────────────────────────────────────────────────
  const focusDepth = new FocusDepth({
    editorEl,
    opacitySlider: refs.opacitySlider,
    referenceLayer: refs.referenceLayer,
    referenceOverlay: refs.referenceOverlay,
    fogLayerEl: refs.fogLayerEl,
    doc,
  });
  const portals = new PortalMasks({ editor, editorEl, portalLayer, clock, doc });
  const sonar = new Sonar({ editorEl, echoLayerEl, clock, portals, doc }).init();
  const cinematicFocus = new CinematicFocus({
    editorEl,
    echoLayerEl,
    opacitySlider: refs.opacitySlider,
    clock,
    doc,
  }).init();
  const wiper = new Wiper({ clock }).init();
  const minimap = refs.radarCanvas ? new HolographicMinimap("radar-canvas") : null;

  // ── Listeners, dock, editor, keyboard ───────────────────────────────────
  const fileActions = createFileActions({
    tabManager,
    storageAPI,
    vpsBrowser,
    cabinet3D,
    localProject,
    workspaceSession,
    vpsSaveBtn: refs.vpsSaveBtn,
  });
  refs.cabinetBtn?.addEventListener("click", () => cabinet3D.toggle());
  refs.vpsOpenBtn?.addEventListener("click", () => vpsBrowser.open());
  refs.vpsSaveBtn?.addEventListener("click", () => fileActions.saveActive());

  bindGlobalListeners({
    win,
    doc,
    editorEl,
    rainScene,
    fogManager,
    focusDepth,
    portals,
    sonar,
    onResize: resizeCanvases,
    onCabinetFile: fileActions.openCabinetFile,
  });
  bindDockControls({
    refs,
    tabManager,
    referenceManager,
    connectionManager,
    weatherSystem,
    weatherAudio,
    dayCycle,
    atmosphere,
    ctx: appContext,
    focusDepth,
    cinematicFocus,
    wiper,
    sonar,
    initialMarkdown: INITIAL_MARKDOWN,
  });
  bindEditorEffects({
    editor,
    monaco,
    editorEl,
    echoLayerEl,
    tabManager,
    referenceManager,
    connectionManager,
    fogManager,
    weatherSystem,
    rainScene,
    atmosphere,
    portals,
  });
  focusDepth.updateVisuals();
  portals.scan();
  atmosphere.start(clock);

  registerAppBindings(inputManager, {
    tabManager,
    editorEl,
    echoLayerEl,
    referenceManager,
    focusDepth,
    portals,
    sonar,
    fileActions,
    viewModeSelect: refs.viewModeSelect,
    win,
  });
  initEchoDocumentInteractions();
  const gestures = initDepthGestures(inputManager);
  // Start the keyboard dispatcher after every binding has registered.
  initInteractions(inputManager);

  // ── Frame clock ─────────────────────────────────────────────────────────
  // Order within a tick: every update, then every render, in registration
  // order. `rain` (registered once its textures load) renders the cabinet
  // and uploads it; `cabinet` covers the frames where rain can't.
  clock.register({
    id: "cabinet",
    active: () => cabinet3D.visible && !rainScene.rendersCabinet,
    render: () => cabinet3D.renderFrame(),
  });
  clock.register({
    id: "overlays",
    render: (_dt, t) => {
      const time = t / 1000;
      const cm = /** @type {any} */ (connectionManager);
      // ConnectionManager has no draw() today; kept so a future one is picked up.
      if (typeof cm.draw === "function") {
        cm.draw(time);
        cm.drawRadar?.(time);
        if (doc.body.classList.contains("constellation-active")) {
          cm.drawConstellationLines?.(time);
        }
      }
      referenceManager.render(time);
    },
  });
  // Weather world: time-of-day ramp, and the audio listener (cursor pan +
  // active tab depth). Atmosphere registered its own `atmosphere` task.
  dayCycle.apply();
  clock.register({ id: "day-cycle", update: (dt) => dayCycle.update(dt) });
  win.addEventListener(
    "pointermove",
    (e) => weatherAudio.setPan(e.clientX / Math.max(1, win.innerWidth)),
    { passive: true },
  );
  clock.register({
    id: "weather-listener",
    active: () => weatherAudio.isAudible(),
    update: () => {
      const active = tabManager.files.find((f) => f.id === tabManager.activeId);
      weatherAudio.setDepth(active?.depth ?? 1);
    },
  });
  clock.register({ id: "fog", priority: "decorative", render: () => fogManager.render() });
  clock.register({ id: "matrix", priority: "decorative", render: () => matrixRain.draw() });
  clock.register({ id: "dust", priority: "decorative", render: (_dt, t) => holoDust.draw(t / 1000) });
  if (minimap) {
    clock.register({
      id: "minimap",
      priority: "decorative",
      active: () => minimap.active,
      render: () => minimap.render(),
    });
  }

  if (search.get("shaderDebug") === "1") {
    const overlay = new ShaderDebugOverlay({
      doc,
      getSources: () => ({
        layers: [
          { label: "rain-back", diagnostics: appContext.bgLayer?.getDiagnostics() ?? null },
          { label: "rain-front", diagnostics: appContext.fgLayer?.getDiagnostics() ?? null },
        ],
        compositing: rainScene.getCompositingDiagnostics(),
        contexts2d: [matrixRain.ctx, holoDust.ctx, fogManager.ctx, minimap?.ctx].map((ctx) =>
          get2DContextInfo(ctx),
        ),
      }),
    }).init();
    // Not decorative: diagnostics keep reporting under low LOD.
    clock.register({ id: "shader-debug", render: (_dt, t) => overlay.tick(t) });
  }

  // Low LOD: decorative tasks stop (clear their canvases) and rain DPR caps at 1.
  clock.setLodMode(resolveLodMode());
  clock.onLodChange((lod) => {
    if (lod === "low") {
      matrixRain.clear();
      holoDust.clear();
    }
    rainScene.setDprCap(lod === "low" ? 1 : Infinity);
  });
  const nav = /** @type {any} */ (win.navigator);
  if (nav && typeof nav.getBattery === "function") {
    nav
      .getBattery()
      .then((/** @type {any} */ battery) => {
        const sync = () => clock.setBatteryState(battery);
        sync();
        battery.addEventListener("chargingchange", sync);
        battery.addEventListener("levelchange", sync);
      })
      .catch(() => {});
  }
  clock.start();

  return {
    clock,
    refs,
    editor,
    tabManager,
    referenceManager,
    connectionManager,
    fogManager,
    holoManager,
    dataSiphon,
    storageAPI,
    cabinet3D,
    veilExcavator,
    vpsBrowser,
    weatherSystem,
    weatherAudio,
    dayCycle,
    workspaceSession,
    localProject,
    rainScene,
    atmosphere,
    focusDepth,
    portals,
    sonar,
    cinematicFocus,
    wiper,
    matrixRain,
    holoDust,
    minimap,
    gestures,
    fileActions,
    /** Resolves once the rain layers are live. */
    rainReady,
    /** Resolves once the workspace session restore (or demo seed) finished. */
    restored,
  };
}

/** @typedef {ReturnType<typeof createApp>} App */
