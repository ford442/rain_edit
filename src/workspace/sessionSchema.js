/**
 * Workspace session schema + view-mode helpers (pure, Node-testable).
 */

import { VIEW_MODES, bodyClassFor, toggleMethodFor } from "../tabManager/viewModes.js";

export const SESSION_VERSION = 1;
export const SESSION_STORAGE_KEY = "rain_edit_workspace_session";
export const LEGACY_TABS_KEY = "rain_edit_open_tabs";
export const REMOTE_SESSION_NOTE = "__rain_workspace_session__.json";
export const REMOTE_SYNC_OPT_IN_KEY = "rain-edit:remoteSessionSync";

/**
 * Select value → TabManager toggle method name, derived from the one view-mode
 * registry (src/tabManager/viewModes.js).
 * @type {Readonly<Record<string, string>>}
 */
export const VIEW_MODE_TOGGLES = Object.freeze(
  Object.fromEntries(VIEW_MODES.map((m) => [m.value, toggleMethodFor(m)])),
);

/** Select value → body class the mode sets while active. */
export const VIEW_MODE_BODY_CLASS = Object.freeze(
  Object.fromEntries(VIEW_MODES.map((m) => [m.value, bodyClassFor(m)])),
);

/**
 * Detect the active view mode from document.body classes.
 * @param {ParentNode | { classList: DOMTokenList }} [root]
 * @returns {string} select value or ""
 */
export function detectViewMode(root = globalThis.document?.body) {
  if (!root?.classList) return "";
  for (const value of Object.keys(VIEW_MODE_TOGGLES)) {
    const cls = VIEW_MODE_BODY_CLASS[value];
    if (root.classList.contains(cls)) return value;
  }
  return "";
}

/**
 * Apply a stored view mode on TabManager.
 * @param {{ setViewMode?: Function, _deactivateAllViews?: Function, [k: string]: unknown }} tabManager
 * @param {string} viewMode
 */
export function applyViewMode(tabManager, viewMode) {
  if (!tabManager) return;
  if (typeof tabManager.setViewMode === "function") {
    // Idempotent: unknown/empty values fall back to the default view.
    tabManager.setViewMode(VIEW_MODE_TOGGLES[viewMode] ? viewMode : "");
    return;
  }
  if (!viewMode) {
    tabManager._deactivateAllViews?.();
    return;
  }
  const method = VIEW_MODE_TOGGLES[viewMode];
  if (method && typeof tabManager[method] === "function") {
    // Toggles are idempotent only when inactive; deactivate first then enable.
    tabManager._deactivateAllViews?.();
    tabManager[method]();
  }
}

/**
 * @param {object} file
 * @returns {object}
 */
export function serializeTabFile(file) {
  const content =
    file.isImage
      ? null
      : file.model && typeof file.model.getValue === "function"
        ? file.model.getValue()
        : typeof file.content === "string"
          ? file.content
          : "";

  return {
    id: file.id,
    name: file.name,
    language: file.language || "plaintext",
    depth: clampDepth(file.depth),
    dirty: Boolean(file.dirty),
    isImage: Boolean(file.isImage),
    url: file.url || null,
    vpsPath: file.vpsPath || null,
    noteName: file.noteName || null,
    cabinetType: file.cabinetType || null,
    cabinetId: file.cabinetId || null,
    localPath: file.localPath || null,
    opfsPath: file.opfsPath || null,
    content: file.isImage ? null : content,
    cursor: file.cursor || null,
    selection: file.selection || null,
  };
}

export function clampDepth(depth) {
  const n = Number(depth);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(2, n | 0));
}

/**
 * Build a versioned workspace session object.
 * @param {object} partial
 */
export function buildSession(partial = {}) {
  return {
    version: SESSION_VERSION,
    savedAt: partial.savedAt || new Date().toISOString(),
    activeId: partial.activeId ?? null,
    viewMode: partial.viewMode || "",
    tabs: Array.isArray(partial.tabs) ? partial.tabs : [],
    reference: {
      markdown: partial.reference?.markdown || "",
      cards: Array.isArray(partial.reference?.cards)
        ? partial.reference.cards
        : [],
    },
    project: partial.project || null,
    remoteSync: Boolean(partial.remoteSync),
  };
}

/**
 * Validate / normalize a parsed session JSON blob.
 * @param {unknown} raw
 * @returns {ReturnType<typeof buildSession> | null}
 */
export function normalizeSession(raw) {
  if (!raw || typeof raw !== "object") return null;
  const obj = /** @type {Record<string, unknown>} */ (raw);
  if (Array.isArray(obj) || Array.isArray(obj.tabs) === false) {
    // Legacy rain_edit_open_tabs array
    if (Array.isArray(raw)) {
      return buildSession({
        tabs: raw.map((tab, index) => ({
          id: tab.fileId ?? tab.id ?? index + 1,
          name: tab.name || `untitled-${index + 1}`,
          language: tab.language || "plaintext",
          depth: 1,
          dirty: false,
          isImage: Boolean(tab.isImage),
          url: tab.url || null,
          vpsPath: tab.vpsPath || null,
          noteName: tab.noteName || null,
          content: tab.content ?? "",
        })),
        activeId: raw[0]?.fileId ?? raw[0]?.id ?? null,
      });
    }
  }

  const tabs = Array.isArray(obj.tabs) ? obj.tabs : [];
  return buildSession({
    savedAt: typeof obj.savedAt === "string" ? obj.savedAt : undefined,
    activeId: obj.activeId ?? null,
    viewMode: typeof obj.viewMode === "string" ? obj.viewMode : "",
    tabs: tabs.map((tab, index) => {
      const t = tab && typeof tab === "object" ? tab : {};
      return {
        id: t.id ?? t.fileId ?? index + 1,
        name: t.name || `untitled-${index + 1}`,
        language: t.language || "plaintext",
        depth: clampDepth(t.depth),
        dirty: Boolean(t.dirty),
        isImage: Boolean(t.isImage),
        url: t.url || null,
        vpsPath: t.vpsPath || null,
        noteName: t.noteName || null,
        cabinetType: t.cabinetType || null,
        cabinetId: t.cabinetId || null,
        localPath: t.localPath || null,
        opfsPath: t.opfsPath || null,
        content: t.isImage ? null : (t.content ?? ""),
        cursor: t.cursor || null,
        selection: t.selection || null,
      };
    }),
    reference: {
      markdown:
        typeof obj.reference === "object" && obj.reference
          ? obj.reference.markdown || ""
          : "",
      cards:
        typeof obj.reference === "object" &&
        obj.reference &&
        Array.isArray(obj.reference.cards)
          ? obj.reference.cards
          : [],
    },
    project: obj.project || null,
    remoteSync: Boolean(obj.remoteSync),
  });
}

export function sessionHasDirtyTabs(session) {
  return Boolean(session?.tabs?.some((t) => t.dirty));
}
