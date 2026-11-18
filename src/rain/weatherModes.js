// @ts-check
/**
 * Weather-mode profiles for the rain control surface.
 *
 * Each mode defines a `calm` and `active` parameter set. The active editor
 * signal (typing velocity, cursor motion, focus) drives a 0..1 "activity"
 * value that is lerped between the two, then damped over time so changes
 * arrive smoothly rather than snapping. See `WeatherSystem` for the damping
 * loop that consumes this.
 *
 * Parameter keys map directly onto `raindrops.options` (rainChance,
 * dropletsRate, maxDrops, trailRate, globalTimeScale) and RainLayer uniforms
 * (u_alphaMultiply, u_alphaSubtract, u_minRefraction, u_refractionDelta).
 * No new shader uniforms are introduced.
 *
 * Besides the lerped parameters, each mode carries:
 *  - `audio`: WeatherAudio bed gain/filter targets,
 *  - `wind`: lateral wind (calm → active) for backends that support it
 *    (wasm `rain_sim_set_wind`; the JS reference backend ignores it),
 *  - `lightning`: ambient strike spacing in ms, or `null` for none.
 */

/**
 * @typedef {{
 *   rainChance: number, dropletsRate: number, maxDrops: number,
 *   trailRate: number, globalTimeScale: number,
 *   u_alphaMultiply: number, u_alphaSubtract: number,
 *   u_minRefraction: number, u_refractionDelta: number,
 * }} WeatherParams
 * @typedef {{ gain: number, filterFrequency: number, filterQ: number }} WeatherAudioProfile
 * @typedef {{ calm: number, active: number }} WindProfile
 * @typedef {{ minGapMs: number, maxGapMs: number }} LightningProfile
 * @typedef {{
 *   label: string, description: string,
 *   calm: WeatherParams, active: WeatherParams,
 *   audio: WeatherAudioProfile, wind: WindProfile,
 *   lightning: LightningProfile | null,
 * }} WeatherProfile
 * @typedef {"drizzle" | "steady" | "storm" | "clearing"} WeatherMode
 */

export const WEATHER_STORAGE_KEY = "rain-edit:weatherMode";
/** @type {WeatherMode} */
export const DEFAULT_WEATHER_MODE = "steady";

/** @type {Record<WeatherMode, WeatherProfile>} */
export const WEATHER_MODES = {
  drizzle: {
    label: "Drizzle",
    description: "Light background rain; barely reacts to typing.",
    calm: {
      rainChance: 0.1,
      dropletsRate: 18,
      maxDrops: 420,
      trailRate: 0.6,
      globalTimeScale: 0.8,
      u_alphaMultiply: 4.2,
      u_alphaSubtract: 3.8,
      u_minRefraction: 190,
      u_refractionDelta: 14,
    },
    active: {
      rainChance: 0.22,
      dropletsRate: 34,
      maxDrops: 650,
      trailRate: 0.8,
      globalTimeScale: 0.95,
      u_alphaMultiply: 5.2,
      u_alphaSubtract: 4.4,
      u_minRefraction: 220,
      u_refractionDelta: 20,
    },
    audio: { gain: 0.05, filterFrequency: 900, filterQ: 0.5 },
    wind: { calm: 0, active: 0.15 },
    lightning: null,
  },
  steady: {
    label: "Steady",
    description: "The classic rain-2 storm — balanced and reactive.",
    calm: {
      rainChance: 0.3,
      dropletsRate: 50,
      maxDrops: 900,
      trailRate: 1.0,
      globalTimeScale: 1.0,
      u_alphaMultiply: 6.0,
      u_alphaSubtract: 5.0,
      u_minRefraction: 256,
      u_refractionDelta: 24,
    },
    active: {
      rainChance: 0.48,
      dropletsRate: 82,
      maxDrops: 1150,
      trailRate: 1.15,
      globalTimeScale: 1.1,
      u_alphaMultiply: 7.2,
      u_alphaSubtract: 5.8,
      u_minRefraction: 280,
      u_refractionDelta: 30,
    },
    audio: { gain: 0.09, filterFrequency: 1400, filterQ: 0.6 },
    wind: { calm: 0.1, active: 0.35 },
    lightning: { minGapMs: 10000, maxGapMs: 30000 },
  },
  storm: {
    label: "Storm",
    description: "Heavy, fast rain that surges hard while you type.",
    calm: {
      rainChance: 0.45,
      dropletsRate: 70,
      maxDrops: 1100,
      trailRate: 1.1,
      globalTimeScale: 1.1,
      u_alphaMultiply: 7.0,
      u_alphaSubtract: 5.6,
      u_minRefraction: 280,
      u_refractionDelta: 28,
    },
    active: {
      rainChance: 0.75,
      dropletsRate: 130,
      maxDrops: 1500,
      trailRate: 1.4,
      globalTimeScale: 1.3,
      u_alphaMultiply: 9.0,
      u_alphaSubtract: 7.0,
      u_minRefraction: 330,
      u_refractionDelta: 38,
    },
    audio: { gain: 0.16, filterFrequency: 2200, filterQ: 0.8 },
    wind: { calm: 0.4, active: 0.9 },
    lightning: { minGapMs: 5000, maxGapMs: 15000 },
  },
  clearing: {
    label: "Clearing",
    description: "Rain tapering off toward calm; muted response to typing.",
    calm: {
      rainChance: 0.04,
      dropletsRate: 8,
      maxDrops: 260,
      trailRate: 0.4,
      globalTimeScale: 0.7,
      u_alphaMultiply: 2.6,
      u_alphaSubtract: 2.6,
      u_minRefraction: 140,
      u_refractionDelta: 9,
    },
    active: {
      rainChance: 0.1,
      dropletsRate: 16,
      maxDrops: 360,
      trailRate: 0.5,
      globalTimeScale: 0.8,
      u_alphaMultiply: 3.2,
      u_alphaSubtract: 3.0,
      u_minRefraction: 160,
      u_refractionDelta: 12,
    },
    audio: { gain: 0.02, filterFrequency: 600, filterQ: 0.4 },
    wind: { calm: 0, active: 0.05 },
    lightning: null,
  },
};

/**
 * @param {unknown} value
 * @returns {WeatherMode}
 */
export function normalizeWeatherMode(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  return Object.hasOwn(WEATHER_MODES, v) ? /** @type {WeatherMode} */ (v) : DEFAULT_WEATHER_MODE;
}

/**
 * @param {string} [search]
 * @param {Pick<Storage, "getItem"> | null} [storage]
 * @returns {WeatherMode}
 */
export function readWeatherModeOverride(
  search = typeof location !== "undefined" ? location.search : "",
  storage = typeof localStorage !== "undefined" ? localStorage : null,
) {
  try {
    const params = new URLSearchParams(search);
    const fromUrl = params.get("weather");
    if (fromUrl) return normalizeWeatherMode(fromUrl);
  } catch {
    // ignore
  }
  try {
    const fromStorage = storage?.getItem(WEATHER_STORAGE_KEY);
    if (fromStorage) return normalizeWeatherMode(fromStorage);
  } catch {
    // ignore
  }
  return DEFAULT_WEATHER_MODE;
}

/**
 * @param {unknown} value
 * @param {Pick<Storage, "setItem"> | null} [storage]
 * @returns {WeatherMode}
 */
export function persistWeatherMode(
  value,
  storage = typeof localStorage !== "undefined" ? localStorage : null,
) {
  const normalized = normalizeWeatherMode(value);
  try {
    storage?.setItem(WEATHER_STORAGE_KEY, normalized);
  } catch {
    // ignore quota / private mode
  }
  return normalized;
}

/** @param {number} a @param {number} b @param {number} t */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Lerp a mode's calm/active parameter sets by activity (0..1).
 * @param {unknown} mode
 * @param {number} activity
 * @returns {WeatherParams}
 */
export function computeWeatherTargets(mode, activity) {
  const profile = WEATHER_MODES[normalizeWeatherMode(mode)];
  const t = Math.max(0, Math.min(1, activity));
  const targets = /** @type {WeatherParams} */ ({ ...profile.calm });
  for (const key of /** @type {(keyof WeatherParams)[]} */ (Object.keys(profile.calm))) {
    targets[key] = lerp(profile.calm[key], profile.active[key], t);
  }
  return targets;
}

/**
 * Lateral wind for a mode at an activity level (0..1).
 * @param {unknown} mode
 * @param {number} activity
 */
export function computeWind(mode, activity) {
  const { wind } = WEATHER_MODES[normalizeWeatherMode(mode)];
  return lerp(wind.calm, wind.active, Math.max(0, Math.min(1, activity)));
}
