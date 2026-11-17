// @ts-check
/**
 * Echo layouts — Documents on the faces of 3D solids.
 *
 * Each export is a pure `LayoutInput → Placement` function (see ./types.js).
 * No DOM access: everything a layout needs arrives in its input.
 */

/** @typedef {import("./types.js").LayoutInput} LayoutInput */
/** @typedef {import("./types.js").Placement} Placement */

/**
 * Hypercube view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function hypercube({ index }) {
  // Hypercube layout - distributed across 6 faces of a cube
  const layer = Math.floor(index / 6);
  const distance = 400 + layer * 200;
  const faceIndex = index % 6;
  let tx = 0,
    ty = 0,
    tz = 0;
  let rotX = 0,
    rotY = 0,
    rotZ = 0;

  switch (faceIndex) {
    case 0: // Front
      tz = distance;
      break;
    case 1: // Back
      tz = -distance;
      rotY = 180;
      break;
    case 2: // Right
      tx = distance;
      rotY = 90;
      break;
    case 3: // Left
      tx = -distance;
      rotY = -90;
      break;
    case 4: // Top
      ty = -distance;
      rotX = 90;
      break;
    case 5: // Bottom
      ty = distance;
      rotX = -90;
      break;
  }
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY,
    rotZ,
  };
}

/**
 * Tesseract view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function tesseract({ index }) {
  const face = index % 6;
  const isOuter = Math.floor(index / 6) % 2 === 0;
  const r = isOuter ? 400 : 200;
  let tx = 0,
    ty = 0,
    tz = 0,
    rx = 0,
    ry = 0;
  if (face === 0) {
    tz = r;
  } else if (face === 1) {
    tz = -r;
    ry = 180;
  } else if (face === 2) {
    tx = r;
    ry = 90;
  } else if (face === 3) {
    tx = -r;
    ry = -90;
  } else if (face === 4) {
    ty = r;
    rx = -90;
  } else if (face === 5) {
    ty = -r;
    rx = 90;
  }
  return {
    tx,
    ty,
    tz,
    rotX: rx,
    rotY: ry,
    rotZ: 0,
  };
}

/**
 * Torus view: a spiral wound around a torus, ~8 documents per wrap.
 * (Previously only the hover-restore path computed this.)
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function torus({ index, count }) {
  const totalEchoes = Math.max(1, count);
  const R = 400; // Major radius
  const r = 150; // Minor radius
  const t = index / totalEchoes;
  const wraps = Math.max(1, Math.floor(totalEchoes / 8));
  const v = t * Math.PI * 2; // around the major radius
  const u = t * Math.PI * 2 * wraps; // around the minor radius
  return {
    tx: (R + r * Math.cos(u)) * Math.cos(v),
    ty: (R + r * Math.cos(u)) * Math.sin(v),
    tz: r * Math.sin(u) - 300,
    rotX: u * (180 / Math.PI),
    rotY: 0,
    rotZ: v * (180 / Math.PI),
    vars: {
      "--scatter-x": "0px",
      "--scatter-y": "0px",
      "--scatter-z": "0px",
      "--scatter-rot": "0deg",
    },
  };
}
