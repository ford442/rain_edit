// @ts-check
/**
 * Echo layouts — Spherical point clouds (Fibonacci / golden-angle distributions).
 *
 * Each export is a pure `LayoutInput → Placement` function (see ./types.js).
 * No DOM access: everything a layout needs arrives in its input.
 */

/** @typedef {import("./types.js").LayoutInput} LayoutInput */
/** @typedef {import("./types.js").Placement} Placement */

/**
 * Celestial Sphere view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function celestialSphere({ index, count }) {
  const totalEchoes = count;
  // Position documents on a sphere enclosing the viewer
  const phi = Math.acos(1 - (2 * index) / Math.max(1, totalEchoes));
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  const radius = 800;

  const tx = radius * Math.cos(theta) * Math.sin(phi);
  const ty = radius * Math.sin(theta) * Math.sin(phi);
  const tz = radius * Math.cos(phi) - 200;

  const rotY = (theta * 180) / Math.PI + 90;
  const rotX = -(phi * 180) / Math.PI + 90;
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
 * Synapse Web view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function synapseWeb({ index, count }) {
  const totalEchoes = count;
  // Golden spiral distribution on a sphere
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const t = index / Math.max(1, totalEchoes - 1);
  // Inclination from 0 to pi (or from -1 to 1 via acos)
  const inclination = Math.acos(1 - 2 * t);
  // Azimuth via golden ratio
  const azimuth = 2 * Math.PI * index / goldenRatio;

  const radius = 600;

  const tx = radius * Math.sin(inclination) * Math.cos(azimuth);
  const ty = radius * Math.sin(inclination) * Math.sin(azimuth);
  const tz = radius * Math.cos(inclination) - 400; // offset back

  // Orient planes facing outward (mostly)
  // We calculate rough rotation from center
  const rotY = -(azimuth * 180) / Math.PI + 90;
  const rotX = (inclination * 180) / Math.PI - 90;
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
 * Luminous Cortex view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function luminousCortex({ index, count }) {
  const totalEchoes = count;
  // Luminous Cortex View: arrange echoes in an expanding cortical hemisphere
  const phi = Math.acos(-1 + (2 * index) / Math.max(1, totalEchoes));
  const theta = Math.sqrt(Math.max(1, totalEchoes) * Math.PI) * phi;
  const radius = 350 + (index * 20);

  const tx = radius * Math.cos(theta) * Math.sin(phi);
  const ty = radius * Math.sin(theta) * Math.sin(phi);
  const tz = radius * Math.cos(phi) - 200;

  const rotX = Math.atan2(ty, tz) * (180 / Math.PI);
  const rotY = Math.atan2(tx, tz) * (180 / Math.PI);
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
 * Sphere view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function sphere({ index, count }) {
  // Fibonacci Sphere logic
  const totalEchoes = Math.max(1, count);
  const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
  const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5);

  const radius = 600;
  const tx = radius * Math.sin(phi) * Math.cos(theta);
  const ty = radius * Math.sin(phi) * Math.sin(theta);
  const tz = radius * Math.cos(phi) - 200;

  const rotX = (ty / radius) * -90;
  const rotY = (tx / radius) * 90;
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
 * Constellation view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function constellation({ index, count }) {
  const totalEchoes = count;
  // Constellation View: Map to a 3D spherical point cloud
  const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;

  const radius = 400 + Math.sin(index * 123) * 100; // 400-500 radius with some jitter
  const tx = radius * Math.sin(phi) * Math.cos(theta);
  const ty = radius * Math.sin(phi) * Math.sin(theta);
  const tz = radius * Math.cos(phi) - 200; // Offset back

  // Random tilt for constellation nodes
  const rotX = Math.sin(index * 22) * 20;
  const rotY = Math.cos(index * 33) * 20;
  const rotZ = Math.sin(index * 44) * 20;
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
 * Geode view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function geode({ index, count, random }) {
  const totalEchoes = count;
  // Geode View: Arranged inside a hollow sphere, facing inward
  // with crystalline angular variations
  const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  const radius = 500;

  // Random angular jitter for crystalline look
  const jitterRotX = (random() - 0.5) * 45;
  const jitterRotY = (random() - 0.5) * 45;
  const jitterRotZ = (random() - 0.5) * 45;

  const tx = radius * Math.sin(phi) * Math.cos(theta);
  const ty = radius * Math.sin(phi) * Math.sin(theta);
  const tz = radius * Math.cos(phi) - 300;

  // Face inward, opposite of Luminescence view
  const rotX = -((phi * 180) / Math.PI - 90) + jitterRotX;
  const rotY = -((theta * 180) / Math.PI) + jitterRotY;
  const rotZ = jitterRotZ;
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
 * Luminescence view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function luminescence({ index, count, file }) {
  const totalEchoes = count;
  // Luminescence View: Floating sphere with glowing colors based on extension
  // Using golden ratio spiral for even distribution on a sphere
  const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  const radius = 600;

  const tx = radius * Math.sin(phi) * Math.cos(theta);
  const ty = radius * Math.sin(phi) * Math.sin(theta);
  const tz = radius * Math.cos(phi) - 300; // Center the sphere

  // Calculate rotation so documents face outward
  const rotX = (phi * 180) / Math.PI - 90;
  const rotY = (theta * 180) / Math.PI;

  let glowColor = "rgba(255, 255, 255, 0.6)"; // Default white
  if (file.name.endsWith(".js")) {
    glowColor = "rgba(255, 215, 0, 0.8)"; // Yellow for JS
  } else if (file.name.endsWith(".css")) {
    glowColor = "rgba(0, 191, 255, 0.8)"; // Deep Sky Blue for CSS
  } else if (file.name.endsWith(".html")) {
    glowColor = "rgba(255, 69, 0, 0.8)"; // Red-Orange for HTML
  } else if (file.name.endsWith(".md")) {
    glowColor = "rgba(147, 112, 219, 0.8)"; // Medium Purple for MD
  } else if (file.name.endsWith(".py")) {
    glowColor = "rgba(50, 205, 50, 0.8)"; // Lime Green for Python
  } else {
    // Provide a pseudo-random color for other files based on their ID
    const hue = (Number(file.id) * 137.5) % 360;
    glowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
  }
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY,
    rotZ: 0,
    vars: {
      "--glow-color": glowColor,
    },
  };
}

/**
 * Cyber Cortex view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function cyberCortex({ index, count }) {
  // Brain-like cluster / spherical node map
  const totalEchoes = Math.max(1, count);
  const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
  const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5);

  const radius = 500;
  const tx = radius * Math.sin(phi) * Math.cos(theta);
  const ty = radius * Math.sin(phi) * Math.sin(theta);
  const tz = radius * Math.cos(phi) - 200;

  // Add some organic jitter
  const rotX = Math.sin(index * 13) * 30;
  const rotY = Math.cos(index * 17) * 30;
  const rotZ = Math.sin(index * 19) * 30;
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
 * Prism view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function prism({ index, count }) {
  const totalEchoes = count;
  // Prism View positions (Polyhedron shape)

  // Calculate spherical coordinates for an even distribution
  const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;

  const radius = 450;

  const tx = radius * Math.sin(phi) * Math.cos(theta);
  const ty = radius * Math.sin(phi) * Math.sin(theta);
  const tz = radius * Math.cos(phi) - 200; // Offset back

  // Orient planes to face outward from center
  const rotX = -phi * (180 / Math.PI) + 90;
  const rotY = theta * (180 / Math.PI);
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
 * Starlight Mesh view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function starlightMesh({ index, count }) {
  // Starlight Mesh View: interconnected spherical mesh
  const total = Math.max(1, count);
  const phi = Math.acos(1 - (2 * (index + 0.5)) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;

  const radius = 550;

  // Add pulsating effect to radius based on index
  const tX = radius * Math.sin(phi) * Math.cos(theta);
  const tY = radius * Math.sin(phi) * Math.sin(theta);
  const tZ = radius * Math.cos(phi) - 300;

  // Orient to face the center
  const rX = (phi * 180 / Math.PI) - 90;
  const rY = theta * 180 / Math.PI;

  // Save base transform for mesh interactivity
  return {
    tx: tX,
    ty: tY,
    tz: tZ,
    rotX: rX,
    rotY: rY,
    rotZ: 0,
    vars: {
      "--item-index": index,
    },
  };
}
