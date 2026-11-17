import StorageAPI from "./StorageAPI.js";
import {
  TOAST_DISPLAY_DURATION,
  DEPTH_Z_INDEX,
  DEPTH_ICONS,
  DEPTH_TITLES,
} from "./tabManager/constants.js";
import { _extractSymbols, _symbolKindIcon } from "./tabManager/symbols.js";
import { EchoLayer } from "./tabManager/EchoLayer.js";
import {
  VIEW_MODES,
  VIEW_MODE_BODY_CLASSES,
  bodyClassFor,
  buttonIdFor,
  flagFor,
  getViewMode,
  toggleMethodFor,
} from "./tabManager/viewModes.js";
import { interactionState } from "./interactions/interactionState.js";

export const storageAPI = new StorageAPI();
export {
  TOAST_DISPLAY_DURATION,
  DEPTH_Z_INDEX,
  DEPTH_ICONS,
  DEPTH_TITLES,
  _extractSymbols,
  _symbolKindIcon,
};

/**
 * Open documents, the active Monaco model, per-file depth (0/1/2), the 3D
 * view mode, and the background echoes of inactive files.
 *
 * - View modes: one registry (tabManager/viewModes.js). `toggleXView()` and
 *   `isXView` are generated from it below; `viewMode` is the single state.
 * - Echoes: EchoLayer (tabManager/EchoLayer.js) virtualizes them and places
 *   them with the pure layout registry (tabManager/layouts/).
 *
 * Public API is declared in TabManager.d.ts — keep it in sync.
 */
export class TabManager {
  /**
   * @param {import('monaco-editor').editor.IStandaloneCodeEditor} editor
   * @param {typeof import('monaco-editor')} monacoApi
   * @param {HTMLElement} editorEl  - the #editor DOM node
   * @param {HTMLElement} tabsEl    - the #tabs-container DOM node
   * @param {HTMLElement | null} [imageViewerEl]
   * @param {HTMLElement | null} [echoLayerEl] - the #echo-layer DOM node
   */
  constructor(
    editor,
    monacoApi,
    editorEl,
    tabsEl,
    imageViewerEl = null,
    echoLayerEl = null,
  ) {
    this.editor = editor;
    this.monaco = monacoApi;
    this.editorEl = editorEl;
    this.tabsEl = tabsEl;
    this.imageViewerEl =
      imageViewerEl || document.getElementById("image-viewer");
    this.echoLayerEl = echoLayerEl || document.getElementById("echo-layer");
    this.files = [];
    this.activeId = null;
    this._nextId = 1;
    /** Active view-mode value ("" = default). See tabManager/viewModes.js. */
    this.viewMode = "";
    this.echoLayer = this.echoLayerEl
      ? new EchoLayer({
          root: this.echoLayerEl,
          host: this,
          scroll: () => interactionState.archScrollOffset || 0,
        })
      : null;
  }

  // ── Documents ────────────────────────────────────────────────────────────

  /**
   * Add a new file/document.
   * @param {string} name       - display name shown in the tab
   * @param {string} content    - initial text content (image URL for images)
   * @param {string} language   - Monaco language identifier, or "image"
   * @returns {number} the new file's id
   */
  addFile(name, content = "", language = "javascript") {
    const id = this._nextId++;
    const isImage = language === "image";
    const model = isImage ? null : this.monaco.editor.createModel(content, language);

    const file = {
      id,
      name,
      model,
      depth: 1,
      isImage,
      language,
      url: isImage ? content : null,
      dirty: false,
      savedContent: isImage ? undefined : content,
    };
    this.files.push(file);
    this.workspaceSession?.watchFile?.(file);
    this._renderTabs();
    this._saveTabsToStorage();
    return id;
  }

  /**
   * Switch to a file by id; updates the Monaco model and applies its depth.
   * @param {number} id
   */
  setActive(id) {
    const file = this.files.find((f) => f.id === id);
    if (!file) return;
    this.activeId = id;

    const titleBar = document.getElementById("editor-title-bar");
    if (titleBar) titleBar.textContent = file.name;

    // Warp-in animation
    const targetEl = file.isImage ? this.imageViewerEl : this.editorEl;
    if (targetEl) {
      targetEl.classList.remove("warp-in-active");
      void targetEl.offsetWidth; // force reflow
      targetEl.classList.add("warp-in-active");
      setTimeout(() => targetEl.classList.remove("warp-in-active"), 600);
    }

    if (file.isImage) {
      this.editorEl.style.display = "none";
      if (this.imageViewerEl) {
        this.imageViewerEl.style.display = "flex";
        // Never interpolate name/url into markup: both can come from remote.
        const img = document.createElement("img");
        img.src = file.url || "";
        img.alt = file.name;
        this.imageViewerEl.replaceChildren(img);
      }
    } else {
      if (this.imageViewerEl) this.imageViewerEl.style.display = "none";
      this.editorEl.style.display = "block";
      this.editor.setModel(file.model);
      this.editor.focus();
    }

    this.applyDepth(file.depth);
    this._renderTabs();
    this._renderEchoes();
  }

  /**
   * Remove a file/tab by id and save the updated list.
   * @param {number} id
   */
  removeFile(id) {
    const index = this.files.findIndex((f) => f.id === id);
    if (index === -1) return;

    const file = this.files[index];
    this.workspaceSession?.unwatchFile?.(id);
    this.echoLayer?.forget(id);
    if (file.model && file.model.dispose) file.model.dispose();

    this.files.splice(index, 1);

    if (this.activeId === id) {
      if (this.files.length > 0) {
        const newActiveIndex = Math.min(index, this.files.length - 1);
        this.setActive(this.files[newActiveIndex].id);
      } else {
        this.activeId = null;
        this.editorEl.style.display = "none";
        if (this.imageViewerEl) this.imageViewerEl.style.display = "none";
      }
    }

    this._renderTabs();
    this._renderEchoes();
    this._saveTabsToStorage();
  }

  /**
   * Cycle the active tab linearly to the next/previous open file.
   * @param {number} direction
   */
  cycleActiveTab(direction) {
    if (this.files.length <= 1) return;
    const currentIndex = this.files.findIndex((f) => f.id === this.activeId);
    if (currentIndex === -1) return;
    let nextIndex = (currentIndex + direction) % this.files.length;
    if (nextIndex < 0) nextIndex += this.files.length;
    this.setActive(this.files[nextIndex].id);
  }

  // ── Depth ────────────────────────────────────────────────────────────────

  /**
   * Apply a depth level to the editor element (z-index only). Does not mutate
   * file state. Crossing the middle layer triggers a "splash".
   * @param {0|1|2} depthLevel
   * @param {number | null} [oldDepthLevel]
   */
  applyDepth(depthLevel, oldDepthLevel = null) {
    const zIndex = DEPTH_Z_INDEX[depthLevel] ?? DEPTH_Z_INDEX[1];
    this.editorEl.style.zIndex = zIndex;
    if (this.imageViewerEl) this.imageViewerEl.style.zIndex = zIndex;

    if (oldDepthLevel === null || oldDepthLevel === depthLevel) return;
    // Entering or leaving depth 1 means we broke the water surface
    if (oldDepthLevel !== 1 && depthLevel !== 1) return;
    const file = this.files.find((f) => f.id === this.activeId);
    const targetEl = file && file.isImage ? this.imageViewerEl : this.editorEl;
    if (!targetEl) return;

    const rect = targetEl.getBoundingClientRect();
    targetEl.classList.remove("rain-splash-active");
    void targetEl.offsetWidth;
    targetEl.classList.add("rain-splash-active");
    setTimeout(() => targetEl.classList.remove("rain-splash-active"), 500);
    document.dispatchEvent(
      new CustomEvent("document-splash", {
        detail: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          fileId: this.activeId,
        },
      }),
    );
  }

  /**
   * Increment/decrement the active document's depth, clamped to [0, 2].
   * @param {number} delta
   */
  adjustDepth(delta) {
    this._changeDepth(this.activeId, delta, { wrap: false });
  }

  /**
   * Cycle a document's depth with wrap-around.
   * @param {number} delta
   * @param {number} [id]
   */
  cycleDepth(delta, id = this.activeId) {
    this._changeDepth(id, delta, { wrap: true });
  }

  /**
   * @param {number} id
   * @param {number} delta
   * @param {{ wrap?: boolean }} [options]
   */
  _changeDepth(id, delta, options = {}) {
    const { wrap = false } = options;
    const file = this.files.find((f) => f.id === id);
    if (!file) return;

    const oldDepth = file.depth;
    let nextDepth = oldDepth + delta;
    nextDepth = wrap
      ? ((nextDepth % 3) + 3) % 3 // -1 → 2
      : Math.max(0, Math.min(2, nextDepth));
    file.depth = nextDepth;

    if (file.id === this.activeId) this.applyDepth(file.depth, oldDepth);
    this._renderTabs();
    this._renderEchoes();

    if (oldDepth !== file.depth && this.echoLayerEl) {
      const targetEl = file.isImage ? this.imageViewerEl : this.editorEl;
      if (targetEl) {
        targetEl.classList.remove("echo-snap-active", "shatter-active");
        void targetEl.offsetWidth;
        targetEl.classList.add("echo-snap-active", "shatter-active");
        setTimeout(() => {
          targetEl.classList.remove("echo-snap-active", "shatter-active");
        }, 600);
      }
    }
    this._saveTabsToStorage();
  }

  // ── View modes ───────────────────────────────────────────────────────────

  /**
   * Activate a view mode by select value ("" or unknown = default view).
   * @param {string} value
   */
  setViewMode(value) {
    const mode = getViewMode(value);
    const body = document.body;
    body.classList.remove(...VIEW_MODE_BODY_CLASSES);
    for (const m of VIEW_MODES) {
      document.getElementById(buttonIdFor(m))?.classList.remove("active");
    }
    this.viewMode = mode ? mode.value : "";
    if (mode) {
      body.classList.add(bodyClassFor(mode));
      document.getElementById(buttonIdFor(mode))?.classList.add("active");
    }
    this._renderEchoes();
  }

  /**
   * Toggle a view mode: activates it, or returns to the default view when it
   * is already active.
   * @param {string} value
   */
  toggleViewMode(value) {
    this.setViewMode(this.viewMode === value ? "" : value);
  }

  /** Deactivate every 3D view mode. */
  _deactivateAllViews() {
    this.setViewMode("");
  }

  // ── Echoes ───────────────────────────────────────────────────────────────

  /** Re-bind the background echoes (virtualized; see EchoLayer). */
  _renderEchoes() {
    if (!this.echoLayer) return;
    this.echoLayer.sync({
      files: this.files.filter((f) => f.id !== this.activeId),
      activeFile: this.files.find((f) => f.id === this.activeId) ?? null,
      viewMode: this.viewMode,
    });
  }

  /** Recompute echo positions only (archway scroll, resize). */
  relayoutEchoes() {
    this.echoLayer?.relayout();
  }

  // ── Tabs UI ──────────────────────────────────────────────────────────────

  /** Re-render the tab list inside tabsEl. */
  _renderTabs() {
    if (!this.tabsEl) return;
    const list = this.tabsEl.querySelector(".tabs-list");
    if (!list) return;
    list.replaceChildren();
    this.files.forEach((file) => list.appendChild(this._buildTab(file)));
    this._initTabDrop();
  }

  /** @param {any} file */
  _buildTab(file) {
    const tab = document.createElement("div");
    tab.className =
      "tab-item" +
      (file.id === this.activeId ? " active" : "") +
      (file.dirty ? " dirty" : "");
    tab.title = `${file.name}${file.dirty ? " (unsaved)" : ""} — ${DEPTH_TITLES[file.depth]}
Drag to change depth`;
    tab.draggable = true;

    const badge = document.createElement("span");
    badge.className = `tab-depth-badge depth-${file.depth}`;
    badge.title = DEPTH_TITLES[file.depth];
    badge.textContent = DEPTH_ICONS[file.depth];

    const nameEl = document.createElement("span");
    nameEl.className = "tab-name";
    nameEl.textContent = file.dirty ? `${file.name} *` : file.name;

    const layerControls = document.createElement("span");
    layerControls.className = "tab-layer-controls";
    const depthButton = (cls, title, text, delta) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `tab-depth-btn ${cls}`;
      btn.title = title;
      btn.textContent = text;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.cycleDepth(delta, file.id);
      });
      return btn;
    };
    layerControls.append(
      depthButton("tab-depth-btn-back", "Move this document deeper", "↓", -1),
      depthButton("tab-depth-btn-forward", "Move this document forward", "↑", 1),
    );

    const closeBtn = document.createElement("button");
    closeBtn.className = "tab-close-btn";
    closeBtn.type = "button";
    closeBtn.textContent = "×";
    closeBtn.title = "Close tab";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // don't activate the tab being closed
      this.removeFile(file.id);
    });

    tab.append(badge, nameEl, layerControls, closeBtn);
    tab.addEventListener("click", () => this.setActive(file.id));
    tab.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", file.id.toString());
      tab.classList.add("dragging");
    });
    tab.addEventListener("dragend", () => tab.classList.remove("dragging"));

    // X-Ray Peek: hovering an inactive tab pulls its echo forward
    if (file.id !== this.activeId) {
      tab.addEventListener("mouseenter", () => {
        if (!this.echoLayer || !this.editorEl) return;
        const echoEl = this.echoLayer.cardElement(file.id);
        if (echoEl) {
          echoEl.classList.add("peek");
          if (this.viewMode !== "cascade") {
            echoEl.style.setProperty("--tx", "0px");
            echoEl.style.setProperty("--ty", "0px");
            echoEl.style.setProperty("--tz", "100px");
          }
          const rect = echoEl.getBoundingClientRect();
          document.dispatchEvent(
            new CustomEvent("echo-peek", {
              detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
            }),
          );
        }
        this.editorEl.classList.add("editor-peek-fade");
      });
      tab.addEventListener("mouseleave", () => {
        if (!this.echoLayer || !this.editorEl) return;
        const echoEl = this.echoLayer.cardElement(file.id);
        if (echoEl) {
          echoEl.classList.remove("peek");
          if (this.viewMode !== "cascade") this.echoLayer.restorePlacement(file.id);
        }
        this.editorEl.classList.remove("editor-peek-fade");
      });
    }
    return tab;
  }

  /** Drop a dragged tab anywhere: top third → front, bottom third → deep. */
  _initTabDrop() {
    if (this._dndInitialized) return;
    this._dndInitialized = true;
    document.body.addEventListener("dragover", (e) => e.preventDefault());
    document.body.addEventListener("drop", (e) => {
      e.preventDefault();
      const idStr = e.dataTransfer.getData("text/plain");
      if (!idStr) return;
      const file = this.files.find((f) => f.id === parseInt(idStr, 10));
      if (!file) return;

      const y = e.clientY;
      const h = window.innerHeight;
      const newDepth = y < h * 0.33 ? 2 : y > h * 0.66 ? 0 : 1;
      if (file.depth === newDepth) return;
      const oldDepth = file.depth;
      file.depth = newDepth;
      if (file.id === this.activeId) this.applyDepth(newDepth, oldDepth);
      this._renderTabs();
    });
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  /** Persist the open tabs (workspace session, or legacy localStorage). */
  _saveTabsToStorage() {
    if (this.workspaceSession) {
      this.workspaceSession.schedulePersist();
      return;
    }
    try {
      const tabData = this.files.map((file) => ({
        fileId: file.id,
        name: file.name,
        language: file.language,
        vpsPath: file.vpsPath || null,
        isImage: file.isImage,
        url: file.url || null,
        noteName: file.noteName || null,
        depth: file.depth ?? 1,
      }));
      localStorage.setItem("rain_edit_open_tabs", JSON.stringify(tabData));
    } catch (err) {
      console.error("Failed to save tabs to localStorage:", err);
    }
  }

  /**
   * Serialize open documents for workspace session persistence.
   * @returns {object[]}
   */
  serializeFiles() {
    return this.files.map((file) => ({
      id: file.id,
      name: file.name,
      language: file.language,
      depth: file.depth ?? 1,
      dirty: Boolean(file.dirty),
      isImage: Boolean(file.isImage),
      url: file.url || null,
      vpsPath: file.vpsPath || null,
      noteName: file.noteName || null,
      cabinetType: file.cabinetType || null,
      cabinetId: file.cabinetId || null,
      localPath: file.localPath || null,
      opfsPath: file.opfsPath || null,
      content:
        file.isImage || !file.model ? null : file.model.getValue?.() ?? null,
    }));
  }

  /**
   * Restore tabs (workspace session, or legacy localStorage list).
   * @returns {Promise<boolean>}
   */
  async loadTabsFromStorage() {
    if (this.workspaceSession) {
      return this.workspaceSession.restore({
        preferRemote: this.workspaceSession.remoteSync,
      });
    }
    try {
      const stored = localStorage.getItem("rain_edit_open_tabs");
      if (!stored) return false;
      const tabData = JSON.parse(stored);
      if (!Array.isArray(tabData) || tabData.length === 0) return false;

      for (const tab of tabData) {
        try {
          let content = "";
          let language = tab.language || "plaintext";
          if (tab.isImage) {
            content = tab.url;
          } else if (tab.vpsPath) {
            content = await storageAPI.getVPSFile(tab.vpsPath);
          } else if (tab.noteName) {
            const note = await storageAPI.loadNote(tab.noteName);
            content = note ? note.content : "";
            language = "markdown";
          }
          const fileId = this.addFile(tab.name, content, language);
          const file = this.files.find((f) => f.id === fileId);
          if (file) {
            if (tab.vpsPath) file.vpsPath = tab.vpsPath;
            if (tab.noteName) file.noteName = tab.noteName;
            if (tab.depth != null) file.depth = tab.depth;
          }
        } catch (err) {
          console.error(`Failed to restore tab ${tab.name}:`, err);
        }
      }

      if (this.files.length > 0) this.setActive(this.files[0].id);
      return this.files.length > 0;
    } catch (err) {
      console.error("Failed to load tabs from localStorage:", err);
      return false;
    }
  }

  // ── Notes ────────────────────────────────────────────────────────────────

  /**
   * Load a named note from the backend and open it as a new tab (blank tab if
   * the note doesn't exist or the request fails).
   * @param {string} noteName
   * @returns {Promise<number>} the new file's id
   */
  async openNoteAsTab(noteName) {
    document.body.style.cursor = "wait";
    let content = "";
    try {
      const note = await storageAPI.loadNote(noteName);
      content = note ? note.content : "";
    } catch (err) {
      console.error("[TabManager] openNoteAsTab error:", err);
    } finally {
      document.body.style.cursor = "default";
    }
    const id = this.addFile(noteName, content, "markdown");
    const file = this.files.find((f) => f.id === id);
    if (file) file.noteName = noteName;
    this.setActive(id);
    return id;
  }

  /** Save the current tab to the backend as a named note (prompts for a name). */
  async saveCurrentTabAsNote() {
    const activeFile = this.files.find((f) => f.id === this.activeId);
    if (!activeFile || activeFile.isImage) return;

    let noteName = activeFile.noteName;
    if (!noteName) {
      noteName = window.prompt("Note name:", activeFile.name || "");
      if (!noteName) return;
      activeFile.noteName = noteName;
    }

    const content = activeFile.model ? activeFile.model.getValue() : "";
    document.body.style.cursor = "wait";
    try {
      const result = await storageAPI.saveNote(noteName, content);
      if (result && result.success) {
        this._showToast(`✅ Note "${noteName}" saved!`);
      } else {
        this._showToast(`❌ Failed to save note "${noteName}"`, true);
      }
    } catch (err) {
      console.error("[TabManager] saveCurrentTabAsNote error:", err);
      this._showToast(`❌ Error saving note: ${err.message}`, true);
    } finally {
      document.body.style.cursor = "default";
    }
  }

  /**
   * Show a brief status toast notification.
   * @param {string} message
   * @param {boolean} [isError=false]
   */
  _showToast(message, isError = false) {
    let toast = document.getElementById("note-save-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "note-save-toast";
      toast.style.cssText =
        'position:fixed;bottom:20px;right:20px;padding:10px 16px;background:rgba(0,0,0,0.85);border-radius:4px;font-family:"JetBrains Mono",monospace;font-size:13px;z-index:9999;transition:opacity 0.3s;pointer-events:none;';
      document.body.appendChild(toast);
    }
    const color = isError ? "#ff4444" : "#00e5ff";
    toast.style.color = color;
    toast.style.border = `1px solid ${color}`;
    toast.textContent = message;
    toast.style.opacity = "1";
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.opacity = "0";
    }, TOAST_DISPLAY_DURATION);
  }
}

// Stable public view-mode API, generated from the registry instead of 81
// hand-copied toggles: `toggleHelixView()` and the read-only `isHelixView`.
for (const mode of VIEW_MODES) {
  Object.defineProperty(TabManager.prototype, toggleMethodFor(mode), {
    value: function toggleView() {
      this.toggleViewMode(mode.value);
    },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(TabManager.prototype, flagFor(mode), {
    get() {
      return this.viewMode === mode.value;
    },
    configurable: true,
  });
}
