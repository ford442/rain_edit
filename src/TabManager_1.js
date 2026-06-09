import StorageAPI from "./StorageAPI.js";
import { storageAPI, TOAST_DISPLAY_DURATION, DEPTH_Z_INDEX, DEPTH_ICONS, DEPTH_TITLES, _extractSymbols, _symbolKindIcon } from './TabManager.js';
export const TabManagerMixin1 = {
  setActive(id) {
    const file = this.files.find((f) => f.id === id);
    if (!file) return;
    this.activeId = id;

    const titleBar = document.getElementById("editor-title-bar");
    if (titleBar) {
      titleBar.textContent = file.name;
    }

    // Trigger Warp-In animation replacing depth-swap
    const targetEl = file.isImage ? this.imageViewerEl : this.editorEl;
    if (targetEl) {
      targetEl.classList.remove("warp-in-active");
      // Force reflow
      void targetEl.offsetWidth;
      targetEl.classList.add("warp-in-active");

      // Clean up animation class
      setTimeout(() => {
        targetEl.classList.remove("warp-in-active");
      }, 600);
    }

    if (file.isImage) {
      this.editorEl.style.display = "none";
      if (this.imageViewerEl) {
        this.imageViewerEl.style.display = "flex";
        this.imageViewerEl.innerHTML = `<img src="${file.url}" alt="${file.name}" />`;
      }
    } else {
      if (this.imageViewerEl) {
        this.imageViewerEl.style.display = "none";
      }
      this.editorEl.style.display = "block";
      this.editor.setModel(file.model);
      this.editor.focus();
    }

    this.applyDepth(file.depth);
    this._renderTabs();
    this._renderEchoes();
  },
  applyDepth(depthLevel, oldDepthLevel = null) {
    const zIndex = DEPTH_Z_INDEX[depthLevel] ?? DEPTH_Z_INDEX[1];
    this.editorEl.style.zIndex = zIndex;
    if (this.imageViewerEl) {
      this.imageViewerEl.style.zIndex = zIndex;
    }

    if (oldDepthLevel !== null && oldDepthLevel !== depthLevel) {
      // If we crossed the middle layer (depth 1), trigger a splash
      // Entering or leaving depth 1 means we broke the water surface
      if (oldDepthLevel === 1 || depthLevel === 1) {
        const file = this.files.find((f) => f.id === this.activeId);
        const targetEl =
          file && file.isImage ? this.imageViewerEl : this.editorEl;

        if (targetEl) {
          const rect = targetEl.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;

          // Add splash animation class
          targetEl.classList.remove("rain-splash-active");
          void targetEl.offsetWidth; // Force reflow
          targetEl.classList.add("rain-splash-active");

          setTimeout(() => {
            targetEl.classList.remove("rain-splash-active");
          }, 500);

          const evt = new CustomEvent("document-splash", {
            detail: { x, y, fileId: this.activeId },
          });
          document.dispatchEvent(evt);
        }
      }
    }
  },
  adjustDepth(delta) {
    this._changeDepth(this.activeId, delta, { wrap: false });
  },
  cycleActiveTab(direction) {
    if (this.files.length <= 1) return;
    const currentIndex = this.files.findIndex((f) => f.id === this.activeId);
    if (currentIndex === -1) return;

    // Calculate next index wrapping around bounds
    let nextIndex = (currentIndex + direction) % this.files.length;
    if (nextIndex < 0) nextIndex += this.files.length;

    this.setActive(this.files[nextIndex].id);
  },
  cycleDepth(delta, id = this.activeId) {
    this._changeDepth(id, delta, { wrap: true });
  },
  _changeDepth(id, delta, options = {}) {
    const { wrap = false } = options;
    const file = this.files.find((f) => f.id === id);
    if (!file) return;

    const oldDepth = file.depth;
    let nextDepth = oldDepth + delta;
    if (wrap) {
      // Normalize modulo so negative deltas wrap correctly (e.g. -1 -> 2).
      nextDepth = ((nextDepth % 3) + 3) % 3;
    } else {
      nextDepth = Math.max(0, Math.min(2, nextDepth));
    }
    file.depth = nextDepth;

    if (file.id === this.activeId) {
      this.applyDepth(file.depth, oldDepth);
    }
    this._renderTabs();
    this._renderEchoes();

    // Add snap animation and shatter effect if depth changed
    if (oldDepth !== file.depth && this.echoLayerEl) {
      // Trigger snap animation on the background documents
      const targetEl = file.isImage ? this.imageViewerEl : this.editorEl;
      if (targetEl) {
        targetEl.classList.remove("echo-snap-active");
        targetEl.classList.remove("shatter-active");
        void targetEl.offsetWidth; // Force reflow
        targetEl.classList.add("echo-snap-active");
        targetEl.classList.add("shatter-active");
        setTimeout(() => {
          targetEl.classList.remove("echo-snap-active");
          targetEl.classList.remove("shatter-active");
        }, 600);
      }
    }
  },
  _renderTabs() {
    if (!this.tabsEl) return;
    const list = this.tabsEl.querySelector(".tabs-list");
    if (!list) return;
    list.innerHTML = "";
    this.files.forEach((file) => {
      const tab = document.createElement("div");
      tab.className = "tab-item" + (file.id === this.activeId ? " active" : "");
      tab.title = `${file.name} — ${DEPTH_TITLES[file.depth]}
Drag to change depth`;
      tab.draggable = true;

      const badge = document.createElement("span");
      badge.className = `tab-depth-badge depth-${file.depth}`;
      badge.title = DEPTH_TITLES[file.depth];
      badge.textContent = DEPTH_ICONS[file.depth];

      const nameEl = document.createElement("span");
      nameEl.className = "tab-name";
      nameEl.textContent = file.name;

      const layerControls = document.createElement("span");
      layerControls.className = "tab-layer-controls";

      const depthBackBtn = document.createElement("button");
      depthBackBtn.type = "button";
      depthBackBtn.className = "tab-depth-btn tab-depth-btn-back";
      depthBackBtn.title = "Move this document deeper";
      depthBackBtn.textContent = "↓";
      depthBackBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.cycleDepth(-1, file.id);
      });

      const depthForwardBtn = document.createElement("button");
      depthForwardBtn.type = "button";
      depthForwardBtn.className = "tab-depth-btn tab-depth-btn-forward";
      depthForwardBtn.title = "Move this document forward";
      depthForwardBtn.textContent = "↑";
      depthForwardBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.cycleDepth(1, file.id);
      });

      layerControls.appendChild(depthBackBtn);
      layerControls.appendChild(depthForwardBtn);

      const closeBtn = document.createElement("button");
      closeBtn.className = "tab-close-btn";
      closeBtn.type = "button";
      closeBtn.textContent = "×";
      closeBtn.title = "Close tab";
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent tab activation on close click
        this.removeFile(file.id);
      });

      tab.appendChild(badge);
      tab.appendChild(nameEl);
      tab.appendChild(layerControls);
      tab.appendChild(closeBtn);

      tab.addEventListener("click", () => this.setActive(file.id));

      // Drag and Drop Logic
      tab.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", file.id.toString());
        tab.classList.add("dragging");
      });

      tab.addEventListener("dragend", () => {
        tab.classList.remove("dragging");
      });

      // X-Ray Peek Logic
      if (file.id !== this.activeId) {
        tab.addEventListener("mouseenter", (e) => {
          if (this.echoLayerEl && this.editorEl) {
            const echoEl = this.echoLayerEl.querySelector(
              `.echo-document[data-id="${file.id}"]`,
            );
            if (echoEl) {
              echoEl.classList.add("peek");
              // Support CSS vars approach for transform
              if (!this.isCascadeView) {
                echoEl.style.setProperty("--tx", "0px");
                echoEl.style.setProperty("--ty", "0px");
                echoEl.style.setProperty("--tz", "100px"); // Pull forward more significantly
              }

              // Dispatch event to clear fog where the document roughly sits
              const rect = echoEl.getBoundingClientRect();
              const evt = new CustomEvent("echo-peek", {
                detail: {
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2,
                },
              });
              document.dispatchEvent(evt);
            }
            this.editorEl.classList.add("editor-peek-fade");
          }
        });

        tab.addEventListener("mouseleave", () => {
          if (this.echoLayerEl && this.editorEl) {
            const echoEl = this.echoLayerEl.querySelector(
              `.echo-document[data-id="${file.id}"]`,
            );
            if (echoEl) {
              echoEl.classList.remove("peek");
              // Restore CSS vars
              if (!this.isCascadeView) {
                const index = parseInt(echoEl.dataset.index || 0);
                echoEl.style.setProperty(
                  "--tz",
                  `calc(-${index * 50}px + var(--stack-z, 0px))`,
                );
              }
            }
            this.editorEl.classList.remove("editor-peek-fade");
          }
        });
      }

      list.appendChild(tab);
    });

    // Add dragover and drop handling to the body to catch drops anywhere
    if (!this._dndInitialized) {
      document.body.addEventListener("dragover", (e) => {
        e.preventDefault(); // Necessary to allow dropping
      });

      document.body.addEventListener("drop", (e) => {
        e.preventDefault();
        const idStr = e.dataTransfer.getData("text/plain");
        if (!idStr) return;

        const id = parseInt(idStr, 10);
        const file = this.files.find((f) => f.id === id);
        if (!file) return;

        // Calculate new depth based on Y position
        const y = e.clientY;
        const h = window.innerHeight;

        let newDepth = 1;
        if (y < h * 0.33) {
          newDepth = 2; // Top third -> Front layer
        } else if (y > h * 0.66) {
          newDepth = 0; // Bottom third -> Deep layer
        } else {
          newDepth = 1; // Middle third -> Middle layer
        }

        if (file.depth !== newDepth) {
          const oldDepth = file.depth;
          file.depth = newDepth;
          // Apply immediately if it's the active tab
          if (file.id === this.activeId) {
            this.applyDepth(newDepth, oldDepth);
          }
          this._renderTabs();
        }
      });
      this._dndInitialized = true;
    }
  },
  _renderEchoes() {
    if (!this.echoLayerEl) return;
    this.echoLayerEl.innerHTML = "";

    const inactiveFiles = this.files.filter((f) => f.id !== this.activeId);

    const activeFile = this.files.find((f) => f.id === this.activeId);
    const activeExt = activeFile ? activeFile.name.split(".").pop() : "";
    const activeLang = activeFile ? activeFile.language : "";

    let totalEchoes = inactiveFiles.length;
    inactiveFiles.forEach((file, index) => {
      this._buildEchoElement(file, index, totalEchoes, inactiveFiles, activeFile, activeExt, activeLang);
    });
  },
  _saveTabsToStorage() {
    try {
      const tabData = this.files.map((file) => ({
        fileId: file.id,
        name: file.name,
        language: file.language,
        vpsPath: file.vpsPath || null,
        isImage: file.isImage,
        url: file.url || null,
        noteName: file.noteName || null, // ← Added for notes compatibility
      }));
      localStorage.setItem("rain_edit_open_tabs", JSON.stringify(tabData));
    } catch (err) {
      console.error("Failed to save tabs to localStorage:", err);
    }
  },
  async loadTabsFromStorage() {
    try {
      const stored = localStorage.getItem("rain_edit_open_tabs");
      if (!stored) return;
      const tabData = JSON.parse(stored);
      if (!Array.isArray(tabData) || tabData.length === 0) return;

      const { StorageAPI } = await import("./StorageAPI.js");
      const storageAPI = new StorageAPI();

      for (const tab of tabData) {
        try {
          let content = "";
          let language = tab.language || "plaintext";

          if (tab.isImage) {
            content = tab.url;
          } else if (tab.vpsPath) {
            content = await storageAPI.getVPSFile(tab.vpsPath);
          } else if (tab.noteName) {
            // New: restore note content from backend
            const note = await storageAPI.loadNote(tab.noteName);
            content = note ? note.content : "";
            language = "markdown";
          }
          // else: unsaved file → empty content

          const fileId = this.addFile(tab.name, content, language);
          const file = this.files.find((f) => f.id === fileId);

          if (file) {
            if (tab.vpsPath) file.vpsPath = tab.vpsPath;
            if (tab.noteName) file.noteName = tab.noteName;
          }
        } catch (err) {
          console.error(`Failed to restore tab ${tab.name}:`, err);
        }
      }

      if (this.files.length > 0) {
        this.setActive(this.files[0].id);
      }
    } catch (err) {
      console.error("Failed to load tabs from localStorage:", err);
    }
  },
  removeFile(id) {
    const index = this.files.findIndex((f) => f.id === id);
    if (index === -1) return;

    const file = this.files[index];
    if (file.model && file.model.dispose) {
      file.model.dispose();
    }

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
  },
  async openNoteAsTab(noteName) {
    document.body.style.cursor = "wait";
    try {
      const note = await storageAPI.loadNote(noteName);
      const content = note ? note.content : "";
      const id = this.addFile(noteName, content, "markdown");
      const file = this.files.find((f) => f.id === id);
      if (file) file.noteName = noteName;
      this.setActive(id);
      return id;
    } catch (err) {
      console.error("[TabManager] openNoteAsTab error:", err);
      const id = this.addFile(noteName, "", "markdown");
      const file = this.files.find((f) => f.id === id);
      if (file) file.noteName = noteName;
      this.setActive(id);
      return id;
    } finally {
      document.body.style.cursor = "default";
    }
  },
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
  },
  _showToast(message, isError = false) {
    let toast = document.getElementById("note-save-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "note-save-toast";
      toast.style.cssText =
        'position:fixed;bottom:20px;right:20px;padding:10px 16px;background:rgba(0,0,0,0.85);border-radius:4px;font-family:"JetBrains Mono",monospace;font-size:13px;z-index:9999;transition:opacity 0.3s;pointer-events:none;';
      document.body.appendChild(toast);
    }
    if (isError) {
      toast.style.color = "#ff4444";
      toast.style.border = "1px solid #ff4444";
    } else {
      toast.style.color = "#00e5ff";
      toast.style.border = "1px solid #00e5ff";
    }
    toast.textContent = message;
    toast.style.opacity = "1";
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.opacity = "0";
    }, TOAST_DISPLAY_DURATION);
  },
};
