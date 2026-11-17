// @ts-check
/**
 * Echo layouts — Spirals, helices and parametric curves through depth.
 *
 * Each export is a pure `LayoutInput → Placement` function (see ./types.js).
 * No DOM access: everything a layout needs arrives in its input.
 */

/** @typedef {import("./types.js").LayoutInput} LayoutInput */
/** @typedef {import("./types.js").Placement} Placement */

/**
 * Helix view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function helix({ index, count, viewport }) {
  const totalEchoes = count;
  // Helix View positions
  const indexRatio = index / Math.max(1, totalEchoes - 1);
  const yRange = viewport.height * 0.8;
  const radius = 300;
  const cycles = 2; // Number of full rotations

  const angle = indexRatio * Math.PI * 2 * cycles;

  const tx = Math.cos(angle) * radius;
  const ty = indexRatio * yRange - yRange / 2;
  const tz = Math.sin(angle) * radius - 200; // Push back a bit

  const rotY = -((angle * 180) / Math.PI) + 90; // Face inwards/outwards appropriately
  return {
    tx,
    ty,
    tz,
    rotY,
    rotX: 0,
    rotZ: 0,
  };
}

/**
 * Vortex view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function vortex({ index, count }) {
  const totalEchoes = count;
  // Vortex View positions
  const indexRatio = index / Math.max(1, totalEchoes - 1);
  const radius = 200 + index * 40; // Expanding radius
  const angle = indexRatio * Math.PI * 2 * 4; // 4 swirls

  const tx = Math.cos(angle) * radius;
  const ty = Math.sin(angle) * radius;
  const tz = -index * 120 - 100;

  const rotZ = (angle * 180) / Math.PI + 90;
  return {
    tx,
    ty,
    tz,
    rotZ,
    rotX: 0,
    rotY: 0,
  };
}

/**
 * Tunnel view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function tunnel({ index, count }) {
  const totalEchoes = count;
  // Tunnel View: arrange into a 3D cylindrical tunnel leading backward
  const angle = (index / totalEchoes) * Math.PI * 2 * 3; // Spiral
  const radius = 400;
  const tx = Math.cos(angle) * radius;
  const ty = Math.sin(angle) * radius;
  const tz = -index * 150;
  const rotZ = (angle * 180) / Math.PI;
  return {
    tx,
    ty,
    tz,
    rotZ,
    rotX: 0,
    rotY: 0,
  };
}

/**
 * Tornado view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function tornado({ index, count }) {
  // Tornado View positions
  const totalEchoes = Math.max(1, count);
  const angleStep = Math.PI / 3;
  const angle = index * angleStep;

  // Base radius expands as we go further up the tornado
  const radius = 200 + index * 40;

  const tx = Math.cos(angle) * radius;
  // Tornado goes up or down. Let's make it go up.
  const ty = index * 80 - 300;
  const tz = Math.sin(angle) * radius - 400;

  // Face along the funnel; the old branch wrote an undefined `rotZ`
  // (ReferenceError) and dropped this yaw.
  const rotY = -angle * (180 / Math.PI) - 90;
  const rotX = 15;
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
 * Fibonacci Spiral view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function fibonacciSpiral({ index, count }) {
  // Golden ratio spiral
  const phi = (1 + Math.sqrt(5)) / 2;
  const totalEchoes = Math.max(1, count);
  const radius = index * 40;
  const theta = index * phi * Math.PI * 2;
  const tz = -index * 60 - 100;

  const tx = Math.cos(theta) * radius;
  const ty = Math.sin(theta) * radius;

  const rotZ = theta * (180 / Math.PI);
  return {
    tx,
    ty,
    tz,
    rotX: 0,
    rotY: 0,
    rotZ,
  };
}

/**
 * Galaxy view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function galaxy({ index, count, random }) {
  // Galaxy Spiral View: Logarithmic spiral arrangement on X-Z plane
  const totalEchoes = Math.max(1, count);
  const spiralRotations = 3; // How many times the arms wrap
  const maxRadius = 1500;

  // Progress along the spiral (0 at center, 1 at edge)
  const t = index / totalEchoes;

  // Logarithmic scaling for tighter clustering at the core
  const r = maxRadius * Math.pow(t, 0.7);
  const theta = t * Math.PI * 2 * spiralRotations;

  // Two spiral arms offset by PI
  const armOffset = index % 2 === 0 ? 0 : Math.PI;

  const tx = r * Math.cos(theta + armOffset);
  // Add slight vertical variation
  const ty = (random() - 0.5) * 200 * t;
  const tz = r * Math.sin(theta + armOffset) - 600; // Shift galaxy backwards

  // Tilt elements slightly inwards towards the core, rotate to face camera somewhat
  const rotX = 15 * Math.cos(theta);
  const rotY = 25 * Math.sin(theta);
  const rotZ = 0;

  // Core elements are smaller and brighter
  const scale = 0.5 + 0.5 * (1 - t);
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY,
    rotZ,
    vars: {
      "--scatter-x": "0px",
      "--scatter-y": "0px",
      "--scatter-z": "0px",
      "--scatter-rot": "0deg",
      "--scale": scale.toFixed(2),
    },
  };
}

/**
 * Cyclone view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function cyclone({ index, count }) {
  // Cyclone View: Funnel-like spiral with decreasing radius based on depth index
  const totalEchoes = Math.max(1, count);
  const angleStep = 45; // Degrees per document

  const angleDeg = index * angleStep;
  const angleRad = (angleDeg * Math.PI) / 180;

  // Base radius is wide at top (index 0), narrow at bottom
  const radius = 600 - index * (400 / totalEchoes);

  const tx = Math.sin(angleRad) * radius;
  const tz = Math.cos(angleRad) * radius - 400; // Push back slightly
  const ty = index * 80 - totalEchoes * 40; // Spiral vertically

  // Tilt elements slightly upwards to face the viewer from the funnel
  const rotX = 15;
  const rotY = angleDeg; // Face inward
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
 * Zenith Spiral view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function zenithSpiral({ index, count }) {
  // Zenith Spiral View: A downward spiral curve
  const total = Math.max(1, count);
  const radius = 600 + index * 40; // Gradually expand outwards
  const angle = index * (Math.PI / 3); // 60 degrees per item

  const tx = Math.cos(angle) * radius;
  const ty = index * 100 - (total * 50); // Spiraling downwards/upwards
  const tz = -300 - index * 120; // Pushing back in Z-space

  // Tilt facing inward slightly
  const rotY = -(angle * 180 / Math.PI) + 90;
  const rotX = 15; // slight tilt down
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
 * Ribbon view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function ribbon({ index }) {
  // Ribbon View positions: a winding 3D spiral ribbon
  const frequency = 0.5; // Controls how fast the ribbon winds
  const amplitude = 300; // Controls the width of the ribbon

  const tz = -index * 150; // Moving back in Z space
  const angle = index * frequency;

  const tx = Math.sin(angle) * amplitude;
  const ty = Math.cos(angle) * (amplitude / 2); // Slightly squashed vertically

  // Rotate items so they "face" along the ribbon curve somewhat
  const rotY = Math.cos(angle) * 45;
  const rotX = Math.sin(angle) * 20;
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
 * Mobius view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function mobius({ index, count }) {
  // Mobius Strip View positions
  const totalEchoes = Math.max(1, count);
  const t = index / totalEchoes; // 0 to 1
  const R = 600; // Radius of the strip
  const w = 200; // Width parameter of the strip

  // Parametric equations for a Möbius strip
  const u = t * Math.PI * 2; // Angle around the strip
  const v = (index % 2 === 0 ? 1 : -1) * 0.5 * w; // Width variation

  const tx = (R + v * Math.cos(u / 2)) * Math.cos(u);
  const ty = v * Math.sin(u / 2);
  const tz = (R + v * Math.cos(u / 2)) * Math.sin(u) - 400; // Push back

  // Rotate to be tangential to the strip
  const rotY = -((u * 180) / Math.PI) + 90;
  const rotZ = ((u / 2) * 180) / Math.PI;
  const rotX = 0;
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
 * Cosmic Thread view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function cosmicThread({ index }) {
  // Cosmic Thread View: dynamic sine wave interlacing 3D depth based on file index
  const tx = Math.sin(index * 0.8) * 300;
  const ty = Math.cos(index * 0.8) * 200;
  const tz = -150 - (index * 120);
  const rotZ = Math.sin(index * 0.5) * 15;
  return {
    tx,
    ty,
    tz,
    rotX: 0,
    rotY: 0,
    rotZ,
  };
}

/**
 * Hyper Thread view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function hyperThread({ index, count }) {
  const total = Math.max(1, count);
  const progress = index / total;

  // Complex weaving logic using trig functions
  const weaveFreqX = 3;
  const weaveFreqY = 2;
  const radiusX = 400 + (index * 10);
  const radiusY = 250 + (index * 5);

  const tx = Math.sin(progress * Math.PI * 2 * weaveFreqX) * radiusX;
  const ty = Math.cos(progress * Math.PI * 2 * weaveFreqY) * radiusY;
  const tz = -150 - (index * 60);

  // Rotation to face the path tangent
  const rotX = (ty / 15);
  const rotY = -(tx / 15);
  const rotZ = Math.sin(progress * Math.PI * 4) * 15;

  // Save base transform for animations
  return {
    tx,
    ty,
    tz,
    rotX,
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
 * Wave view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function wave({ index, count, viewport }) {
  const totalEchoes = count;
  // Wave View positions (Sine wave floating)
  const spreadW = viewport.width * 1.2;
  const startX = -spreadW / 2;

  const stepX = totalEchoes > 1 ? spreadW / (totalEchoes - 1) : 0;
  const tx = startX + index * stepX;

  // Sine wave for Y
  const frequency = 2; // Number of full waves
  const amplitude = 300; // Height of wave
  const phase =
    (index / Math.max(1, totalEchoes - 1)) * Math.PI * 2 * frequency;
  const ty = Math.sin(phase) * amplitude;

  const tz = -150; // Constant depth

  // Derivative of sine is cosine, use for tangent rotation
  const rotZ = Math.cos(phase) * 30; // Max tilt 30deg

  // Reset others
  return {
    tx,
    ty,
    tz,
    rotZ,
    rotX: 0,
    rotY: 0,
  };
}

/**
 * Quantum Web view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function quantumWeb({ index, count }) {
  // Quantum Web View: a 3D dual-helix intertwined structure
  const total = Math.max(1, count);
  const ratio = index / total;

  // Two interlaced spirals
  const branch = index % 2 === 0 ? 1 : -1;
  const radius = 500 + (Math.sin(index * 0.5) * 50);

  const angle = index * (Math.PI / 6) + (branch === 1 ? 0 : Math.PI);
  const verticalSpread = 1200;

  const tx = Math.cos(angle) * radius;
  const ty = (ratio * verticalSpread) - (verticalSpread / 2);
  const tz = Math.sin(angle) * radius - 400;

  // Facing inwards with a slight tilt
  const rotY = (angle * 180 / Math.PI) - 90 * branch;
  const rotX = Math.cos(index) * 15;
  const rotZ = Math.sin(index) * 10;
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
 * Floating Nexus view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function floatingNexus({ index, count }) {
  const total = Math.max(1, count);
  const radius = Math.max(400, total * 60);

  // Calculate a spiral or layered hexagon orbit
  const goldenRatio = 1.61803398875;
  const angle = index * Math.PI * 2 * goldenRatio;

  // As index grows, push slightly back and out
  const currentRadius = radius + (index * 15);

  const tx = Math.cos(angle) * currentRadius;
  const ty = Math.sin(angle) * currentRadius;

  // Stagger in Z to avoid perfect overlapping
  const tz = -200 - (index * 40);

  // Rotate slightly to face the user or slightly off-center
  const rotX = (ty / 20);
  const rotY = -(tx / 20);

  // Save base transform for magnetic fluid interaction
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
 * Black Hole view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function blackHole({ index }) {
  // Black Hole View positions
  const angle = (index * Math.PI) / 4;
  const radius = Math.max(0, 200 - index * 20);
  return {
    tx: Math.cos(angle) * radius,
    ty: Math.sin(angle) * radius,
    tz: -100 - index * 50,
    rotX: 0,
    rotY: 0,
    rotZ: index * 15,
  };
}
