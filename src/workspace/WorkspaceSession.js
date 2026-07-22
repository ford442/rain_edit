/**
 * WorkspaceSession — persist/restore storm layouts across refresh.
 *
 * Owns: tabs (+ content, depth, dirty, cursor), view mode, reference cards,
 * optional local project pointer, optional remote note sync.
 * Does NOT persist InputManager active key modes.
 */

import {
  applyViewMode,
  buildSession,
  detectViewMode,
  LEGACY_TABS_KEY,
  normalizeSession,
  REMOTE_SESSION_NOTE,
  REMOTE_SYNC_OPT_IN_KEY,
  serializeTabFile,
  SESSION_VERSION,
} from "./sessionSchema.js";
import {
  clearPersistedSession,
  loadPersistedSession,
  persistSession,
} from "./idbStore.js";

const PERSIST_DEBOUNCE_MS = 400;

export class WorkspaceSession {
  /**
   * @param {object} deps
   * @param {import('../TabManager.js').TabManager} deps.tabManager
   * @param {import('../ReferenceManager.js').ReferenceManager | null} [deps.referenceManager]
   * @param {HTMLTextAreaElement | null} [deps.referenceInput]
   * @param {HTMLSelectElement | null} [deps.viewModeSelect]
   * @param {import('../StorageAPI.js').StorageAPI | null} [deps.storageAPI]
   * @param {Storage | null} [deps.localStorage]
   */
  constructor({
    tabManager,
    referenceManager = null,
    referenceInput = null,
    viewModeSelect = null,
    storageAPI = null,
    localStorage = globalThis.localStorage,
  }) {
    this.tabManager = tabManager;
    this.referenceManager = referenceManager;
    this.referenceInput = referenceInput;
    this.viewModeSelect = viewModeSelect;
    this.storageAPI = storageAPI;
    this.localStorage = localStorage;
    this._persistTimer = null;
    this._modelDisposables = new Map();
    this._restoring = false;
    this._project = null;
    this.remoteSync =
      localStorage?.getItem(REMOTE_SYNC_OPT_IN_KEY) === "1";

    tabManager.workspaceSession = this;
  }

  setRemoteSync(enabled) {
    this.remoteSync = Boolean(enabled);
    try {
      this.localStorage?.setItem(
        REMOTE_SYNC_OPT_IN_KEY,
        this.remoteSync ? "1" : "0",
      );
    } catch {
      // ignore
    }
    this.schedulePersist();
  }

  setProject(project) {
    this._project = project;
    this.schedulePersist();
  }

  /**
   * Capture Monaco cursor/selection for the active file.
   */
  captureEditorState() {
    const tm = this.tabManager;
    const file = tm.files.find((f) => f.id === tm.activeId);
    if (!file || file.isImage || !tm.editor) return;
    try {
      const sel = tm.editor.getSelection?.();
      const pos = tm.editor.getPosition?.();
      if (pos) {
        file.cursor = { lineNumber: pos.lineNumber, column: pos.column };
      }
      if (sel) {
        file.selection = {
          startLineNumber: sel.startLineNumber,
          startColumn: sel.startColumn,
          endLineNumber: sel.endLineNumber,
          endColumn: sel.endColumn,
        };
      }
    } catch {
      // ignore
    }
  }

  /**
   * Snapshot reference markdown + card layout overrides.
   */
  captureReference() {
    const markdown =
      this.referenceInput?.value ??
      this.referenceManager?.lastMarkdown ??
      "";
    const cards = [];
    const cardEls = this.referenceManager?.getCards?.() || [];
    cardEls.forEach((el, index) => {
      const style = el.style || {};
      cards.push({
        index,
        left: style.left || "",
        top: style.top || "",
        transform: style.transform || "",
        zIndex: style.zIndex || "",
        frosted: el.classList?.contains("frosted") || false,
        collapsed: el.classList?.contains("collapsed") || false,
        depth: el.dataset?.depth || "",
        initialRot: el.dataset?.initialRot || "",
      });
    });
    return { markdown, cards };
  }

  buildSnapshot() {
    this.captureEditorState();
    const tabs = this.tabManager.files.map((file) => serializeTabFile(file));
    return buildSession({
      version: SESSION_VERSION,
      activeId: this.tabManager.activeId,
      viewMode:
        this.viewModeSelect?.value ||
        detectViewMode(globalThis.document?.body) ||
        "",
      tabs,
      reference: this.captureReference(),
      project: this._project,
      remoteSync: this.remoteSync,
    });
  }

  schedulePersist() {
    if (this._restoring) return;
    if (this._persistTimer) clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(() => {
      this._persistTimer = null;
      void this.persistNow();
    }, PERSIST_DEBOUNCE_MS);
  }

  async persistNow() {
    if (this._restoring) return null;
    const session = this.buildSnapshot();
    const where = await persistSession(session, this.localStorage);
    // Keep legacy key in sync for older code paths / debugging.
    try {
      this.localStorage?.setItem(
        LEGACY_TABS_KEY,
        JSON.stringify(
          session.tabs.map((t) => ({
            fileId: t.id,
            name: t.name,
            language: t.language,
            vpsPath: t.vpsPath,
            isImage: t.isImage,
            url: t.url,
            noteName: t.noteName,
            depth: t.depth,
          })),
        ),
      );
    } catch {
      // ignore
    }

    if (this.remoteSync && this.storageAPI) {
      try {
        await this.storageAPI.saveNote(
          REMOTE_SESSION_NOTE,
          JSON.stringify(session, null, 2),
        );
      } catch (err) {
        console.warn("[workspace] remote session sync failed", err);
      }
    }
    return { session, where };
  }

  hasDirtyFiles() {
    return this.tabManager.files.some((f) => f.dirty);
  }

  /**
   * Mark a file clean after a successful durable save (VPS / note / local).
   * @param {number} id
   */
  markClean(id) {
    const file = this.tabManager.files.find((f) => f.id === id);
    if (!file) return;
    file.dirty = false;
    if (file.model && typeof file.model.getValue === "function") {
      file.savedContent = file.model.getValue();
    }
    this.tabManager._renderTabs?.();
    this.schedulePersist();
  }

  markDirty(id) {
    const file = this.tabManager.files.find((f) => f.id === id);
    if (!file || file.isImage) return;
    file.dirty = true;
    this.tabManager._renderTabs?.();
    this.schedulePersist();
  }

  /**
   * Track Monaco model edits for dirty flags. Call after addFile / restore.
   * @param {object} file
   */
  watchFile(file) {
    if (!file || file.isImage || !file.model) return;
    if (this._modelDisposables.has(file.id)) {
      try {
        this._modelDisposables.get(file.id).dispose?.();
      } catch {
        // ignore
      }
    }
    if (file.savedContent === undefined) {
      file.savedContent =
        typeof file.model.getValue === "function" ? file.model.getValue() : "";
    }
    if (file.dirty === undefined) file.dirty = false;

    const disposable = file.model.onDidChangeContent?.(() => {
      const value = file.model.getValue();
      const dirty = value !== file.savedContent;
      if (file.dirty !== dirty) {
        file.dirty = dirty;
        this.tabManager._renderTabs?.();
      }
      this.schedulePersist();
    });
    if (disposable) this._modelDisposables.set(file.id, disposable);
  }

  unwatchFile(id) {
    const d = this._modelDisposables.get(id);
    if (d) {
      try {
        d.dispose?.();
      } catch {
        // ignore
      }
      this._modelDisposables.delete(id);
    }
  }

  /**
   * Restore last session. Returns true if tabs were restored.
   * @param {{ preferRemote?: boolean }} [opts]
   */
  async restore(opts = {}) {
    this._restoring = true;
    try {
      let raw = null;
      if (opts.preferRemote && this.remoteSync && this.storageAPI) {
        try {
          const note = await this.storageAPI.loadNote(REMOTE_SESSION_NOTE);
          if (note?.content) raw = JSON.parse(note.content);
        } catch {
          // fall through to local
        }
      }
      if (!raw) raw = await loadPersistedSession(this.localStorage);
      if (!raw) {
        // Migrate legacy tab list.
        try {
          const legacy = this.localStorage?.getItem(LEGACY_TABS_KEY);
          if (legacy) raw = JSON.parse(legacy);
        } catch {
          // ignore
        }
      }

      const session = normalizeSession(raw);
      if (!session || !session.tabs.length) return false;

      this.remoteSync = Boolean(session.remoteSync) || this.remoteSync;
      this._project = session.project || null;

      // Clear existing files without re-entering persist.
      while (this.tabManager.files.length) {
        const f = this.tabManager.files[0];
        this.unwatchFile(f.id);
        if (f.model?.dispose) f.model.dispose();
        this.tabManager.files.shift();
      }
      this.tabManager.activeId = null;
      this.tabManager._nextId = 1;

      const createdIds = [];
      let activeIndex = session.tabs.findIndex((t) => t.id === session.activeId);
      if (activeIndex < 0) activeIndex = 0;

      for (const tab of session.tabs) {
        let content = tab.content || "";
        // Prefer live remote content for linked assets when available.
        if (!tab.isImage && this.storageAPI) {
          try {
            if (tab.vpsPath) {
              content = await this.storageAPI.getVPSFile(tab.vpsPath);
            } else if (tab.noteName) {
              const note = await this.storageAPI.loadNote(tab.noteName);
              content = note?.content ?? content;
            }
          } catch (err) {
            console.warn(
              `[workspace] using cached content for ${tab.name}`,
              err,
            );
          }
        }

        const language = tab.isImage ? "image" : tab.language || "plaintext";
        const openContent = tab.isImage ? tab.url || "" : content;
        const id = this.tabManager.addFile(tab.name, openContent, language);
        createdIds.push(id);
        const file = this.tabManager.files.find((f) => f.id === id);
        if (!file) continue;

        file.depth = tab.depth;
        file.vpsPath = tab.vpsPath || undefined;
        file.noteName = tab.noteName || undefined;
        file.cabinetType = tab.cabinetType || undefined;
        file.cabinetId = tab.cabinetId || undefined;
        file.localPath = tab.localPath || undefined;
        file.opfsPath = tab.opfsPath || undefined;
        file.cursor = tab.cursor || null;
        file.selection = tab.selection || null;
        file.savedContent = tab.isImage
          ? undefined
          : file.model?.getValue?.() ?? content;
        // After remote refetch treat as clean; keep dirty for pure local buffers.
        file.dirty = Boolean(tab.dirty) && !tab.vpsPath && !tab.noteName;
        this.watchFile(file);
      }

      const active = createdIds[activeIndex] ?? createdIds[0];
      if (active != null) {
        this.tabManager.setActive(active);
        this._restoreEditorState(active);
      }

      applyViewMode(this.tabManager, session.viewMode || "");
      if (this.viewModeSelect) {
        this.viewModeSelect.value = session.viewMode || "";
      }

      if (session.reference?.markdown) {
        if (this.referenceInput) {
          this.referenceInput.value = session.reference.markdown;
        }
        this.referenceManager?.update?.(session.reference.markdown);
        this._applyCardLayouts(session.reference.cards || []);
      }

      return this.tabManager.files.length > 0;
    } finally {
      this._restoring = false;
      // Re-bind watchers already set; persist the normalized session once.
      this.schedulePersist();
    }
  }

  _restoreEditorState(fileId) {
    const file = this.tabManager.files.find((f) => f.id === fileId);
    if (!file || file.isImage || !this.tabManager.editor) return;
    try {
      if (file.selection) {
        this.tabManager.editor.setSelection(file.selection);
      } else if (file.cursor) {
        this.tabManager.editor.setPosition(file.cursor);
      }
      this.tabManager.editor.revealPositionInCenter?.(
        file.cursor || file.selection,
      );
    } catch {
      // ignore
    }
  }

  _applyCardLayouts(cards) {
    if (!cards.length || !this.referenceManager) return;
    const els = this.referenceManager.getCards?.() || [];
    cards.forEach((card) => {
      const el = els[card.index];
      if (!el) return;
      if (card.left) el.style.left = card.left;
      if (card.top) el.style.top = card.top;
      if (card.transform) el.style.transform = card.transform;
      if (card.zIndex) el.style.zIndex = card.zIndex;
      if (card.depth) el.dataset.depth = card.depth;
      if (card.initialRot) el.dataset.initialRot = card.initialRot;
      if (card.frosted) el.classList.add("frosted");
      if (card.collapsed) el.classList.add("collapsed");
    });
  }

  exportJSON() {
    return JSON.stringify(this.buildSnapshot(), null, 2);
  }

  /**
   * Import a storm-layout JSON string and hydrate.
   * @param {string} json
   */
  async importJSON(json) {
    const raw = typeof json === "string" ? JSON.parse(json) : json;
    const session = normalizeSession(raw);
    if (!session) throw new Error("Invalid workspace session JSON");
    await persistSession(session, this.localStorage);
    return this.restore();
  }

  async clear() {
    await clearPersistedSession(this.localStorage);
    try {
      this.localStorage?.removeItem(LEGACY_TABS_KEY);
    } catch {
      // ignore
    }
  }

  installUnloadGuard() {
    if (typeof window === "undefined") return () => {};
    const onBeforeUnload = (event) => {
      void this.persistNow();
      if (this.hasDirtyFiles()) {
        event.preventDefault();
        event.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }

  /**
   * Wire UI controls (export/import/sync/clear).
   * @param {Document} [doc]
   */
  bindDockControls(doc = document) {
    const exportBtn = doc.getElementById("btn-workspace-export");
    const importBtn = doc.getElementById("btn-workspace-import");
    const importInput = doc.getElementById("workspace-import-input");
    const syncToggle = doc.getElementById("workspace-remote-sync");
    const clearBtn = doc.getElementById("btn-workspace-clear");

    if (syncToggle) {
      syncToggle.checked = this.remoteSync;
      syncToggle.addEventListener("change", (e) => {
        this.setRemoteSync(e.target.checked);
        this.tabManager._showToast?.(
          e.target.checked
            ? "Remote session sync enabled"
            : "Remote session sync disabled",
        );
      });
    }

    exportBtn?.addEventListener("click", () => {
      const blob = new Blob([this.exportJSON()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = doc.createElement("a");
      a.href = url;
      a.download = `rain-workspace-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    importBtn?.addEventListener("click", () => importInput?.click());
    importInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await this.importJSON(text);
        this.tabManager._showToast?.("Workspace imported");
      } catch (err) {
        console.error(err);
        this.tabManager._showToast?.(
          `Import failed: ${err.message || err}`,
          true,
        );
      }
      e.target.value = "";
    });

    clearBtn?.addEventListener("click", async () => {
      if (
        !globalThis.confirm?.(
          "Clear saved workspace session? Open tabs stay until refresh.",
        )
      ) {
        return;
      }
      await this.clear();
      this.tabManager._showToast?.("Saved workspace cleared");
    });

    this.viewModeSelect?.addEventListener("change", () => {
      this.schedulePersist();
    });

    this.referenceInput?.addEventListener("input", () => {
      this.schedulePersist();
    });
  }
}

/** @type {WorkspaceSession | null} */
let singleton = null;

export function getWorkspaceSession() {
  return singleton;
}

export function setWorkspaceSession(session) {
  singleton = session;
  return session;
}
