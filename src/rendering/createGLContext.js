// @ts-check

/** @typedef {WebGL2RenderingContext | WebGLRenderingContext} GLContext */

/**
 * @typedef {object} GLContextMetadata
 * @property {'webgl2' | 'webgl1'} api
 * @property {WebGLContextAttributes} attributes
 * @property {Record<string, unknown>} extensions
 */

/**
 * @typedef {object} CreateGLContextOptions
 * @property {WebGLContextAttributes} [attributes]
 * @property {boolean} [preferWebGL2]
 * @property {boolean} [webgl1Fallback]
 * @property {string[]} [requiredExtensions]
 * @property {string[]} [optionalExtensions]
 * @property {string} [label]
 */

export const DEFAULT_GL_ATTRIBUTES = Object.freeze({
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,
  powerPreference: "high-performance",
  failIfMajorPerformanceCaveat: false,
  preserveDrawingBuffer: false,
});

const WEBGL1_OPTIONAL_EXTENSIONS = [
  "OES_texture_float",
  "OES_texture_float_linear",
  "OES_standard_derivatives",
];

/** @type {WeakMap<GLContext, GLContextMetadata>} */
const contextMetadata = new WeakMap();


/**
 * @param {HTMLCanvasElement} canvas
 * @param {CreateGLContextOptions} [options]
 * @returns {GLContext | null}
 */
export function createGLContext(
  canvas,
  {
    attributes = {},
    preferWebGL2 = true,
    webgl1Fallback = true,
    requiredExtensions = [],
    optionalExtensions = WEBGL1_OPTIONAL_EXTENSIONS,
    label = "WebGL",
  } = {},
) {
  const contextAttributes = { ...DEFAULT_GL_ATTRIBUTES, ...attributes };
  /** @type {string[]} */
  const contextNames = [];
  if (preferWebGL2) contextNames.push("webgl2");
  if (webgl1Fallback) contextNames.push("webgl", "experimental-webgl");

  /** @type {GLContext | null} */
  let gl = null;
  /** @type {'webgl2' | 'webgl1' | null} */
  let api = null;
  for (const contextName of contextNames) {
    try {
      const raw = canvas.getContext(contextName, contextAttributes);
      gl = /** @type {GLContext | null} */ (raw);
    } catch (error) {
      console.warn(`[${label}] ${contextName} context creation failed.`, error);
    }
    if (gl) {
      api = contextName === "webgl2" ? "webgl2" : "webgl1";
      break;
    }
  }

  if (!gl || !api) return null;

  /** @type {Record<string, unknown>} */
  const extensions = {};
  const extensionNames = new Set(requiredExtensions);
  if (api === "webgl1") {
    optionalExtensions.forEach((name) => extensionNames.add(name));
  }

  for (const name of extensionNames) {
    extensions[name] = gl.getExtension(name);
  }

  const missingExtensions = requiredExtensions.filter(
    (name) => !extensions[name],
  );
  if (missingExtensions.length > 0) {
    throw new Error(
      `[${label}] Missing required extensions: ${missingExtensions.join(", ")}`,
    );
  }

  contextMetadata.set(gl, {
    api,
    attributes: gl.getContextAttributes?.() ?? contextAttributes,
    extensions,
  });

  return gl;
}


/**
 * @param {GLContext} gl
 * @returns {GLContextMetadata | null}
 */
export function getGLContextInfo(gl) {
  return contextMetadata.get(gl) ?? null;
}


/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} cssWidth
 * @param {number} cssHeight
 * @param {number} [dpr]
 */
export function resizeCanvasToDisplaySize(
  canvas,
  cssWidth,
  cssHeight,
  dpr = globalThis.devicePixelRatio || 1,
) {
  const safeDpr = Math.max(1, Number(dpr) || 1);
  const displayWidth = Math.max(1, Math.round(cssWidth));
  const displayHeight = Math.max(1, Math.round(cssHeight));
  const bufferWidth = Math.max(1, Math.round(displayWidth * safeDpr));
  const bufferHeight = Math.max(1, Math.round(displayHeight * safeDpr));

  if (canvas.width !== bufferWidth) canvas.width = bufferWidth;
  if (canvas.height !== bufferHeight) canvas.height = bufferHeight;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  return {
    cssWidth: displayWidth,
    cssHeight: displayHeight,
    bufferWidth,
    bufferHeight,
    dpr: safeDpr,
  };
}
