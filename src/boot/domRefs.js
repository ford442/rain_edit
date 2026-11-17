// @ts-check

/**
 * Every static DOM node the boot graph needs, looked up once. Optional dock
 * controls may be `null` (the shell is hand-edited); required roots throw.
 *
 * @param {Document} [doc]
 */
export function queryDomRefs(doc = document) {
  /** @param {string} id */
  const el = (id) => /** @type {HTMLElement | null} */ (doc.getElementById(id));
  /** @param {string} id */
  const input = (id) => /** @type {HTMLInputElement | null} */ (doc.getElementById(id));
  /** @param {string} id */
  const select = (id) => /** @type {HTMLSelectElement | null} */ (doc.getElementById(id));
  /** @param {string} id */
  const canvas = (id) => /** @type {HTMLCanvasElement | null} */ (doc.getElementById(id));
  /**
   * @template T
   * @param {string} id
   * @param {T | null} node
   * @returns {T}
   */
  const required = (id, node) => {
    if (!node) throw new Error(`createApp: missing required #${id}`);
    return node;
  };

  return {
    container: el("container"),
    editorEl: required("editor", el("editor")),
    backCanvas: required("rain-back", canvas("rain-back")),
    frontCanvas: required("rain-front", canvas("rain-front")),
    connectionsCanvas: canvas("connections-layer"),
    matrixLayer: canvas("matrix-layer"),
    referenceLayer: el("reference-layer"),
    referenceOverlay: el("reference-overlay"),
    holoLayerEl: el("holo-layer"),
    echoLayerEl: el("echo-layer"),
    dustLayerEl: canvas("dust-layer"),
    fogLayerEl: el("fog-layer"),
    vignetteLayer: el("vignette-layer"),
    neonScatterLayer: el("neon-scatter-layer"),
    lightningLayer: el("lightning-layer"),
    portalLayer: el("portal-visuals"),
    radarCanvas: canvas("radar-canvas"),
    tabsContainerEl: el("tabs-container"),
    imageViewerEl: el("image-viewer"),
    dock: el("dock"),
    dockToggle: el("dock-toggle"),
    cabinetBtn: el("btn-cabinet"),
    vpsOpenBtn: el("btn-vps-open"),
    vpsSaveBtn: el("btn-vps-save"),
    btnDepthForward: el("btn-depth-forward"),
    btnDepthBack: el("btn-depth-back"),
    btnSonar: el("btn-sonar-ping"),
    btnZScan: el("btn-z-scan"),
    btnBlackHole: el("btn-black-hole-view"),
    btnExplode: el("btn-explode-view"),
    toggleBack: input("toggle-back"),
    toggleFront: input("toggle-front"),
    toggleFrontOnTop: input("toggle-front-on-top"),
    viewModeSelect: select("view-mode-select"),
    themeSelect: select("theme-select"),
    weatherModeSelect: select("weather-mode"),
    weatherAudioToggle: input("weather-audio-toggle"),
    opacitySlider: required("editor-opacity", input("editor-opacity")),
    intensitySlider: input("storm-intensity"),
    theaterToggle: input("theater-mode"),
    cinematicToggle: input("cinematic-autofocus-mode"),
    focusModeToggle: input("focus-mode"),
    lanternToggle: input("lantern-mode"),
    wiperToggle: input("wiper-mode"),
    exposeToggle: input("expose-mode"),
    portalToggle: input("portal-mode-toggle"),
    ghostToggle: input("ghost-mode"),
    blueprintToggle: input("blueprint-mode"),
    referenceInput: /** @type {HTMLTextAreaElement | null} */ (doc.getElementById("reference-input")),
    globalSearch: input("global-search"),
  };
}

/** @typedef {ReturnType<typeof queryDomRefs>} DomRefs */

/**
 * `#portal-visuals` hosts the `// @portal` rings; create it under
 * `#container` when the shell doesn't provide one.
 * @param {DomRefs} refs
 * @param {Document} [doc]
 * @returns {HTMLElement}
 */
export function ensurePortalLayer(refs, doc = document) {
  const layer = refs.portalLayer || doc.createElement("div");
  layer.id = "portal-visuals";
  Object.assign(layer.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "3",
  });
  if (refs.container && !layer.parentElement) refs.container.appendChild(layer);
  refs.portalLayer = layer;
  return layer;
}
