// @ts-check
/**
 * View-mode registry — the single list of TabManager's 3D view modes.
 *
 * Each row names one mode; everything else is derived from it:
 *   - select value        `value`               (index.html #view-mode-select)
 *   - toggle method       `toggle${name}View`   (public, stable API)
 *   - state flag          `is${name}View`       (read-only getter)
 *   - body class          `${value}-active`     (unless `bodyClass` overrides)
 *   - dock button         `#btn-${value}-view`  (optional; `.active` toggled)
 *   - echo layout         LAYOUTS[value]        (src/tabManager/layouts/)
 *
 * Adding a mode = one row here + one pure layout function + its CSS. Do not add
 * a new mode until EchoLayer virtualization covers it (it does, automatically).
 */

/**
 * How an echo reacts while hovered.
 *   front   pull to tz = 100px (default)
 *   pop     tz += 150px from its placement
 *   flatten pop, and zero the roll (pinboard/vortex)
 *   orbit   push --orbit-tz out by 100px
 *   scatter pull --scatter-z forward by 150px
 *   none    leave the placement alone
 * @typedef {"front" | "pop" | "flatten" | "orbit" | "scatter" | "none"} EchoHover
 */

/**
 * @typedef {object} ViewMode
 * @property {string} value      select value + session key
 * @property {string} name       PascalCase stem for toggle/flag names
 * @property {string} [bodyClass] defaults to `${value}-active`
 * @property {EchoHover} [hover] defaults to "front"
 * @property {boolean} [semanticGravity] same-language pull; defaults to true
 * @property {number} [tint]     fixed echo hue (deg) instead of the per-file tint
 */

/** @type {readonly ViewMode[]} */
export const VIEW_MODES = Object.freeze([
  // Spatial & environment
  { value: "hyper-thread", name: "HyperThread" },
  { value: "abyssal-trench", name: "AbyssalTrench" },
  { value: "celestial-sphere", name: "CelestialSphere" },
  { value: "starlight-mesh", name: "StarlightMesh" },
  { value: "zenith-spiral", name: "ZenithSpiral" },
  { value: "cityscape", name: "Cityscape" },
  { value: "house-of-cards", name: "HouseOfCards" },
  { value: "floating-nexus", name: "FloatingNexus" },
  { value: "holographic-cylinder", name: "HolographicCylinder" },
  { value: "cascading-depth", name: "CascadingDepth" },
  { value: "time-tunnel", name: "TimeTunnel", hover: "none" },
  { value: "theater", name: "Theater" },
  { value: "tornado", name: "Tornado" },
  { value: "aurora", name: "Aurora" },
  { value: "quantum-web", name: "QuantumWeb" },
  { value: "waterfall", name: "Waterfall" },
  { value: "cascade", name: "Cascade", hover: "none", semanticGravity: false },
  { value: "scattered", name: "Scattered", hover: "scatter", semanticGravity: false },
  { value: "tunnel", name: "Tunnel", semanticGravity: false },
  { value: "meteor", name: "Meteor", hover: "pop" },
  { value: "vortex", name: "Vortex", hover: "flatten", semanticGravity: false },
  { value: "black-hole", name: "BlackHole" },
  { value: "galaxy", name: "Galaxy" },
  { value: "cyclone", name: "Cyclone" },
  { value: "prismatic-array", name: "PrismaticArray" },
  // Geometric
  { value: "isometric", name: "Isometric", semanticGravity: false },
  { value: "grid", name: "Grid", semanticGravity: false },
  { value: "helix", name: "Helix", hover: "pop", semanticGravity: false },
  { value: "prism", name: "Prism", hover: "pop", semanticGravity: false },
  { value: "prism-split", name: "PrismSplit" },
  { value: "sphere", name: "Sphere", hover: "pop", semanticGravity: false },
  { value: "wave", name: "Wave", hover: "pop", semanticGravity: false },
  { value: "cylinder", name: "Cylinder", hover: "pop", semanticGravity: false },
  { value: "pyramid", name: "Pyramid" },
  { value: "crystal", name: "Crystal" },
  { value: "fractal", name: "Fractal", semanticGravity: false },
  { value: "tesseract", name: "Tesseract" },
  { value: "mobius", name: "Mobius" },
  { value: "hexagon-matrix", name: "HexagonMatrix" },
  { value: "torus", name: "Torus" },
  { value: "hypercube", name: "Hypercube" },
  { value: "dna-helix", name: "DnaHelix" },
  { value: "shattered-glass", name: "ShatteredGlass" },
  { value: "venetian", name: "Venetian" },
  { value: "stackdeck", name: "StackDeck", bodyClass: "stack-deck-active" },
  { value: "card-spread", name: "CardSpread" },
  // Layout & organization
  { value: "orbit", name: "Orbit", hover: "orbit", semanticGravity: false },
  { value: "stack", name: "Stack", semanticGravity: false },
  { value: "timeline", name: "Timeline" },
  { value: "carousel", name: "Carousel" },
  { value: "accordion", name: "Accordion", hover: "none" },
  { value: "infinity-mirror", name: "InfinityMirror" },
  { value: "archway", name: "Archway", semanticGravity: false },
  { value: "pinboard", name: "Pinboard", hover: "flatten", semanticGravity: false },
  { value: "constellation", name: "Constellation", semanticGravity: false },
  { value: "coverflow", name: "Coverflow", hover: "none", semanticGravity: false },
  { value: "chrono-ring", name: "ChronoRing" },
  { value: "ribbon", name: "Ribbon" },
  { value: "rolodex", name: "Rolodex", hover: "pop", semanticGravity: false },
  { value: "staircase", name: "Staircase" },
  { value: "solar-system", name: "SolarSystem" },
  { value: "bookshelf", name: "Bookshelf" },
  { value: "astrolabe", name: "Astrolabe" },
  { value: "dominoes", name: "Dominoes" },
  { value: "kaleidoscope", name: "Kaleidoscope" },
  // Sci-fi & abstract
  { value: "synapse-web", name: "SynapseWeb" },
  {
    value: "quantum",
    name: "QuantumSuperposition",
    bodyClass: "quantum-superposition-active",
  },
  { value: "cosmic-thread", name: "CosmicThread" },
  { value: "luminous-cortex", name: "LuminousCortex" },
  { value: "data-hive", name: "DataHive" },
  { value: "origami", name: "Origami" },
  {
    value: "matrix-rain",
    name: "MatrixRain",
    hover: "pop",
    semanticGravity: false,
    tint: 120,
  },
  { value: "neon-synth", name: "NeonSynth", hover: "pop", semanticGravity: false },
  { value: "blueprint-3d", name: "Blueprint3d", hover: "pop", semanticGravity: false },
  { value: "cyber-cortex", name: "CyberCortex", hover: "pop", semanticGravity: false },
  { value: "outline", name: "Outline" },
  { value: "luminescence", name: "Luminescence" },
  { value: "ethereal-canyon", name: "EtherealCanyon" },
  { value: "geode", name: "Geode" },
  { value: "lotus", name: "Lotus" },
  { value: "fibonacci-spiral", name: "FibonacciSpiral" },
]);

/** @type {ReadonlyMap<string, ViewMode>} */
const BY_VALUE = new Map(VIEW_MODES.map((m) => [m.value, m]));

/**
 * @param {string | null | undefined} value
 * @returns {ViewMode | undefined}
 */
export function getViewMode(value) {
  return value ? BY_VALUE.get(value) : undefined;
}

/**
 * @param {ViewMode} mode
 * @returns {string}
 */
export function bodyClassFor(mode) {
  return mode.bodyClass ?? `${mode.value}-active`;
}

/**
 * @param {ViewMode} mode
 * @returns {string}
 */
export function toggleMethodFor(mode) {
  return `toggle${mode.name}View`;
}

/**
 * @param {ViewMode} mode
 * @returns {string}
 */
export function flagFor(mode) {
  return `is${mode.name}View`;
}

/**
 * @param {ViewMode} mode
 * @returns {string}
 */
export function buttonIdFor(mode) {
  return `btn-${mode.value}-view`;
}

/** Every body class any view mode can set (for clearing). */
export const VIEW_MODE_BODY_CLASSES = Object.freeze(VIEW_MODES.map(bodyClassFor));

/**
 * Behavior knobs for the echo layer, with defaults applied.
 * @param {string} value  "" = default view
 * @returns {{ hover: EchoHover, semanticGravity: boolean, tint: number | null }}
 */
export function echoBehavior(value) {
  const mode = getViewMode(value);
  return {
    hover: mode?.hover ?? "front",
    semanticGravity: mode?.semanticGravity ?? true,
    tint: mode?.tint ?? null,
  };
}
