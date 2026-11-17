// @ts-check
/**
 * Echo layouts — Rings, arcs and carousels: documents placed by angle around an axis.
 *
 * Each export is a pure `LayoutInput → Placement` function (see ./types.js).
 * No DOM access: everything a layout needs arrives in its input.
 */

/** @typedef {import("./types.js").LayoutInput} LayoutInput */
/** @typedef {import("./types.js").Placement} Placement */

/**
 * Orbit view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function orbit({ index, count }) {
  const totalEchoes = count;
  // Orbit View (3D Carousel Cylindrical) positions
  const angle = (index / totalEchoes) * 360; // Degrees
  const orbitRadius = Math.max(500, totalEchoes * 120); // Dynamic radius based on file count

  // Remove standard tx, ty offsets to center the carousel properly
  return {
    tx: 0,
    ty: 0,
    tz: 0,
    vars: {
      "--orbit-rot-y": `${angle}deg`,
      "--orbit-tz": `${orbitRadius}px`,
    },
  };
}

/**
 * Carousel view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function carousel({ index, count }) {
  const total = Math.max(1, count);
  const radius = Math.max(800, total * 150); // Dynamic radius

  // We'll calculate a base angle per item
  const angleStep = 360 / total;
  const currentAngle = index * angleStep;

  return {
    transform:
      "translate3d(-50%, -50%, 0) rotateY(var(--carousel-angle)) translateZ(var(--carousel-radius))",
    vars: {
      "--carousel-angle": `${currentAngle}deg`,
      "--carousel-radius": `${radius}px`,
    },
  };
}

/**
 * Cylinder view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function cylinder({ index, count }) {
  // Cylinder View: vertical carousel
  const totalEchoes = Math.max(1, count);
  const angle = (index / totalEchoes) * Math.PI * 2;
  const radius = 600;

  const tx = Math.sin(angle) * radius;
  const ty = 0;
  const tz = Math.cos(angle) * radius - 200; // offset back

  // Orient planes facing outward (along Y axis)
  const rotY = (angle * 180) / Math.PI;
  return {
    tx,
    ty,
    tz,
    rotX: 0,
    rotY,
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
 * Holographic Cylinder view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function holographicCylinder({ index, count }) {
  // Holographic Cylinder View
  const totalEchoes = Math.max(1, count);
  const angle = (index / totalEchoes) * Math.PI * 2;
  const radius = 650;

  const tx = Math.sin(angle) * radius;
  const ty = 0;
  const tz = Math.cos(angle) * radius - 200;

  // Orient planes facing outward
  const rotX = 0;
  const rotY = (angle * 180) / Math.PI;

  // Save base transform for animations
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY,
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
 * Rolodex view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function rolodex({ index, count }) {
  // Rolodex View: revolving file cabinet cylinder
  const totalEchoes = Math.max(1, count);
  const angle = (index / totalEchoes) * Math.PI * 2;
  const radius = 600;

  const tx = 0;
  const ty = Math.sin(angle) * radius;
  const tz = Math.cos(angle) * radius - 200; // offset back

  // Orient planes facing outward
  const rotX = -((angle * 180) / Math.PI);
  const rotY = 0;
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY,
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
 * Theater view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function theater({ index, count }) {
  // Theater View positions
  const totalEchoes = Math.max(1, count);
  const radius = 600;
  // Arrange items in a semi-circle based on index
  const angle = (index / totalEchoes) * Math.PI - Math.PI / 2;

  const tx = Math.sin(angle) * radius;
  const ty = 0;
  const tz = -Math.cos(angle) * radius;

  const rotY = -angle * (180 / Math.PI);
  return {
    tx,
    ty,
    tz,
    rotX: 0,
    rotY,
    rotZ: 0,
  };
}

/**
 * Kaleidoscope view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function kaleidoscope({ index, count }) {
  // Kaleidoscope View: radially symmetric pattern with rotation and translation
  const totalEchoes = Math.max(1, count);
  const angle = (index / totalEchoes) * Math.PI * 2;
  const radius = 500;

  const tx = Math.sin(angle) * radius;
  const ty = Math.cos(angle) * radius;
  const tz = -400; // Push back into Z
  const rotZ = (-angle * 180) / Math.PI; // Face the center tangentially
  return {
    tx,
    ty,
    tz,
    rotZ,
  };
}

/**
 * Lotus view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function lotus({ index, count }) {
  const totalEchoes = count;
  // Lotus View positions
  const angle = (index / totalEchoes) * Math.PI * 2;
  const radius = 400 + (index % 2) * 100; // Alternating petal lengths

  const tx = Math.sin(angle) * radius;
  const ty = Math.cos(angle) * radius;
  const tz = -200 - index * 20;

  // Petals spin around the centre; the old branch computed this roll but wrote
  // an undefined `rotY` (ReferenceError) and a hard-coded 0deg roll instead.
  const rotZ = -(angle * 180) / Math.PI;
  const rotX = 15; // Inward tilt
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY: 0,
    rotZ,
  };
}

/**
 * Astrolabe view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function astrolabe({ index }) {
  // Astrolabe View positions
  const tx = Math.cos((index * Math.PI) / 4) * 300;
  const ty = Math.sin((index * Math.PI) / 4) * 300;
  const tz = -200;
  const rotZ = index * 45;
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
 * Chrono Ring view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function chronoRing({ index, count }) {
  // Multi-layered clockface arrangement
  const total = Math.max(1, count);
  const layers = Math.ceil(total / 12); // Max 12 docs per ring
  const docsPerRing = Math.min(12, total);
  const layerIndex = Math.floor(index / docsPerRing);
  const ringIndex = index % docsPerRing;

  const angle = (ringIndex / docsPerRing) * Math.PI * 2;
  const radius = 300 + (layerIndex * 150); // Rings expand outward

  const tx = Math.cos(angle - Math.PI / 2) * radius;
  const ty = Math.sin(angle - Math.PI / 2) * radius;
  // Layers go backward in Z
  const tz = layerIndex * -300 - 200;

  // Face outward relative to center
  const rotZ = (angle * 180 / Math.PI);
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
 * Archway view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function archway({ index, count, scroll }) {
  const totalEchoes = Math.max(1, count);

  // Alt+wheel cycles the arch (depthScanningTools → relayoutEchoes)
  const scrollOffset = scroll || 0;

  const ARCH_ANGLE_SPAN = Math.PI * 1.1;
  const ANGLE_STEP = ARCH_ANGLE_SPAN / Math.min(15, totalEchoes);
  const angle = index * ANGLE_STEP + scrollOffset;

  const radius = 1200;
  const tx = Math.sin(angle) * radius;
  const tz = Math.cos(angle) * radius * 0.6 - 400;
  const ty = 400 + Math.sin(angle) * -200;

  const rotY = angle * -30;

  const depthFactor = (Math.cos(angle) + 1) / 2;
  const scale = 0.6 + depthFactor * 0.4;
  const opacity = 0.3 + depthFactor * 0.7;
  return {
    opacity,
    vars: {
      "--arch-tx": `${tx}px`,
      "--arch-ty": `${ty}px`,
      "--arch-tz": `${tz}px`,
      "--arch-rot-y": `${rotY}deg`,
      "--arch-scale": scale,
    },
  };
}

/**
 * Blueprint 3d view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function blueprint3d({ index, count }) {
  const totalEchoes = count;
  // Semi-circle arrangement like an architect's desk
  const r = 400;
  const angle = (index / Math.max(1, totalEchoes - 1)) * Math.PI;

  const tx = Math.cos(angle) * r;
  const ty = 50; // slightly down
  const tz = -Math.sin(angle) * r - 100;

  const rotY = (angle * 180) / Math.PI - 90; // Face user
  return {
    tx,
    ty,
    tz,
    rotX: 0,
    rotY,
    rotZ: 0,
  };
}

/**
 * Solar System view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function solarSystem({ index }) {
  // Concentric orbits around the center.
  // Index determines the orbit radius and speed.
  const orbitSpacing = 200; // Distance between orbits
  const radius = 300 + index * orbitSpacing;

  // Stagger the starting angles
  const startAngle = (index * Math.PI * 0.7) % (Math.PI * 2);

  // CSS keyframes animate the x/y orbit from --orbit-radius/--orbit-start-angle;
  // --orbit-index varies the duration. The base transform only places the plane.
  return {
    tx: 0,
    ty: 0,
    tz: -200,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    vars: {
      "--orbit-radius": `${radius}px`,
      "--orbit-start-angle": `${startAngle}rad`,
      "--scatter-x": "0px",
      "--scatter-y": "0px",
      "--scatter-z": "0px",
      "--scatter-rot": "0deg",
      "--orbit-index": index + 1,
    },
  };
}
