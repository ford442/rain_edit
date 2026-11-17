// @ts-check
/** TabManager constants shared by the class, echo cards, and stubs. */

/** Duration (ms) the note save toast stays visible. */
export const TOAST_DISPLAY_DURATION = 2500;

/** Z-index assigned to the editor element at each depth level. */
export const DEPTH_Z_INDEX = Object.freeze([0, 5, 15]);

/** Visual badge icons for depth 0, 1, 2. */
export const DEPTH_ICONS = Object.freeze(["▼", "◆", "▲"]);

/** Human-readable titles for tooltips. */
export const DEPTH_TITLES = Object.freeze([
  "Deep — behind all rain (z-index: 0)",
  "Middle — between rain layers (z-index: 5)",
  "Front — above all rain (z-index: 15)",
]);
