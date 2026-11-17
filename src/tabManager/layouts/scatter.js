// @ts-check
/**
 * Echo layouts — Scattered / chaotic placements (deterministic per index or seeded per file).
 *
 * Each export is a pure `LayoutInput → Placement` function (see ./types.js).
 * No DOM access: everything a layout needs arrives in its input.
 */

/** @typedef {import("./types.js").LayoutInput} LayoutInput */
/** @typedef {import("./types.js").Placement} Placement */

/**
 * Scattered view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function scattered({ index, viewport }) {
  // Scattered View positions

  // Use a simple pseudo-random function based on index
  const randomSeed = index * 12345.6789;
  const randX = Math.sin(randomSeed) * 0.5 + 0.5; // 0 to 1
  const randY = Math.cos(randomSeed * 1.5) * 0.5 + 0.5; // 0 to 1

  const spreadW = viewport.width * 0.8;
  const spreadH = viewport.height * 0.8;

  const sx = randX * spreadW - spreadW / 2;
  const sy = randY * spreadH - spreadH / 2;

  // Further back ones are smaller/further
  const sz = -100 - index * 80;
  const rotZ = Math.sin(randomSeed * 2) * 20; // -20deg to 20deg

  // Remove standard offsets
  return {
    tx: 0,
    ty: 0,
    tz: 0,
    vars: {
      "--scatter-x": `${sx}px`,
      "--scatter-y": `${sy}px`,
      "--scatter-z": `${sz}px`,
      "--scatter-rot": `${rotZ}deg`,
    },
  };
}

/**
 * Shattered Glass view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function shatteredGlass({ index }) {
  // Shattered Glass View: random sharp translations and rotations
  const pseudoRandomX = Math.sin(index * 11.23);
  const pseudoRandomY = Math.cos(index * 13.37);
  const pseudoRandomZ = Math.sin(index * 17.59);

  const tx = pseudoRandomX * 800;
  const ty = pseudoRandomY * 800;
  const tz = pseudoRandomZ * 1000 - 400; // slightly pushed back

  const rotX = pseudoRandomY * 180;
  const rotY = pseudoRandomX * 180;
  const rotZ = pseudoRandomZ * 90;
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
 * Quantum Superposition view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function quantumSuperposition({ index, random }) {
  // Quantum Superposition: Scatter in 3D cloud
  const maxDist = 800;
  const tX = (random() - 0.5) * maxDist * 2;
  const tY = (random() - 0.5) * maxDist * 2;
  const tZ = -(random() * 2000 + 200); // Back into screen

  const rX = (random() - 0.5) * 60; // -30 to 30 deg
  const rY = (random() - 0.5) * 60;
  const rZ = (random() - 0.5) * 60;
  return {
    tx: tX,
    ty: tY,
    tz: tZ,
    rotX: rX,
    rotY: rY,
    rotZ: rZ,
  };
}

/**
 * Matrix Rain view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function matrixRain({ index, viewport, random }) {
  // Arrange items randomly on X and Z, falling down from Y
  const maxCols = 10;
  const col = index % maxCols;
  const colWidth = viewport.width / maxCols;

  // Spread out evenly but with some jitter
  const tX = -viewport.width / 2 + col * colWidth + random() * 50;

  // Random Y start position for staggered falling effect
  // We set startY uniformly within a viewport height so that
  // they loop inside the animation keyframes (-100vh to 100vh) consistently
  const startY =
    -viewport.height / 2 - random() * viewport.height;

  // Z-depth spread
  const tZ = -300 - random() * 600;

  const rX = 0;
  const rY = 0;
  const rZ = 0;

  // Use animation delay to randomize falling
  return {
    tx: tX,
    ty: startY,
    tz: tZ,
    rotX: rX,
    rotY: rY,
    rotZ: rZ,
    vars: {
      "--matrix-delay": `${random() * 5}s`,
    },
  };
}

/**
 * Meteor view: chaotic deterministic scatter with full tumbling rotations.
 * (Previously only the hover-restore path computed this; the view itself fell
 * back to the default stack until a document had been hovered.)
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function meteor({ index, viewport }) {
  const rand1 = Math.sin(index * 123.456);
  const rand2 = Math.cos(index * 987.654);
  const rand3 = Math.sin(index * 345.678);
  return {
    tx: rand1 * viewport.width * 0.4,
    ty: rand2 * viewport.height * 0.4,
    tz: (rand3 - 0.5) * 800 - 300,
    rotX: rand2 * 360,
    rotY: rand1 * 360,
    rotZ: rand3 * 360,
  };
}
