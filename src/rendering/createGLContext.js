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

const contextMetadata = new WeakMap();


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
  const contextNames = [];
  if (preferWebGL2) contextNames.push("webgl2");
  if (webgl1Fallback) contextNames.push("webgl", "experimental-webgl");

  let gl = null;
  let api = null;
  for (const contextName of contextNames) {
    try {
      gl = canvas.getContext(contextName, contextAttributes);
    } catch (error) {
      console.warn(`[${label}] ${contextName} context creation failed.`, error);
    }
    if (gl) {
      api = contextName === "webgl2" ? "webgl2" : "webgl1";
      break;
    }
  }

  if (!gl) return null;

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


export function getGLContextInfo(gl) {
  return contextMetadata.get(gl) ?? null;
}


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
