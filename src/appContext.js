/**
 * Application context: shared runtime references to the managers, layers,
 * and DOM roots that `src/boot/createApp.js` constructs.
 *
 * Import named bindings (they are live ES-module bindings, so a reference read
 * after boot sees the constructed instance), or `import * as appContext` and
 * pass the namespace as a `ctx` dependency to classes that read refs lazily.
 * Do not add `window.*` globals — `window.tabManager` is the single
 * documented debug alias, assigned in `createApp()`.
 *
 * Mutable per-interaction flags (peel/fan/lens/explode/… state) live in
 * `src/interactions/interactionState.js`, not here.
 */

/** @type {import('./TabManager.js').TabManager | null} */
export let tabManager = null;
/** @type {import('./ReferenceManager.js').ReferenceManager | null} */
export let referenceManager = null;
/** @type {import('./ConnectionManager.js').ConnectionManager | null} */
export let connectionManager = null;
/** @type {import('./FogManager.js').FogManager | null} */
export let fogManager = null;
/** @type {import('./HoloManager.js').HoloManager | null} */
export let holoManager = null;
/** @type {import('monaco-editor').editor.IStandaloneCodeEditor | null} */
export let editor = null;
/** @type {HTMLElement | null} */
export let editorEl = null;
/** @type {HTMLElement | null} */
export let echoLayerEl = null;
/** @type {HTMLElement | null} */
export let neonScatterLayer = null;
/** @type {import('./workspace/WorkspaceSession.js').WorkspaceSession | null} */
export let workspaceSession = null;
/** @type {import('./workspace/LocalProject.js').LocalProject | null} */
export let localProject = null;
/** @type {import('./StorageAPI.js').StorageAPI | null} */
export let storageAPI = null;
/** @type {import('./Cabinet3D.js').Cabinet3D | null} */
export let cabinet3D = null;
/** @type {import('./VPSFileBrowser.js').VPSFileBrowser | null} */
export let vpsBrowser = null;
/** @type {import('./VeilExcavator.js').VeilExcavator | null} */
export let veilExcavator = null;
/** @type {import('./rain/WeatherSystem.js').WeatherSystem | null} */
export let weatherSystem = null;
/** @type {import('./audio/WeatherAudio.js').WeatherAudio | null} */
export let weatherAudio = null;
/** @type {import('./rain/WaterMapSim.js').WaterMapSim | null} */
export let raindrops = null;
/** @type {import('./RainLayer.js').default | null} */
export let bgLayer = null;
/** @type {import('./RainLayer.js').default | null} */
export let fgLayer = null;
/** @type {import('./rain/RainScene.js').RainScene | null} */
export let rainScene = null;
/** @type {import('./runtime/AppClock.js').AppClock | null} */
export let clock = null;

const KEYS = /** @type {const} */ ([
  "tabManager",
  "referenceManager",
  "connectionManager",
  "fogManager",
  "holoManager",
  "editor",
  "editorEl",
  "echoLayerEl",
  "neonScatterLayer",
  "workspaceSession",
  "localProject",
  "storageAPI",
  "cabinet3D",
  "vpsBrowser",
  "veilExcavator",
  "weatherSystem",
  "weatherAudio",
  "raindrops",
  "bgLayer",
  "fgLayer",
  "rainScene",
  "clock",
]);

/**
 * Update one or more shared references. Unknown keys throw so a typo can't
 * silently create a dead slot.
 * @param {Record<string, unknown>} partial
 */
export function setAppContext(partial) {
  for (const key of Object.keys(partial)) {
    if (!KEYS.includes(/** @type {any} */ (key))) {
      throw new Error(`setAppContext: unknown key "${key}"`);
    }
    const value = /** @type {any} */ (partial[key]);
    if (value === undefined) continue;
    switch (key) {
      case "tabManager": tabManager = value; break;
      case "referenceManager": referenceManager = value; break;
      case "connectionManager": connectionManager = value; break;
      case "fogManager": fogManager = value; break;
      case "holoManager": holoManager = value; break;
      case "editor": editor = value; break;
      case "editorEl": editorEl = value; break;
      case "echoLayerEl": echoLayerEl = value; break;
      case "neonScatterLayer": neonScatterLayer = value; break;
      case "workspaceSession": workspaceSession = value; break;
      case "localProject": localProject = value; break;
      case "storageAPI": storageAPI = value; break;
      case "cabinet3D": cabinet3D = value; break;
      case "vpsBrowser": vpsBrowser = value; break;
      case "veilExcavator": veilExcavator = value; break;
      case "weatherSystem": weatherSystem = value; break;
      case "weatherAudio": weatherAudio = value; break;
      case "raindrops": raindrops = value; break;
      case "bgLayer": bgLayer = value; break;
      case "fgLayer": fgLayer = value; break;
      case "rainScene": rainScene = value; break;
      case "clock": clock = value; break;
    }
  }
}
