// @ts-check
/**
 * Echo layout registry: view-mode value → pure layout function.
 *
 * Replaces the old `_applyLayoutChunk0…4` dispatch chain. A layout only does
 * math (`LayoutInput → Placement`); EchoLayer owns the DOM. Modes without an
 * entry (aurora, card-spread, dna-helix, outline — CSS-driven) use `parallax`.
 */

import * as stacks from "./stacks.js";
import * as rings from "./rings.js";
import * as curves from "./curves.js";
import * as spheres from "./spheres.js";
import * as grids from "./grids.js";
import * as scatter from "./scatter.js";
import * as solids from "./solids.js";
import { seededRandom, seedForId } from "./types.js";

export { seededRandom, seedForId };

/** @typedef {import("./types.js").LayoutFn} LayoutFn */
/** @typedef {import("./types.js").LayoutInput} LayoutInput */
/** @typedef {import("./types.js").Placement} Placement */
/** @typedef {import("./types.js").Viewport} Viewport */
/** @typedef {import("./types.js").LayoutFile} LayoutFile */

/** The default (no view mode) layout. */
export const defaultLayout = stacks.parallax;

/** @type {Readonly<Record<string, LayoutFn>>} */
export const LAYOUTS = Object.freeze({
  // stacks
  waterfall: stacks.waterfall,
  cascade: stacks.cascade,
  "cascading-depth": stacks.cascadingDepth,
  timeline: stacks.timeline,
  stack: stacks.stack,
  isometric: stacks.isometric,
  venetian: stacks.venetian,
  dominoes: stacks.dominoes,
  staircase: stacks.staircase,
  accordion: stacks.accordion,
  "abyssal-trench": stacks.abyssalTrench,
  "infinity-mirror": stacks.infinityMirror,
  "ethereal-canyon": stacks.etherealCanyon,
  "neon-synth": stacks.neonSynth,
  stackdeck: stacks.stackDeck,
  "prism-split": stacks.prismSplit,
  "time-tunnel": stacks.timeTunnel,
  origami: stacks.origami,
  coverflow: stacks.coverflow,
  // rings
  orbit: rings.orbit,
  carousel: rings.carousel,
  cylinder: rings.cylinder,
  "holographic-cylinder": rings.holographicCylinder,
  rolodex: rings.rolodex,
  theater: rings.theater,
  kaleidoscope: rings.kaleidoscope,
  lotus: rings.lotus,
  astrolabe: rings.astrolabe,
  "chrono-ring": rings.chronoRing,
  archway: rings.archway,
  "blueprint-3d": rings.blueprint3d,
  "solar-system": rings.solarSystem,
  // curves
  helix: curves.helix,
  vortex: curves.vortex,
  tunnel: curves.tunnel,
  tornado: curves.tornado,
  "fibonacci-spiral": curves.fibonacciSpiral,
  galaxy: curves.galaxy,
  cyclone: curves.cyclone,
  "zenith-spiral": curves.zenithSpiral,
  ribbon: curves.ribbon,
  mobius: curves.mobius,
  "cosmic-thread": curves.cosmicThread,
  "hyper-thread": curves.hyperThread,
  wave: curves.wave,
  "quantum-web": curves.quantumWeb,
  "floating-nexus": curves.floatingNexus,
  "black-hole": curves.blackHole,
  // spheres
  "celestial-sphere": spheres.celestialSphere,
  "synapse-web": spheres.synapseWeb,
  "luminous-cortex": spheres.luminousCortex,
  sphere: spheres.sphere,
  constellation: spheres.constellation,
  geode: spheres.geode,
  luminescence: spheres.luminescence,
  "cyber-cortex": spheres.cyberCortex,
  prism: spheres.prism,
  "starlight-mesh": spheres.starlightMesh,
  // grids
  grid: grids.grid,
  "hexagon-matrix": grids.hexagonMatrix,
  bookshelf: grids.bookshelf,
  cityscape: grids.cityscape,
  "data-hive": grids.dataHive,
  crystal: grids.crystal,
  pinboard: grids.pinboard,
  "house-of-cards": grids.houseOfCards,
  pyramid: grids.pyramid,
  "prismatic-array": grids.prismaticArray,
  fractal: grids.fractal,
  // scatter
  scattered: scatter.scattered,
  "shattered-glass": scatter.shatteredGlass,
  quantum: scatter.quantumSuperposition,
  "matrix-rain": scatter.matrixRain,
  meteor: scatter.meteor,
  // solids
  hypercube: solids.hypercube,
  tesseract: solids.tesseract,
  torus: solids.torus,
});

/**
 * @param {string} viewMode  "" = default
 * @returns {LayoutFn}
 */
export function layoutFor(viewMode) {
  return (viewMode && LAYOUTS[viewMode]) || defaultLayout;
}

/**
 * Build a LayoutInput for one document.
 * @param {{ index: number, count: number, viewport: Viewport, file: LayoutFile, scroll?: number }} args
 * @returns {LayoutInput}
 */
export function layoutInput({ index, count, viewport, file, scroll = 0 }) {
  const seed = seedForId(file.id);
  return {
    index,
    count: Math.max(1, count),
    viewport,
    seed,
    random: seededRandom(seed),
    scroll,
    file,
  };
}

/**
 * Explode-view ring and Exposé grid offsets. Mode-independent: every echo
 * carries them so `explodeView.js` / Exposé can animate without a relayout.
 * @param {LayoutInput} input
 * @returns {Record<string, string>}
 */
export function overlayVars({ index, count, viewport }) {
  const angle = (index / count) * Math.PI * 2;
  const radius = 300;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const exposeW = viewport.width * 0.7;
  const exposeH = viewport.height * 0.7;
  const spacingX = cols > 1 ? exposeW / (cols - 1) : 0;
  const spacingY = rows > 1 ? exposeH / (rows - 1) : 0;
  return {
    "--explode-x": `${Math.cos(angle) * radius}px`,
    "--explode-y": `${Math.sin(angle) * radius}px`,
    "--expose-tx": `${-exposeW / 2 + col * spacingX}px`,
    "--expose-ty": `${-exposeH / 2 + row * spacingY}px`,
  };
}

/** Placement field → CSS custom property + unit. */
const FIELDS = /** @type {const} */ ([
  ["tx", "--tx", "px"],
  ["ty", "--ty", "px"],
  ["tz", "--tz", "px"],
  ["rotX", "--rot-x", "deg"],
  ["rotY", "--rot-y", "deg"],
  ["rotZ", "--rot-z", "deg"],
]);

/**
 * Flatten a Placement to the custom properties EchoLayer writes. Pure, so the
 * exact CSS a layout produces is testable without a DOM.
 * @param {Placement} p
 * @returns {Record<string, string>}
 */
export function placementToVars(p) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [field, prop, unit] of FIELDS) {
    const v = p[field];
    if (typeof v !== "number") continue;
    out[prop] =
      field === "tz" && p.stackZ
        ? `calc(${round(v)}px + var(--stack-z, 0px))`
        : `${round(v)}${unit}`;
  }
  if (p.vars) {
    for (const [k, v] of Object.entries(p.vars)) out[k] = String(v);
  }
  return out;
}

/**
 * Keep CSS strings short and stable (and avoid "1e-15px").
 * @param {number} v
 * @returns {number}
 */
function round(v) {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}
