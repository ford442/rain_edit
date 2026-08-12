/**
 * Small application context for shared runtime references.
 * Prefer importing from here over scattering `window.*` globals.
 * `window.tabManager` remains exposed intentionally for debug automation.
 */

/** @type {import('./TabManager.js').TabManager | null} */
export let tabManager = null;
/** @type {import('./ReferenceManager.js').ReferenceManager | null} */
export let referenceManager = null;
/** @type {import('./ConnectionManager.js').ConnectionManager | null} */
export let connectionManager = null;
/** @type {import('./FogManager.js').FogManager | null} */
export let fogManager = null;
/** @type {import('monaco-editor').editor.IStandaloneCodeEditor | null} */
export let editor = null;
/** @type {HTMLElement | null} */
export let echoLayerEl = null;
/** @type {import('./workspace/WorkspaceSession.js').WorkspaceSession | null} */
export let workspaceSession = null;
/** @type {import('./workspace/LocalProject.js').LocalProject | null} */
export let localProject = null;

/**
 * @param {Partial<{
 *   tabManager: import('./TabManager.js').TabManager,
 *   referenceManager: import('./ReferenceManager.js').ReferenceManager,
 *   connectionManager: import('./ConnectionManager.js').ConnectionManager,
 *   fogManager: import('./FogManager.js').FogManager,
 *   editor: import('monaco-editor').editor.IStandaloneCodeEditor,
 *   echoLayerEl: HTMLElement,
 *   workspaceSession: import('./workspace/WorkspaceSession.js').WorkspaceSession,
 *   localProject: import('./workspace/LocalProject.js').LocalProject,
 * }>} partial
 */
export function setAppContext(partial) {
  if (partial.tabManager !== undefined) tabManager = partial.tabManager;
  if (partial.referenceManager !== undefined)
    referenceManager = partial.referenceManager;
  if (partial.connectionManager !== undefined)
    connectionManager = partial.connectionManager;
  if (partial.fogManager !== undefined) fogManager = partial.fogManager;
  if (partial.editor !== undefined) editor = partial.editor;
  if (partial.echoLayerEl !== undefined) echoLayerEl = partial.echoLayerEl;
  if (partial.workspaceSession !== undefined)
    workspaceSession = partial.workspaceSession;
  if (partial.localProject !== undefined) localProject = partial.localProject;
}
