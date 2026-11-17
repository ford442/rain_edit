// @ts-check
/**
 * Shared types + helpers for the echo layout registry.
 *
 * A layout is a pure function `LayoutInput → Placement`. It never touches the
 * DOM: EchoLayer turns a Placement into CSS custom properties on a pooled card
 * (or stub), so the same math drives full echo documents, cheap stubs, and
 * Node tests.
 */

/**
 * @typedef {object} Viewport
 * @property {number} width   CSS px (window.innerWidth at layout time)
 * @property {number} height  CSS px
 */

/**
 * @typedef {object} LayoutFile
 * @property {number} id
 * @property {string} name
 * @property {string} [language]
 */

/**
 * @typedef {object} LayoutInput
 * @property {number} index     0 = nearest echo (first inactive tab in tab order)
 * @property {number} count     number of inactive documents being laid out (≥ 1)
 * @property {Viewport} viewport
 * @property {number} seed      stable per-document seed (derived from file id)
 * @property {() => number} random  deterministic PRNG in [0, 1) seeded by `seed`
 * @property {number} scroll    archway scroll offset (radians); 0 elsewhere
 * @property {LayoutFile} file
 */

/**
 * Where one echo sits. Translations are px, rotations are degrees. Omitted
 * fields are left to the stylesheet (they are *removed* from the element, not
 * written as 0), so per-view CSS defaults keep working.
 *
 * @typedef {object} Placement
 * @property {number} [tx]
 * @property {number} [ty]
 * @property {number} [tz]
 * @property {number} [rotX]
 * @property {number} [rotY]
 * @property {number} [rotZ]
 * @property {boolean} [stackZ]  offset `tz` by the live `var(--stack-z)` scroll
 * @property {number} [opacity]  inline opacity override
 * @property {string} [transform] inline transform override (carousel, cityscape)
 * @property {Record<string, string | number>} [vars] extra custom properties
 */

/** @typedef {(input: LayoutInput) => Placement} LayoutFn */

/**
 * mulberry32: tiny deterministic PRNG. Layouts that used Math.random() now get
 * a per-document stream, so documents no longer jump on every re-render.
 * @param {number} seed
 * @returns {() => number}
 */
export function seededRandom(seed) {
  let a = seed >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stable seed for a document id (Knuth multiplicative hash).
 * @param {number} id
 * @returns {number}
 */
export function seedForId(id) {
  return Math.imul(Number(id) | 0, 2654435761) >>> 0;
}
