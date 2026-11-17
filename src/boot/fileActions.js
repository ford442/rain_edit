const LANGUAGE_BY_EXT = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  html: "html",
  css: "css",
  md: "markdown",
  py: "python",
  glsl: "glsl",
  wgsl: "wgsl",
  frag: "glsl",
  vert: "glsl",
};

/**
 * @param {HTMLElement | null} btn
 * @param {string} label
 */
function flashButton(btn, label) {
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = label;
  setTimeout(() => {
    btn.textContent = orig;
  }, 1500);
}

/**
 * File open/save actions: local / VPS save, note save, and opening files
 * picked in the 3D cabinet (`fileCubeClicked`).
 *
 * @param {{
 *   tabManager: import("../TabManager.js").TabManager,
 *   storageAPI: import("../StorageAPI.js").StorageAPI,
 *   vpsBrowser: any,
 *   cabinet3D: import("../Cabinet3D.js").Cabinet3D,
 *   localProject: any,
 *   workspaceSession: any,
 *   vpsSaveBtn: HTMLElement | null,
 * }} deps
 */
export function createFileActions({
  tabManager,
  storageAPI,
  vpsBrowser,
  cabinet3D,
  localProject,
  workspaceSession,
  vpsSaveBtn,
}) {
  const activeFile = () => tabManager.files.find((f) => f.id === tabManager.activeId);

  /** Save the active tab: local handle first, then its VPS path, else save-as. */
  async function saveActive() {
    const file = activeFile();
    if (!file) return;

    if (localProject && (file.fileHandle || file.opfsPath || file.localPath)) {
      try {
        if (await localProject.saveActiveLocal()) {
          flashButton(vpsSaveBtn, "✅ Local");
          tabManager._showToast?.(`Saved ${file.name} locally`);
          return;
        }
      } catch (err) {
        console.warn("[localProject] save failed, trying VPS path", err);
      }
    }

    if (!file.vpsPath) {
      vpsBrowser.openSaveMode(file.name || "untitled.txt");
      return;
    }

    const content = file.model ? file.model.getValue() : file.content || "";
    document.body.style.cursor = "wait";
    try {
      const result = await storageAPI.saveVPSFile(file.vpsPath, content);
      if (result) {
        workspaceSession?.markClean(file.id);
        // Next cabinet hover should fetch a fresh preview.
        window.dispatchEvent(
          new CustomEvent("cabinet-cache-invalidate", { detail: { path: file.vpsPath } }),
        );
        flashButton(vpsSaveBtn, "✅ Saved!");
      } else {
        vpsBrowser.open();
        vpsBrowser.openSaveMode(
          file.name || "untitled.txt",
          file.vpsPath.split("/").slice(0, -1).join("/"),
        );
      }
    } catch (err) {
      console.error("[VPSFileBrowser] save error, opening save dialog:", err);
      vpsBrowser.openSaveMode(file.name || "untitled.txt");
    } finally {
      document.body.style.cursor = "default";
    }
  }

  /** Ctrl/Cmd+S: sonic boom, and save the tab back to its note if it is one. */
  function saveNote() {
    document.body.classList.add("sonic-boom-active");
    setTimeout(() => document.body.classList.remove("sonic-boom-active"), 400);

    const file = activeFile();
    if (!file || file.isImage) return;
    if (!(file.cabinetType === "notes" || file.noteName)) return;

    const noteName = file.noteName || file.cabinetId || file.name;
    const content = file.model ? file.model.getValue() : "";
    storageAPI
      .saveNote(noteName, content)
      .then((result) => {
        if (result && result.success) {
          workspaceSession?.markClean(file.id);
          tabManager._showToast(`✅ Note "${noteName}" saved!`);
        } else {
          tabManager._showToast(`❌ Failed to save note "${noteName}"`, true);
        }
      })
      .catch((err) => {
        console.error("Save note error:", err);
        tabManager._showToast(`❌ Error saving note: ${err.message}`, true);
      });
  }

  /**
   * Open a file picked in the cabinet, push other tabs back to depth 1 and
   * pull the new one to depth 2 (unobscured by rain).
   * @param {CustomEvent} e
   */
  async function openCabinetFile(e) {
    const { id, type, name, fileData: eventFileData } = e.detail;
    const isRemote = Boolean(eventFileData && eventFileData.isRemote && eventFileData.vpsPath);
    console.log(`Fetching ${type}: ${name}...`);
    document.body.style.cursor = "wait";
    try {
      let fileData;
      if (isRemote) {
        const content = await storageAPI.getVPSFile(eventFileData.vpsPath);
        const ext = name.split(".").pop().toLowerCase();
        fileData = { content, language: LANGUAGE_BY_EXT[ext] || "plaintext" };
      } else {
        fileData = await storageAPI.getFileContent(id, type);
      }

      const newFileId = tabManager.addFile(name, fileData.content, fileData.language);
      const newFile = tabManager.files.find((f) => f.id === newFileId);
      if (newFile) {
        if (isRemote) {
          newFile.vpsPath = eventFileData.vpsPath;
        } else {
          newFile.cabinetType = type;
          newFile.cabinetId = id;
          if (type === "notes") newFile.noteName = id;
        }
      }

      tabManager.files.forEach((file) => {
        if (file.id !== newFileId) file.depth = 1;
      });
      if (newFile) newFile.depth = 2;
      tabManager.setActive(newFileId);
      tabManager.applyDepth(2);

      storageAPI.recordPlay(id, type);
      cabinet3D.hide();
    } catch (error) {
      console.error("Failed to load file:", error);
      alert(`Failed to load ${name}. Check console for details.`);
    } finally {
      document.body.style.cursor = "default";
    }
  }

  return { saveActive, saveNote, openCabinetFile };
}
