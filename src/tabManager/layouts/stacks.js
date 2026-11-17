// @ts-check
/**
 * Echo layouts — Linear depth stacks, walls and corridors: documents step away from the viewer along a line.
 *
 * Each export is a pure `LayoutInput → Placement` function (see ./types.js).
 * No DOM access: everything a layout needs arrives in its input.
 */

/** @typedef {import("./types.js").LayoutInput} LayoutInput */
/** @typedef {import("./types.js").Placement} Placement */

/**
 * Default view (no mode selected): a shallow parallax stack. Mouse parallax
 * overwrites tx/ty at runtime; tz follows the live --stack-z MRI scroll.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function parallax({ index }) {
  const depthOffset = (index + 1) * 2;
  return {
    tx: depthOffset * 2,
    ty: depthOffset * 2,
    tz: -index * 50,
    stackZ: true,
  };
}

/**
 * Waterfall view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function waterfall({ index }) {
  // Waterfall Layout: Cascade downwards and slightly backwards
  const tx = index % 2 === 0 ? 50 : -50; // slight alternating zigzag
  const ty = index * 120 + 50; // cascade down heavily
  const tz = -index * 60; // push backwards
  return {
    tx,
    ty,
    tz,
    rotY: 0,
    rotX: 15,
    rotZ: 0,
  };
}

/**
 * Cascade view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function cascade({ index, viewport }) {
  // Cascade positions
  const vw = viewport.width;
  const tx = vw * 0.3 + index * 40;
  const ty = index * 20;
  const tz = -index * 50;
  return {
    tx,
    ty,
    tz,
  };
}

/**
 * Cascading Depth view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function cascadingDepth({ index }) {
  // Cascading Depth View
  const tx = 0;
  const ty = index * 60; // Shift down
  const tz = -150 - (index * 120); // Push back progressively
  return {
    tx,
    ty,
    tz,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    vars: {
      "--scatter-x": "0px",
      "--scatter-y": "0px",
      "--scatter-z": "0px",
      "--scatter-rot": "0deg",
    },
  };
}

/**
 * Timeline view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function timeline({ index, count, viewport }) {
  const totalEchoes = count;
  // Timeline View positions
  const width = viewport.width * 1.5;
  // Position them in a line from left to right, going backwards in Z
  const spacingX = totalEchoes > 1 ? width / (totalEchoes - 1) : 0;
  const xPos = -width / 2 + index * spacingX;
  const zPos = -index * 150;
  return {
    tx: xPos,
    ty: 0,
    tz: zPos,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
  };
}

/**
 * Stack view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function stack({ index }) {
  // Time Machine Stack View: deep spacing, scrolled live by --stack-z
  return {
    tx: 0,
    ty: 0,
    tz: -index * 300,
    stackZ: true,
    rotX: 0,
    rotY: 0,
  };
}

/**
 * Isometric view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function isometric({ index }) {
  // Simple stacked positioning for isometric view
  return {
    tx: 0,
    ty: index * 20,
    tz: index * 50,
    rotX: 0,
    rotY: 0,
  };
}

/**
 * Venetian view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function venetian({ index }) {
  // Venetian Blinds view: stack closely, tilt heavily backward
  const spacingZ = 40;
  const tilt = -75; // Heavy backward tilt

  // Adjust position slightly to center the stack
  const ty = 0;
  const tz = -(index * spacingZ);

  const tx = 0;
  const rotX = tilt;
  const rotY = 0;
  const rotZ = 0;
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY,
    rotZ,
    opacity: Math.max(0.1, 1 - index * 0.15),
  };
}

/**
 * Dominoes view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function dominoes({ index }) {
  // Dominoes View positions
  const tx = index * 20;
  const ty = 0;
  const tz = index * -50;
  const rotX = 10;
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY: 0,
    rotZ: 0,
  };
}

/**
 * Staircase view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function staircase({ index, count }) {
  const totalEchoes = count;
  // Staircase View: cascading step-like arrangement
  const stepWidth = 100;
  const stepHeight = 80;
  const stepDepth = 150;

  // Center the staircase somewhat
  const offsetX = -((totalEchoes - 1) * stepWidth) / 2;
  const offsetY = -((totalEchoes - 1) * stepHeight) / 2;

  const tx = offsetX + index * stepWidth;
  const ty = offsetY + index * stepHeight;
  const tz = -index * stepDepth;
  return {
    tx,
    ty,
    tz,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
  };
}

/**
 * Accordion view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function accordion({ index }) {
  const spacingX = 40;
  const spacingZ = -100;
  const rotY = 15;
  return {
    tx: index * spacingX,
    tz: index * spacingZ,
    rotY,
  };
}

/**
 * Abyssal Trench view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function abyssalTrench({ index }) {
  // Stack documents very deeply, tilting backwards into a trench
  const depthStep = -300;
  const yStep = 60;
  const tz = index * depthStep - 400;
  const ty = index * yStep;
  // create a subtle sine wave sway down the trench
  const tx = Math.sin(index * 0.8) * 150;
  const rotX = 30 + index * 2; // tilts more backward the deeper it goes
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY: 0,
    rotZ: 0,
  };
}

/**
 * Infinity Mirror view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function infinityMirror({ index }) {
  const isLeft = index % 2 === 0;
  const tz = -(index + 1) * 300;
  const tx = isLeft ? -400 : 400;
  const rotY = isLeft ? 45 : -45;
  return {
    tz,
    tx,
    rotY,
  };
}

/**
 * Ethereal Canyon view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function etherealCanyon({ index }) {
  // Split into two angled walls facing inward
  const isLeft = index % 2 === 0;
  const wallIndex = Math.floor(index / 2);

  const tz = -150 - (wallIndex * 250);
  const ty = (Math.sin(wallIndex * 0.7) * 80);
  const tx = isLeft ? -450 : 450;

  const rotY = isLeft ? 45 : -45;
  const rotX = Math.cos(wallIndex * 0.4) * 10;
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY,
    rotZ: 0,
  };
}

/**
 * Neon Synth view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function neonSynth({ index }) {
  // Neon Synth View: Retro-futuristic grid highway stretching backwards
  const laneWidth = 400;
  const zSpacing = 300;
  // Alternate between left and right lanes
  const isLeftLane = index % 2 === 0;
  const tx = isLeftLane ? -laneWidth / 2 : laneWidth / 2;
  // Position at the bottom to form the 'highway' feel
  const ty = 300;
  const tz = -index * zSpacing;

  // Tilt backwards to lay flat like a road
  const rotX = 70;
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY: 0,
    rotZ: 0,
  };
}

/**
 * Stack Deck view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function stackDeck({ index }) {
  // Stack Deck View positions
  const spacingY = 40;
  const spacingZ = 15;
  return {
    tx: 0,
    ty: index * spacingY,
    tz: -index * spacingZ,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
  };
}

/**
 * Prism Split view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function prismSplit({ index }) {
  // V-shape split logic
  const side = index % 2 === 0 ? 1 : -1;
  const row = Math.floor(index / 2);

  const tx = side * (300 + row * 50);
  const ty = row * 20 - 50;
  const tz = -200 - row * 150;

  // Tilt them to face inwards
  const rotY = side * -35;
  const rotX = 10;
  const rotZ = 0;
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
 * Time Tunnel view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function timeTunnel({ index, count }) {
  // Time Tunnel View
  const totalEchoes = Math.max(1, count);
  const zStep = -300; // How deep each layer goes
  const tz = index * zStep;

  // Arrange them into left, top, right, bottom walls
  const wallIndex = index % 4;
  const offset = 400; // Tunnel radius

  let tx = 0;
  let ty = 0;
  let rotY = 0;
  let rotX = 0;

  if (wallIndex === 0) {
    // Left wall
    tx = -offset;
    rotY = 90;
  } else if (wallIndex === 1) {
    // Top wall
    ty = -offset;
    rotX = -90;
  } else if (wallIndex === 2) {
    // Right wall
    tx = offset;
    rotY = -90;
  } else if (wallIndex === 3) {
    // Bottom wall
    ty = offset;
    rotX = 90;
  }

  // Add a slight spin/twist to the tunnel over depth
  const rotZ = index * 5;

  // Reset scale and scatter
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY,
    rotZ,
    vars: {
      "--scale": "1",
      "--scatter-x": "0px",
      "--scatter-y": "0px",
      "--scatter-z": "0px",
      "--scatter-rot": "0deg",
    },
  };
}

/**
 * Origami view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function origami({ index, count }) {
  // Origami spatial view calculation
  const totalEchoes = Math.max(1, count);
  const foldAngle = 35; // degrees for each fold
  const spacing = 180;

  // Alternating folds
  const direction = index % 2 === 0 ? 1 : -1;
  const tx = (index - totalEchoes / 2) * spacing;
  const ty = (index % 3) * 60 - 60; // stagger y
  const tz = Math.abs(index - totalEchoes / 2) * -150 - 200; // V-shape depth
  const rotY = direction * foldAngle;
  const rotZ = direction * 5;
  return {
    tx,
    ty,
    tz,
    rotX: 0,
    rotY,
    rotZ,
    vars: {
      "--scatter-x": "0px",
      "--scatter-y": "0px",
      "--scatter-z": "0px",
      "--scatter-rot": "0deg",
    },
  };
}

/**
 * Coverflow view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function coverflow({ index, count }) {
  const totalEchoes = count;
  // Coverflow View positions
  const middleIndex = Math.floor(totalEchoes / 2);
  const diff = index - middleIndex;

  const spacingX = 150;
  const tx = diff * spacingX;

  // Push back non-center items, scale them down, rotate them inwards
  const absDiff = Math.abs(diff);
  const tz = absDiff === 0 ? 0 : -200 - absDiff * 50;
  const rotY = diff === 0 ? 0 : diff < 0 ? 45 : -45; // Left items face right, right items face left
  const scale = 1 - absDiff * 0.1;

  // Reset others
  return {
    tx,
    ty: 0,
    tz,
    rotY,
    rotX: 0,
    rotZ: 0,
    vars: {
      "--scale": `${Math.max(0.3, scale)}`,
      "--z-index": `${100 - absDiff}`,
      "--scatter-x": "0px",
      "--scatter-y": "0px",
      "--scatter-z": "0px",
      "--scatter-rot": "0deg",
    },
  };
}
