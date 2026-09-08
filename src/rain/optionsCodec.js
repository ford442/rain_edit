// @ts-check
/** Shared rain-sim option defaults and WASM f32 packing. */

/**
 * @typedef {object} RainOptions
 * @property {number} minR
 * @property {number} maxR
 * @property {number} maxDrops
 * @property {number} rainChance
 * @property {number} rainLimit
 * @property {number} dropletsRate
 * @property {[number, number]} dropletsSize
 * @property {number} dropletsCleaningRadiusMultiplier
 * @property {boolean} raining
 * @property {number} globalTimeScale
 * @property {number} trailRate
 * @property {boolean} autoShrink
 * @property {[number, number]} spawnArea
 * @property {[number, number]} trailScaleRange
 * @property {number} collisionRadius
 * @property {number} collisionRadiusIncrease
 * @property {number} dropFallMultiplier
 * @property {number} collisionBoostMultiplier
 * @property {number} collisionBoost
 */

/** @type {RainOptions} */
export const DEFAULT_RAIN_OPTIONS = {
  minR: 10,
  maxR: 40,
  maxDrops: 900,
  rainChance: 0.3,
  rainLimit: 3,
  dropletsRate: 50,
  dropletsSize: [2, 4],
  dropletsCleaningRadiusMultiplier: 0.43,
  raining: true,
  globalTimeScale: 1,
  trailRate: 1,
  autoShrink: true,
  spawnArea: [-0.1, 0.95],
  trailScaleRange: [0.2, 0.5],
  collisionRadius: 0.65,
  collisionRadiusIncrease: 0.01,
  dropFallMultiplier: 1,
  collisionBoostMultiplier: 0.05,
  collisionBoost: 1,
};

/**
 * Pack options into the f32 layout expected by rain_sim_set_options.
 * @param {Partial<RainOptions>} options
 * @returns {Float32Array}
 */
export function packOptionsForWasm(options) {
  const o = { ...DEFAULT_RAIN_OPTIONS, ...options };
  const dropletsSize = o.dropletsSize || DEFAULT_RAIN_OPTIONS.dropletsSize;
  const spawnArea = o.spawnArea || DEFAULT_RAIN_OPTIONS.spawnArea;
  const trailScaleRange = o.trailScaleRange || DEFAULT_RAIN_OPTIONS.trailScaleRange;
  return new Float32Array([
    o.minR,
    o.maxR,
    o.maxDrops,
    o.rainChance,
    o.rainLimit,
    o.dropletsRate,
    dropletsSize[0],
    dropletsSize[1],
    o.dropletsCleaningRadiusMultiplier,
    o.raining ? 1 : 0,
    o.globalTimeScale,
    o.trailRate,
    o.autoShrink ? 1 : 0,
    spawnArea[0],
    spawnArea[1],
    trailScaleRange[0],
    trailScaleRange[1],
    o.collisionRadius,
    o.collisionRadiusIncrease,
    o.dropFallMultiplier,
    o.collisionBoostMultiplier,
    o.collisionBoost,
  ]);
}
