// @ts-check
/**
 * Echo layouts — Grids, honeycombs, shelves and tiered structures.
 *
 * Each export is a pure `LayoutInput → Placement` function (see ./types.js).
 * No DOM access: everything a layout needs arrives in its input.
 */

/** @typedef {import("./types.js").LayoutInput} LayoutInput */
/** @typedef {import("./types.js").Placement} Placement */

/**
 * Grid view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function grid({ index, count }) {
  const totalEchoes = count;
  // Grid View: neat 3D matrix-style wall
  const cols = Math.ceil(Math.sqrt(totalEchoes));
  const spacingX = 600;
  const spacingY = 400;

  const col = index % cols;
  const row = Math.floor(index / cols);

  const offsetX = -((cols - 1) * spacingX) / 2;
  const offsetY = -((Math.ceil(totalEchoes / cols) - 1) * spacingY) / 2;

  const tx = offsetX + col * spacingX;
  const ty = offsetY + row * spacingY;
  const tz = -300; // Push back slightly
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
 * Hexagon Matrix view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function hexagonMatrix({ index, count }) {
  const totalEchoes = count;
  // Hexagon Matrix View positions
  const cols = Math.ceil(Math.sqrt(totalEchoes));
  const hexWidth = 400;
  const hexHeight = (Math.sqrt(3) * hexWidth) / 2; // Hexagon row height

  const col = index % cols;
  const row = Math.floor(index / cols);

  // Offset every other row
  const rowOffset = row % 2 === 1 ? hexWidth / 2 : 0;

  const offsetX = -((cols - 1) * hexWidth) / 2;
  const offsetY = -((Math.ceil(totalEchoes / cols) - 1) * hexHeight) / 2;

  const tx = offsetX + col * hexWidth + rowOffset;
  const ty = offsetY + row * hexHeight;
  const tz = -300 - row * 50; // Push back slightly and slope
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
 * Bookshelf view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function bookshelf({ index, count }) {
  const totalEchoes = Math.max(1, count);
  const cols = Math.ceil(Math.sqrt(totalEchoes));
  const col = index % cols;
  const row = Math.floor(index / cols);

  // Arrange like books on a shelf
  const spacingX = 400;
  const spacingY = 300;
  const startX = -((cols - 1) * spacingX) / 2;
  const startY = -(((Math.ceil(totalEchoes / cols)) - 1) * spacingY) / 2;

  const tx = startX + col * spacingX;
  const ty = startY + row * spacingY;
  const tz = -400; // Pushed back
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
 * Cityscape view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function cityscape({ index, count }) {
  const totalEchoes = count;
  // Cityscape View: buildings of varying heights jutting out from a flat grid
  const cols = Math.ceil(Math.sqrt(totalEchoes));
  const row = Math.floor(index / cols);
  const col = index % cols;

  const spacingX = 400;
  const spacingZ = 300;

  const offsetX = -((cols - 1) * spacingX) / 2;
  const offsetZ = -((Math.ceil(totalEchoes / cols) - 1) * spacingZ) / 2;

  const tx = offsetX + col * spacingX;
  // Pseudo-random height (tz) variation based on index to look like buildings
  const pseudoRandom = Math.sin(index * 13.37) * 0.5 + 0.5; // value between 0 and 1
  const buildingHeight = 100 + pseudoRandom * 600;

  const tz = offsetZ - row * spacingZ - 400; // push everything back a bit
  // Tilt the documents so they stand up from the floor
  const ty = 300 - buildingHeight / 2;

  // add some minor scale to vary thickness visually
  return {
    tx,
    ty,
    tz: tz + buildingHeight,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    transform: `translate3d(var(--tx), var(--ty), var(--tz)) rotateX(var(--rot-x)) rotateY(var(--rot-y)) rotateZ(var(--rot-z)) scale(${1 - pseudoRandom * 0.2})`,
  };
}

/**
 * Data Hive view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function dataHive({ index, count }) {
  // Data Hive View: Hexagonal grid arrangement
  const totalEchoes = Math.max(1, count);
  const cols = Math.ceil(Math.sqrt(totalEchoes));
  const hexWidth = 240;
  const hexHeight = 200;

  const col = index % cols;
  const row = Math.floor(index / cols);

  // Stagger rows for hexagonal tiling
  const xOffset = row % 2 === 1 ? hexWidth / 2 : 0;
  const tx = (col - cols / 2) * hexWidth + xOffset;
  const ty = (row - cols / 2) * hexHeight;
  const tz = -400 - row * 50; // Slight slant backward
  return {
    tx,
    ty,
    tz,
    rotX: 0,
    rotY: 0,
  };
}

/**
 * Crystal view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function crystal({ index, count }) {
  // Crystal Lattice View: 3D Grid Arrangement
  const totalEchoes = Math.max(1, count);
  const size = Math.ceil(Math.cbrt(totalEchoes)); // Cube root for 3D grid
  const spacing = 350; // Spacing between nodes

  const zLayer = Math.floor(index / (size * size));
  const rem = index % (size * size);
  const yLayer = Math.floor(rem / size);
  const xLayer = rem % size;

  const tx = (xLayer - size / 2) * spacing;
  const ty = (yLayer - size / 2) * spacing;
  const tz = -600 - zLayer * spacing;
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
 * Pinboard view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function pinboard({ index, count, viewport }) {
  const totalEchoes = count;
  // Pinboard View positions (Organic spread on a wall)
  const spreadW = viewport.width * 0.8;
  const spreadH = viewport.height * 0.8;

  // Use a grid-like base with random offsets for organic feel
  const cols = Math.ceil(Math.sqrt(totalEchoes));
  const col = index % cols;
  const row = Math.floor(index / cols);

  const cellW = spreadW / Math.max(1, cols);
  const cellH = spreadH / Math.max(1, Math.ceil(totalEchoes / cols));

  const randomSeedX = Math.sin(index * 123) * 0.5;
  const randomSeedY = Math.cos(index * 456) * 0.5;

  const tx =
    col * cellW - spreadW / 2 + cellW / 2 + randomSeedX * cellW * 0.5;
  const ty =
    row * cellH - spreadH / 2 + cellH / 2 + randomSeedY * cellH * 0.5;
  const tz = -150 + Math.sin(index * 789) * 50; // slight depth variation

  const rotZ = Math.sin(index * 111) * 15; // -15 to 15 deg tilt
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
 * House Of Cards view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function houseOfCards({ index }) {
  // House of Cards View: stacked structure

  // Build rows starting from bottom
  // Row 0 has max items, Row 1 has max-1, etc.
  let row = 0;
  let col = 0;
  let itemsInRow = 4; // Start with 4 items at the base
  let itemsCounted = 0;

  for (let i = 0; i < index; i++) {
    col++;
    if (col >= itemsInRow) {
      row++;
      col = 0;
      itemsInRow = Math.max(1, itemsInRow - 1);
    }
  }

  // Random slight offsets for realism
  const randomSeed = index * 9876.54321;
  const jitterX = (Math.sin(randomSeed) - 0.5) * 20;
  const jitterY = (Math.cos(randomSeed * 1.5) - 0.5) * 20;
  const jitterZ = (Math.sin(randomSeed * 2.5) - 0.5) * 10;
  const jitterRotZ = (Math.cos(randomSeed * 3.5) - 0.5) * 10;

  const spacingX = 220;
  const spacingY = 180;

  // Center the rows
  const startX = -((itemsInRow - 1) * spacingX) / 2;

  // Ty goes UP (negative) as row increases
  const tx = startX + col * spacingX + jitterX;
  const ty = 200 - row * spacingY + jitterY;
  const tz = -150 - row * 50 + jitterZ; // Push higher rows further back slightly

  // Slight leaning inward for stability illusion
  const rotY = tx > 0 ? -10 : tx < 0 ? 10 : 0;
  const rotX = -5; // Tilt slightly up
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY,
    rotZ: jitterRotZ,
  };
}

/**
 * Pyramid view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function pyramid({ index, count }) {
  const totalEchoes = count;
  // Pyramid View: converging layers
  const layerDepth = 200;
  const baseWidth = 800;
  const baseHeight = 600;

  // Approximate pyramid layers
  let layers = Math.ceil(Math.sqrt(totalEchoes));
  let itemsInLayer = layers;
  let layerIdx = 0;
  let itemInLayerIdx = 0;

  let remaining = index;
  for (let l = layers; l > 0; l--) {
      if (remaining < l) {
          layerIdx = layers - l;
          itemInLayerIdx = remaining;
          itemsInLayer = l;
          break;
      }
      remaining -= l;
  }

  const scale = 1 - (layerIdx / layers); // Shrink width/height per layer
  const currentWidth = baseWidth * scale;
  const currentHeight = baseHeight * scale;

  const tx = itemsInLayer > 1 ? -currentWidth/2 + (currentWidth / (itemsInLayer - 1)) * itemInLayerIdx : 0;
  const ty = (layerIdx * 100) - 200; // Shift up as we go deeper
  const tz = -(layerIdx + 1) * layerDepth;

  // Tilt slightly to point towards apex
  const rotX = 15;
  const rotY = itemsInLayer > 1 ? -15 + (30 / (itemsInLayer - 1)) * itemInLayerIdx : 0;
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
 * Prismatic Array view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function prismaticArray({ index, count }) {
  // Prismatic Array View positions
  const total = count;
  const columns = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / columns);
  const col = index % columns;

  const spacingX = 250;
  const spacingY = 200;

  const offsetX = (columns * spacingX) / 2 - (spacingX / 2);
  const offsetY = (Math.ceil(total / columns) * spacingY) / 2 - (spacingY / 2);

  const tx = (col * spacingX) - offsetX;
  const ty = (row * spacingY) - offsetY;
  const tz = -300 - (index * 20); // Push back and stagger depth slightly

  // Add a slight tilt based on position
  const rotY = (col - (columns / 2)) * 5;
  const rotX = (row - (total / columns / 2)) * -5;
  return {
    tx,
    ty,
    tz,
    rotX,
    rotY,
    rotZ: 0,
    vars: {
      "--item-index": index,
    },
  };
}

/**
 * Fractal view.
 * @param {LayoutInput} input
 * @returns {Placement}
 */
export function fractal({ index, viewport }) {
  // Fractal Tree positioning
  const depth = Math.floor(Math.log2(index + 1)); // 0, 1, 2, 3...
  const indexInLevel = index - (Math.pow(2, depth) - 1); // 0, 0,1, 0,1,2,3...
  const itemsInLevel = Math.pow(2, depth);

  // Spread evenly horizontally based on depth
  const xSpread = viewport.width * 0.8;
  const startX = -xSpread / 2;
  const stepX = itemsInLevel > 1 ? xSpread / (itemsInLevel - 1) : 0;

  const tX = startX + indexInLevel * stepX;
  const tY = depth * 300 - 400; // Go down as depth increases
  const tZ = -depth * 200; // Go back as depth increases

  const rX = 0;
  const rY = 0;
  const rZ = 0;
  return {
    tx: tX,
    ty: tY,
    tz: tZ,
    rotX: rX,
    rotY: rY,
    rotZ: rZ,
  };
}
