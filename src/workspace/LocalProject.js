/**
 * Local project mode: File System Access API, drag-drop folders, OPFS sandbox.
 */

const TEXT_EXT = new Set([
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "json",
  "md",
  "txt",
  "css",
  "html",
  "htm",
  "glsl",
  "frag",
  "vert",
  "wgsl",
  "py",
  "rs",
  "toml",
  "yml",
  "yaml",
  "svg",
  "sh",
  "env",
]);

const LANG_BY_EXT = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  jsx: "javascript",
  json: "json",
  md: "markdown",
  css: "css",
  html: "html",
  htm: "html",
  py: "python",
  rs: "rust",
  glsl: "plaintext",
  frag: "plaintext",
  vert: "plaintext",
  wgsl: "plaintext",
};

function extOf(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function languageFor(name) {
  return LANG_BY_EXT[extOf(name)] || "plaintext";
}

function isProbablyText(name) {
  const ext = extOf(name);
  if (!ext) return true;
  return TEXT_EXT.has(ext);
}

export function fileSystemAccessSupported() {
  return typeof globalThis.showDirectoryPicker === "function";
}

export function opfsSupported() {
  return Boolean(navigator?.storage?.getDirectory);
}

/**
 * @param {FileSystemDirectoryHandle} dir
 * @param {string} [prefix]
 * @returns {Promise<{ path: string, handle: FileSystemFileHandle }[]>}
 */
async function walkDirectory(dir, prefix = "") {
  const out = [];
  for await (const [name, handle] of dir.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "file") {
      if (isProbablyText(name)) out.push({ path, handle });
    } else if (handle.kind === "directory") {
      if (name === "node_modules" || name === ".git" || name === "dist") continue;
      out.push(...(await walkDirectory(handle, path)));
    }
  }
  return out;
}

export class LocalProject {
  /**
   * @param {object} deps
   * @param {import('../TabManager.js').TabManager} deps.tabManager
   * @param {import('./WorkspaceSession.js').WorkspaceSession | null} [deps.workspaceSession]
   */
  constructor({ tabManager, workspaceSession = null }) {
    this.tabManager = tabManager;
    this.workspaceSession = workspaceSession;
    /** @type {FileSystemDirectoryHandle | null} */
    this.dirHandle = null;
    this.mode = null; // 'fsa' | 'opfs' | null
  }

  /**
   * Prompt for a directory (Chromium) and open text files as tabs.
   * @param {{ maxFiles?: number }} [opts]
   */
  async openFolder(opts = {}) {
    const maxFiles = opts.maxFiles ?? 40;
    if (!fileSystemAccessSupported()) {
      throw new Error("File System Access API not available in this browser");
    }
    const dir = await globalThis.showDirectoryPicker({ mode: "readwrite" });
    this.dirHandle = dir;
    this.mode = "fsa";
    const entries = await walkDirectory(dir);
    let opened = 0;
    for (const { path, handle } of entries.slice(0, maxFiles)) {
      await this._openHandle(handle, path);
      opened += 1;
    }
    this.workspaceSession?.setProject({
      kind: "fsa",
      name: dir.name,
      opened,
    });
    return { name: dir.name, opened, total: entries.length };
  }

  /**
   * Use Origin Private File System as a sandboxed project root.
   */
  async openOpfsSandbox() {
    if (!opfsSupported()) {
      throw new Error("OPFS is not available");
    }
    const root = await navigator.storage.getDirectory();
    const project = await root.getDirectoryHandle("rain-edit-project", {
      create: true,
    });
    this.dirHandle = project;
    this.mode = "opfs";
    const entries = await walkDirectory(project);
    let opened = 0;
    for (const { path, handle } of entries.slice(0, 40)) {
      await this._openHandle(handle, path, { opfs: true });
      opened += 1;
    }
    this.workspaceSession?.setProject({
      kind: "opfs",
      name: "rain-edit-project",
      opened,
    });
    return { name: "rain-edit-project", opened, total: entries.length };
  }

  /**
   * @param {FileSystemFileHandle} handle
   * @param {string} path
   * @param {{ opfs?: boolean }} [opts]
   */
  async _openHandle(handle, path, opts = {}) {
    const file = await handle.getFile();
    const content = await file.text();
    const id = this.tabManager.addFile(path, content, languageFor(path));
    const tab = this.tabManager.files.find((f) => f.id === id);
    if (tab) {
      tab.localPath = path;
      tab.fileHandle = handle;
      if (opts.opfs) tab.opfsPath = path;
      tab.savedContent = content;
      tab.dirty = false;
      this.workspaceSession?.watchFile(tab);
    }
    return id;
  }

  /**
   * Save active tab back to its FileSystemFileHandle or OPFS path.
   */
  async saveActiveLocal() {
    const file = this.tabManager.files.find(
      (f) => f.id === this.tabManager.activeId,
    );
    if (!file || file.isImage) return false;
    const content = file.model?.getValue?.() ?? "";

    if (file.fileHandle && typeof file.fileHandle.createWritable === "function") {
      const writable = await file.fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      this.workspaceSession?.markClean(file.id);
      return true;
    }

    if (this.mode === "opfs" && file.opfsPath && this.dirHandle) {
      await this._writeOpfsPath(file.opfsPath, content);
      this.workspaceSession?.markClean(file.id);
      return true;
    }

    // Untitled → OPFS sandbox
    if (opfsSupported()) {
      const root = await navigator.storage.getDirectory();
      const project = await root.getDirectoryHandle("rain-edit-project", {
        create: true,
      });
      const name = file.name || `untitled-${file.id}.txt`;
      const handle = await project.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      file.fileHandle = handle;
      file.opfsPath = name;
      file.localPath = name;
      this.mode = this.mode || "opfs";
      this.dirHandle = this.dirHandle || project;
      this.workspaceSession?.markClean(file.id);
      this.workspaceSession?.setProject({
        kind: "opfs",
        name: "rain-edit-project",
      });
      return true;
    }

    return false;
  }

  async _writeOpfsPath(path, content) {
    const parts = path.split("/").filter(Boolean);
    let dir = this.dirHandle;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }
    const handle = await dir.getFileHandle(parts[parts.length - 1], {
      create: true,
    });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return handle;
  }

  /**
   * Handle a drop of files/directories onto the app.
   * @param {DataTransfer} dataTransfer
   */
  async handleDrop(dataTransfer) {
    const items = [...(dataTransfer.items || [])];
    let opened = 0;

    for (const item of items) {
      if (item.kind !== "file") continue;
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        opened += await this._openDirectoryEntry(entry);
        continue;
      }
      const file = item.getAsFile?.() || null;
      if (!file) continue;
      if (!isProbablyText(file.name)) continue;
      const content = await file.text();
      const id = this.tabManager.addFile(
        file.name,
        content,
        languageFor(file.name),
      );
      const tab = this.tabManager.files.find((f) => f.id === id);
      if (tab) {
        tab.localPath = file.name;
        tab.savedContent = content;
        tab.dirty = false;
        this.workspaceSession?.watchFile(tab);
      }
      opened += 1;
    }

    // Fallback: FileList without entries API
    if (!opened && dataTransfer.files?.length) {
      for (const file of dataTransfer.files) {
        if (!isProbablyText(file.name)) continue;
        const content = await file.text();
        const id = this.tabManager.addFile(
          file.name,
          content,
          languageFor(file.name),
        );
        const tab = this.tabManager.files.find((f) => f.id === id);
        if (tab) {
          tab.localPath = file.name;
          tab.savedContent = content;
          tab.dirty = false;
          this.workspaceSession?.watchFile(tab);
        }
        opened += 1;
      }
    }

    if (opened) {
      this.workspaceSession?.setProject({
        kind: "drop",
        opened,
      });
    }
    return opened;
  }

  /**
   * @param {FileSystemDirectoryEntry} dirEntry
   * @param {string} [prefix]
   */
  async _openDirectoryEntry(dirEntry, prefix = "") {
    const reader = dirEntry.createReader();
    const entries = await new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    let opened = 0;
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === "dist"
        ) {
          continue;
        }
        opened += await this._openDirectoryEntry(entry, path);
      } else if (entry.isFile && isProbablyText(entry.name)) {
        const file = await new Promise((resolve, reject) => {
          entry.file(resolve, reject);
        });
        const content = await file.text();
        const id = this.tabManager.addFile(path, content, languageFor(path));
        const tab = this.tabManager.files.find((f) => f.id === id);
        if (tab) {
          tab.localPath = path;
          tab.savedContent = content;
          tab.dirty = false;
          this.workspaceSession?.watchFile(tab);
        }
        opened += 1;
        if (opened >= 40) break;
      }
    }
    return opened;
  }

  /**
   * @param {Document} [doc]
   */
  bindUi(doc = document) {
    const openBtn = doc.getElementById("btn-local-folder");
    const opfsBtn = doc.getElementById("btn-local-opfs");

    openBtn?.addEventListener("click", async () => {
      try {
        const result = await this.openFolder();
        this.tabManager._showToast?.(
          `Opened ${result.opened}/${result.total} files from ${result.name}`,
        );
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error(err);
        this.tabManager._showToast?.(
          err.message || "Could not open folder",
          true,
        );
      }
    });

    opfsBtn?.addEventListener("click", async () => {
      try {
        const result = await this.openOpfsSandbox();
        this.tabManager._showToast?.(
          `OPFS sandbox: ${result.opened} file(s)`,
        );
      } catch (err) {
        console.error(err);
        this.tabManager._showToast?.(err.message || "OPFS failed", true);
      }
    });

    // Drag-drop on the app shell
    const target = doc.getElementById("container") || doc.body;
    const onDragOver = (e) => {
      if (![...e.dataTransfer.types].includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      target.classList?.add("local-drop-active");
    };
    const onDragLeave = () => target.classList?.remove("local-drop-active");
    const onDrop = async (e) => {
      if (![...e.dataTransfer.types].includes("Files")) return;
      e.preventDefault();
      target.classList?.remove("local-drop-active");
      try {
        const n = await this.handleDrop(e.dataTransfer);
        if (n) {
          this.tabManager._showToast?.(`Opened ${n} local file(s)`);
        }
      } catch (err) {
        console.error(err);
        this.tabManager._showToast?.(err.message || "Drop failed", true);
      }
    };
    target.addEventListener("dragover", onDragOver);
    target.addEventListener("dragleave", onDragLeave);
    target.addEventListener("drop", onDrop);
  }
}
