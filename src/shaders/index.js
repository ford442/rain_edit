// @ts-check
/**
 * Rain shader sources, one entry per program stage. Each entry carries the
 * authored GLSL ES 3.00 source (compiled on WebGL2) and the GLSL ES 1.00 copy
 * (compiled only on the WebGL1 fallback). Neither is rewritten at runtime.
 *
 * Imported with Vite's built-in `?raw`, so the string is the file verbatim and
 * shader compile-log line numbers match the file on disk.
 */
import simpleVert from "./simple.vert?raw";
import simpleVert100 from "./simple.es100.vert?raw";
import waterFrag from "./water.frag?raw";
import waterFrag100 from "./water.es100.frag?raw";
import waterBackFrag from "./water-back.frag?raw";
import waterBackFrag100 from "./water-back.es100.frag?raw";

/** @typedef {import("../rendering/shaderProgram.js").ShaderSource} ShaderSource */

/** @type {Readonly<ShaderSource>} */
export const RAIN_VERTEX = Object.freeze({
  name: "simple.vert",
  es300: simpleVert,
  es100: simpleVert100,
});

/** @type {Readonly<ShaderSource>} */
export const WATER_FRONT = Object.freeze({
  name: "water.frag",
  es300: waterFrag,
  es100: waterFrag100,
});

/** @type {Readonly<ShaderSource>} */
export const WATER_BACK = Object.freeze({
  name: "water-back.frag",
  es300: waterBackFrag,
  es100: waterBackFrag100,
});
