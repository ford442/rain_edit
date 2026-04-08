/**
 * VPSFileBrowser — a slide-in panel for browsing, opening, and saving
 * documents on the Contabo VPS via the StorageAPI VPS endpoints.
 *
 * Usage:
 *   const browser = new VPSFileBrowser(storageAPI, tabManager);
 *   browser.open();           // open for file browsing / loading
 *   browser.openSaveMode();   // open in "save here" mode
 */

// Map common MIME types / file extensions to display icons
function fileIcon(name, type) {
  if (type === 'directory') return '📁';
  const ext = name.split('.').pop().toLowerCase();
  const icons = {
    js: '📜', ts: '📜', json: '📋', md: '📝', txt: '📄',
    html: '🌐', css: '🎨', py: '🐍', sh: '⚙️',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️',
    mp3: '🎵', wav: '🎵', flac: '🎵', ogg: '🎵',
    mp4: '🎬', webm: '🎬',
    glsl: '✨', wgsl: '✨', frag: '✨', vert: '✨',
    zip: '🗜️', gz: '🗜️',
  };
  return icons[ext] || '📄';
}

// Guess a Monaco language from a file name
function guessLanguage(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    json: 'json', html: 'html', css: 'css', scss: 'css',
    md: 'markdown', markdown: 'markdown',
    py: 'python', sh: 'shell', bash: 'shell',
    glsl: 'glsl', wgsl: 'wgsl', frag: 'glsl', vert: 'glsl',
    xml: 'xml', yaml: 'yaml', yml: 'yaml',
    c: 'c', cpp: 'cpp', h: 'cpp',
    rs: 'rust', go: 'go', java: 'java',
    sql: 'sql', txt: 'plaintext',
  };
  return map[ext] || 'plaintext';
}

// Inline CSS for the panel (injected once)
const PANEL_STYLE = `
#vps-browser-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.92);
  width: min(640px, 92vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(160deg, rgba(12,18,30,0.97), rgba(8,12,22,0.97));
  border: 1px solid rgba(0,229,255,0.2);
  border-radius: 16px;
  box-shadow: 0 40px 120px rgba(0,0,0,0.95), 0 0 40px rgba(0,229,255,0.15),
              inset 0 1px 0 rgba(255,255,255,0.08);
  z-index: 5000;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
  color: #c0d0e0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  overflow: hidden;
}
#vps-browser-panel.vps-panel-visible {
  opacity: 1;
  pointer-events: all;
  transform: translate(-50%, -50%) scale(1);
}
#vps-browser-panel .vps-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px 10px;
  border-bottom: 1px solid rgba(0,229,255,0.1);
  flex-shrink: 0;
}
#vps-browser-panel .vps-header .vps-title {
  font-size: 13px;
  font-weight: 600;
  color: #00e5ff;
  flex: 1;
}
#vps-browser-panel .vps-header .vps-mode-badge {
  font-size: 10px;
  background: rgba(0,229,255,0.12);
  border: 1px solid rgba(0,229,255,0.25);
  border-radius: 6px;
  padding: 2px 8px;
  color: #7ad4e8;
}
#vps-browser-panel .vps-header button.vps-close {
  background: none;
  border: none;
  color: #667788;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s;
}
#vps-browser-panel .vps-header button.vps-close:hover { color: #ff4466; }

#vps-browser-panel .vps-breadcrumb {
  padding: 8px 18px;
  font-size: 11px;
  color: #667788;
  border-bottom: 1px solid rgba(0,229,255,0.05);
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
#vps-browser-panel .vps-breadcrumb .crumb {
  cursor: pointer;
  color: #00e5ff88;
  transition: color 0.15s;
}
#vps-browser-panel .vps-breadcrumb .crumb:hover { color: #00e5ff; }
#vps-browser-panel .vps-breadcrumb .crumb.crumb-current {
  color: #c0d0e0;
  cursor: default;
}
#vps-browser-panel .vps-breadcrumb .crumb-sep { color: #334455; }

#vps-browser-panel .vps-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-bottom: 1px solid rgba(0,229,255,0.05);
  flex-shrink: 0;
}
#vps-browser-panel .vps-toolbar input.vps-save-name {
  flex: 1;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(0,229,255,0.15);
  border-radius: 6px;
  color: #c0d0e0;
  padding: 5px 10px;
  font-family: inherit;
  font-size: 12px;
  outline: none;
}
#vps-browser-panel .vps-toolbar input.vps-save-name:focus {
  border-color: rgba(0,229,255,0.4);
}
#vps-browser-panel .vps-toolbar button {
  background: rgba(0,229,255,0.08);
  border: 1px solid rgba(0,229,255,0.2);
  color: #00e5ff;
  border-radius: 8px;
  padding: 5px 14px;
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
#vps-browser-panel .vps-toolbar button:hover {
  background: rgba(0,229,255,0.2);
}
#vps-browser-panel .vps-toolbar button.vps-btn-primary {
  background: rgba(0,229,255,0.18);
  border-color: rgba(0,229,255,0.45);
  font-weight: 600;
}
#vps-browser-panel .vps-toolbar button.vps-btn-primary:hover {
  background: rgba(0,229,255,0.32);
}

#vps-browser-panel .vps-file-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(0,229,255,0.2) transparent;
}
#vps-browser-panel .vps-file-list::-webkit-scrollbar { width: 5px; }
#vps-browser-panel .vps-file-list::-webkit-scrollbar-track { background: transparent; }
#vps-browser-panel .vps-file-list::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.2); border-radius: 3px; }

#vps-browser-panel .vps-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 18px;
  cursor: pointer;
  transition: background 0.1s;
  border-radius: 0;
  user-select: none;
}
#vps-browser-panel .vps-item:hover { background: rgba(0,229,255,0.07); }
#vps-browser-panel .vps-item.vps-item-dir { color: #7ad4e8; }
#vps-browser-panel .vps-item.vps-item-file { color: #c0d0e0; }
#vps-browser-panel .vps-item .vps-icon { font-size: 14px; flex-shrink: 0; }
#vps-browser-panel .vps-item .vps-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#vps-browser-panel .vps-item .vps-size { color: #445566; font-size: 10px; }
#vps-browser-panel .vps-item .vps-date { color: #445566; font-size: 10px; }

#vps-browser-panel .vps-empty {
  padding: 32px 18px;
  text-align: center;
  color: #445566;
}
#vps-browser-panel .vps-loading {
  padding: 32px 18px;
  text-align: center;
  color: #00e5ff55;
}
#vps-browser-panel .vps-status-bar {
  padding: 6px 18px;
  font-size: 10px;
  color: #445566;
  border-top: 1px solid rgba(0,229,255,0.05);
  flex-shrink: 0;
}
#vps-browser-panel .vps-status-bar.vps-status-ok { color: #00e5aa; }
#vps-browser-panel .vps-status-bar.vps-status-err { color: #ff4466; }

#vps-panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 4999;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(2px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
#vps-panel-backdrop.vps-panel-visible {
  opacity: 1;
  pointer-events: all;
}
`;

export class VPSFileBrowser {
  /**
   * @param {import('./StorageAPI.js').StorageAPI} storageAPI
   * @param {import('./TabManager.js').TabManager} tabManager
   */
  constructor(storageAPI, tabManager) {
    this.storageAPI = storageAPI;
    this.tabManager = tabManager;

    this._currentPath = '';
    this._mode = 'open'; // 'open' | 'save'
    this._visible = false;

    this._injectStyles();
    this._buildDOM();
  }

  // ─── DOM ─────────────────────────────────────────────────────────────────

  _injectStyles() {
    if (document.getElementById('vps-browser-style')) return;
    const style = document.createElement('style');
    style.id = 'vps-browser-style';
    style.textContent = PANEL_STYLE;
    document.head.appendChild(style);
  }

  _buildDOM() {
    // Backdrop
    this._backdrop = document.createElement('div');
    this._backdrop.id = 'vps-panel-backdrop';
    this._backdrop.addEventListener('click', () => this.close());
    document.body.appendChild(this._backdrop);

    // Panel
    this._panel = document.createElement('div');
    this._panel.id = 'vps-browser-panel';
    this._panel.setAttribute('role', 'dialog');
    this._panel.setAttribute('aria-modal', 'true');
    this._panel.setAttribute('aria-label', 'VPS File Browser');

    // Header
    const header = document.createElement('div');
    header.className = 'vps-header';

    const title = document.createElement('span');
    title.className = 'vps-title';
    title.textContent = '📡 VPS Files — storage.noahcohn.com';
    header.appendChild(title);

    this._modeBadge = document.createElement('span');
    this._modeBadge.className = 'vps-mode-badge';
    this._modeBadge.textContent = 'OPEN';
    header.appendChild(this._modeBadge);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'vps-close';
    closeBtn.textContent = '✕';
    closeBtn.title = 'Close (Esc)';
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);
    this._panel.appendChild(header);

    // Breadcrumb
    this._breadcrumb = document.createElement('div');
    this._breadcrumb.className = 'vps-breadcrumb';
    this._panel.appendChild(this._breadcrumb);

    // Toolbar (shown in save mode or always for mkdir)
    this._toolbar = document.createElement('div');
    this._toolbar.className = 'vps-toolbar';

    this._saveNameInput = document.createElement('input');
    this._saveNameInput.className = 'vps-save-name';
    this._saveNameInput.placeholder = 'filename.txt';
    this._saveNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._confirmSave();
    });
    this._toolbar.appendChild(this._saveNameInput);

    const saveHereBtn = document.createElement('button');
    saveHereBtn.className = 'vps-btn-primary';
    saveHereBtn.textContent = '💾 Save Here';
    saveHereBtn.addEventListener('click', () => this._confirmSave());
    this._toolbar.appendChild(saveHereBtn);

    const mkdirBtn = document.createElement('button');
    mkdirBtn.textContent = '📂 New Folder';
    mkdirBtn.addEventListener('click', () => this._promptMkdir());
    this._toolbar.appendChild(mkdirBtn);

    this._panel.appendChild(this._toolbar);

    // File list
    this._fileList = document.createElement('div');
    this._fileList.className = 'vps-file-list';
    this._panel.appendChild(this._fileList);

    // Status bar
    this._statusBar = document.createElement('div');
    this._statusBar.className = 'vps-status-bar';
    this._panel.appendChild(this._statusBar);

    document.body.appendChild(this._panel);

    // Keyboard listener
    this._onKeyDown = (e) => {
      if (!this._visible) return;
      if (e.key === 'Escape') { e.stopPropagation(); this.close(); }
    };
    document.addEventListener('keydown', this._onKeyDown, true);
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /** Open the browser in file-open mode. */
  open(path = '') {
    this._mode = 'open';
    this._modeBadge.textContent = 'OPEN';
    this._toolbar.style.display = 'none';
    this._show(path);
  }

  /**
   * Open the browser in save mode with pre-filled filename.
   * @param {string} [suggestedName] - Default filename to suggest.
   * @param {string} [suggestedPath] - Pre-navigate to this directory.
   */
  openSaveMode(suggestedName = '', suggestedPath = '') {
    this._mode = 'save';
    this._modeBadge.textContent = 'SAVE AS';
    this._toolbar.style.display = 'flex';
    this._saveNameInput.value = suggestedName;
    this._show(suggestedPath);
    // Focus input after animation
    setTimeout(() => this._saveNameInput.focus(), 250);
  }

  close() {
    this._visible = false;
    this._panel.classList.remove('vps-panel-visible');
    this._backdrop.classList.remove('vps-panel-visible');
  }

  toggle() {
    if (this._visible) this.close();
    else this.open(this._currentPath);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  _show(path = '') {
    this._visible = true;
    this._panel.classList.add('vps-panel-visible');
    this._backdrop.classList.add('vps-panel-visible');
    this._navigate(path);
  }

  async _navigate(path) {
    this._currentPath = path;
    this._renderBreadcrumb(path);
    this._setLoading(true);
    this._setStatus('');

    try {
      const items = await this.storageAPI.browseVPS(path);
      this._renderItems(items || []);
    } catch (err) {
      console.error('[VPSFileBrowser] browse error:', err);
      this._renderItems([]);
      this._setStatus('Could not load directory listing — check CORS / backend.', 'err');
    } finally {
      this._setLoading(false);
    }
  }

  _renderBreadcrumb(path) {
    this._breadcrumb.innerHTML = '';

    const addCrumb = (label, navPath, isCurrent = false) => {
      const span = document.createElement('span');
      span.className = 'crumb' + (isCurrent ? ' crumb-current' : '');
      span.textContent = label;
      if (!isCurrent) span.addEventListener('click', () => this._navigate(navPath));
      this._breadcrumb.appendChild(span);
    };

    // Root crumb
    addCrumb('🏠 root', '', !path);

    if (path) {
      const parts = path.split('/').filter(Boolean);
      parts.forEach((part, i) => {
        const sep = document.createElement('span');
        sep.className = 'crumb-sep';
        sep.textContent = ' / ';
        this._breadcrumb.appendChild(sep);

        const navPath = parts.slice(0, i + 1).join('/');
        addCrumb(part, navPath, i === parts.length - 1);
      });
    }
  }

  _renderItems(items) {
    this._fileList.innerHTML = '';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'vps-empty';
      empty.textContent = 'Empty directory';
      this._fileList.appendChild(empty);
      return;
    }

    // Sort: directories first, then files alphabetically
    const sorted = [...items].sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

    // Back navigation entry if not at root
    if (this._currentPath) {
      const up = document.createElement('div');
      up.className = 'vps-item vps-item-dir';
      up.innerHTML = `<span class="vps-icon">⬆️</span><span class="vps-name">..</span>`;
      up.title = 'Go up one level';
      up.addEventListener('click', () => {
        const parent = this._currentPath.includes('/')
          ? this._currentPath.split('/').slice(0, -1).join('/')
          : '';
        this._navigate(parent);
      });
      this._fileList.appendChild(up);
    }

    sorted.forEach(item => {
      const row = document.createElement('div');
      const isDir = item.type === 'directory';
      row.className = 'vps-item ' + (isDir ? 'vps-item-dir' : 'vps-item-file');

      const icon = document.createElement('span');
      icon.className = 'vps-icon';
      icon.textContent = fileIcon(item.name, item.type);

      const name = document.createElement('span');
      name.className = 'vps-name';
      name.textContent = item.name;
      name.title = item.path || item.name;

      row.appendChild(icon);
      row.appendChild(name);

      if (!isDir && item.size != null) {
        const size = document.createElement('span');
        size.className = 'vps-size';
        size.textContent = _formatSize(item.size);
        row.appendChild(size);
      }

      if (isDir) {
        row.addEventListener('click', () => {
          const next = this._currentPath
            ? `${this._currentPath}/${item.name}`
            : item.name;
          this._navigate(next);

          // In save mode, update filename input with directory context
          if (this._mode === 'save') {
            this._saveNameInput.focus();
          }
        });
      } else {
        row.addEventListener('click', () => this._handleFileClick(item));
      }

      this._fileList.appendChild(row);
    });
  }

  async _handleFileClick(item) {
    if (this._mode === 'save') {
      // Clicking an existing file in save mode pre-fills its name
      this._saveNameInput.value = item.name;
      this._saveNameInput.focus();
      return;
    }

    // Open mode: load the file into editor
    const filePath = item.path || (this._currentPath
      ? `${this._currentPath}/${item.name}`
      : item.name);

    this._setStatus(`Loading ${item.name}…`);
    document.body.style.cursor = 'wait';

    try {
      const content = await this.storageAPI.getVPSFile(filePath);
      if (content == null) throw new Error('Empty response');

      const language = guessLanguage(item.name);
      const fileId = this.tabManager.addFile(item.name, content, language);
      this.tabManager.setActive(fileId);

      // Tag the tab with its VPS path so "Save" can round-trip
      const tab = this.tabManager.files.find(f => f.id === fileId);
      if (tab) tab.vpsPath = filePath;

      this._setStatus(`Opened: ${item.name}`, 'ok');
      setTimeout(() => this.close(), 600);
    } catch (err) {
      console.error('[VPSFileBrowser] open file error:', err);
      this._setStatus(`Failed to open ${item.name}`, 'err');
    } finally {
      document.body.style.cursor = 'default';
    }
  }

  async _confirmSave() {
    const filename = this._saveNameInput.value.trim();
    if (!filename) {
      this._saveNameInput.focus();
      this._setStatus('Please enter a filename.', 'err');
      return;
    }

    const filePath = this._currentPath
      ? `${this._currentPath}/${filename}`
      : filename;

    // Get content from the active tab
    const activeFile = this.tabManager.files.find(
      f => f.id === this.tabManager.activeId
    );
    if (!activeFile) {
      this._setStatus('No active file to save.', 'err');
      return;
    }

    const content = activeFile.model
      ? activeFile.model.getValue()
      : (activeFile.content || '');

    this._setStatus(`Saving to ${filePath}…`);
    document.body.style.cursor = 'wait';

    try {
      const result = await this.storageAPI.saveVPSFile(filePath, content);
      if (!result) throw new Error('No response');

      // Update the tab's vpsPath and name
      activeFile.vpsPath = filePath;
      activeFile.name = filename;
      this.tabManager._renderTabs?.();

      this._setStatus(`Saved: ${filePath}`, 'ok');
      setTimeout(() => this.close(), 800);
    } catch (err) {
      console.error('[VPSFileBrowser] save error:', err);
      this._setStatus(`Save failed — check backend/CORS.`, 'err');
    } finally {
      document.body.style.cursor = 'default';
    }
  }

  async _promptMkdir() {
    const name = window.prompt('New folder name:');
    if (!name || !name.trim()) return;
    const dirPath = this._currentPath
      ? `${this._currentPath}/${name.trim()}`
      : name.trim();

    this._setStatus(`Creating folder ${dirPath}…`);
    const result = await this.storageAPI.mkdirVPS(dirPath);
    if (result) {
      this._navigate(this._currentPath);
    } else {
      this._setStatus('Failed to create folder.', 'err');
    }
  }

  _setLoading(on) {
    if (on) {
      this._fileList.innerHTML = '<div class="vps-loading">⏳ Loading…</div>';
    }
  }

  _setStatus(msg, type = '') {
    this._statusBar.textContent = msg;
    this._statusBar.className = 'vps-status-bar' + (type ? ` vps-status-${type}` : '');
  }
}

function _formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default VPSFileBrowser;
