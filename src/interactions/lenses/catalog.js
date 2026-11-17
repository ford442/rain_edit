// @ts-check
/**
 * Canonical lens catalog — the ONLY place a lens is defined.
 *
 * Each row becomes one hold binding in the exclusive "lens" group (see
 * `registerLenses.js`). Visuals live in `src/styles/lenses.css`, keyed by the
 * effect `kind` (`body[data-lens-kind="…"]`) and tuned through CSS custom
 * properties derived from the `effect` params (`--lens-radius`,
 * `--lens-amount`, `--lens-tint`, …).
 *
 * Adding a lens = adding one row here. Do not add per-lens stylesheets or
 * body classes; if no existing kind fits, add a kind to lenses.css.
 *
 * @typedef {object} LensEffect
 * @property {"loupe" | "separate" | "xray" | "fan" | "filter" | "ripple" | "outline" | "vortex" | "pixelate" | "ghost" | "isolate"} kind
 * @property {number} [radius]  px, cursor-centred effects
 * @property {number} [amount]  0..1 strength
 * @property {number} [blur]    px
 * @property {string} [tint]    CSS color
 * @property {string} [filter]  CSS filter list (kind "filter")
 *
 * @typedef {object} LensSpec
 * @property {string} id
 * @property {Partial<import("../InputManager.js").Combo>} combo
 * @property {string} description
 * @property {LensEffect} effect
 */

/** @type {LensSpec[]} */
export const LENSES = [
  {
    id: "magnifier",
    combo: { alt: true, code: "KeyM" },
    description: "Magnifier — loupe over obscured echoes",
    effect: { kind: "loupe", radius: 140, blur: 0 },
  },
  {
    id: "magnetic-separation",
    combo: { alt: true, shift: true, code: "KeyM" },
    description: "Magnetic separation — push echoes away from the editor",
    effect: { kind: "separate", amount: 0.6 },
  },
  {
    id: "x-ray",
    combo: { alt: true, code: "Digit1" },
    description: "X-ray — see through the editor to echoes beneath",
    effect: { kind: "xray", radius: 220, tint: "#7fdcff" },
  },
  {
    id: "peel",
    combo: { alt: true, code: "Digit2" },
    description: "Peel / fan — splay stacked echoes apart",
    effect: { kind: "fan", amount: 1 },
  },
  {
    id: "thermal",
    combo: { alt: true, code: "KeyB" },
    description: "Thermal — heat-map echoes by recency",
    effect: { kind: "filter", filter: "invert(1) hue-rotate(180deg) saturate(3) contrast(1.2)" },
  },
  {
    id: "chromatic",
    combo: { alt: true, code: "Digit3" },
    description: "Chromatic — RGB split on echoes",
    effect: { kind: "filter", filter: "saturate(1.6) contrast(1.1) drop-shadow(2px 0 0 #f0f8) drop-shadow(-2px 0 0 #0ff8)" },
  },
  {
    id: "ripple",
    combo: { alt: true, code: "Digit4" },
    description: "Ripple — concentric wave from the cursor",
    effect: { kind: "ripple", radius: 260, amount: 0.5 },
  },
  {
    id: "wireframe",
    combo: { alt: true, code: "Digit5" },
    description: "Wireframe — echoes as outlines only",
    effect: { kind: "outline", tint: "#39ff9f" },
  },
  {
    id: "vortex",
    combo: { alt: true, code: "Digit6" },
    description: "Vortex — swirl echoes around the cursor",
    effect: { kind: "vortex", amount: 1 },
  },
  {
    id: "pixelate",
    combo: { alt: true, code: "Digit7" },
    description: "Pixelate — coarse echo previews",
    effect: { kind: "pixelate", blur: 3 },
  },
  {
    id: "time-slip",
    combo: { alt: true, code: "Digit8" },
    description: "Time-slip — older echoes trail and fade",
    effect: { kind: "ghost", amount: 0.5 },
  },
  {
    id: "isolate",
    combo: { alt: true, code: "Digit9" },
    description: "Isolate — dim everything but the echo under the cursor",
    effect: { kind: "isolate", radius: 180, amount: 0.85 },
  },
];

/**
 * Effect params → CSS custom properties set on <body> while the lens is held.
 * @param {LensEffect} effect
 */
export function lensCssVars(effect) {
  /** @type {Record<string, string>} */
  const vars = {};
  if (effect.radius != null) vars["--lens-radius"] = `${effect.radius}px`;
  if (effect.amount != null) vars["--lens-amount"] = String(effect.amount);
  if (effect.blur != null) vars["--lens-blur"] = `${effect.blur}px`;
  if (effect.tint != null) vars["--lens-tint"] = effect.tint;
  if (effect.filter != null) vars["--lens-filter"] = effect.filter;
  return vars;
}
