// Z-index assigned to the editor element at each depth level
const DEPTH_Z_INDEX = [0, 5, 15];

// Visual badge icons for depth 0, 1, 2
const DEPTH_ICONS = ['▼', '◆', '▲'];

// Human-readable titles for tooltips
const DEPTH_TITLES = [
  'Deep — behind all rain (z-index: 0)',
  'Middle — between rain layers (z-index: 5)',
  'Front — above all rain (z-index: 15)',
];

export class TabManager {
  /**
   * @param {import('monaco-editor').editor.IStandaloneCodeEditor} editor
   * @param {typeof import('monaco-editor')} monacoApi
   * @param {HTMLElement} editorEl  - the #editor DOM node
   * @param {HTMLElement} tabsEl    - the #tabs-container DOM node
   * @param {HTMLElement} echoLayerEl - the #echo-layer DOM node
   */
  constructor(editor, monacoApi, editorEl, tabsEl, imageViewerEl = null, echoLayerEl = null) {
    this.editor = editor;
    this.monaco = monacoApi;
    this.editorEl = editorEl;
    this.tabsEl = tabsEl;
    this.imageViewerEl = imageViewerEl || document.getElementById('image-viewer');
    this.echoLayerEl = echoLayerEl || document.getElementById('echo-layer');
    this.files = [];
    this.activeId = null;
    this._nextId = 1;
    this.isCascadeView = false;
  }

  toggleCascadeView() {
    this.isCascadeView = !this.isCascadeView;
    document.body.classList.toggle('cascade-active', this.isCascadeView);
    const btn = document.getElementById('btn-cascade-view');
    if (btn) {
        if (this.isCascadeView) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
    this._renderEchoes();
  }

  /**
   * Add a new file/document.
   * @param {string} name       - display name shown in the tab
   * @param {string} content    - initial text content
   * @param {string} language   - Monaco language identifier
   * @returns {number} the new file's id
   */
  addFile(name, content = '', language = 'javascript') {
    const id = this._nextId++;
    const isImage = language === 'image';

    let model = null;
    if (!isImage) {
      model = this.monaco.editor.createModel(content, language);
    }

    this.files.push({ id, name, model, depth: 1, isImage, url: isImage ? content : null });
    this._renderTabs();
    return id;
  }

  /**
   * Switch to a file by id.
   * Updates the Monaco model and immediately applies the saved depth.
   * @param {number} id
   */
  setActive(id) {
    const file = this.files.find(f => f.id === id);
    if (!file) return;
    this.activeId = id;

    if (file.isImage) {
      this.editorEl.style.display = 'none';
      if (this.imageViewerEl) {
        this.imageViewerEl.style.display = 'flex';
        this.imageViewerEl.innerHTML = `<img src="${file.url}" alt="${file.name}" />`;
      }
    } else {
      if (this.imageViewerEl) {
        this.imageViewerEl.style.display = 'none';
      }
      this.editorEl.style.display = 'block';
      this.editor.setModel(file.model);
      this.editor.focus();
    }

    this.applyDepth(file.depth);
    this._renderTabs();
    this._renderEchoes();
  }

  /**
   * Apply a depth level to the editor element (updates z-index only).
   * Does NOT mutate file state — call adjustDepth() or set file.depth directly
   * before calling this if you want to persist the change.
   * @param {0|1|2} depthLevel
   */
  applyDepth(depthLevel) {
    const zIndex = DEPTH_Z_INDEX[depthLevel] ?? DEPTH_Z_INDEX[1];
    this.editorEl.style.zIndex = zIndex;
    if (this.imageViewerEl) {
      this.imageViewerEl.style.zIndex = zIndex;
    }
  }

  /**
   * Increment (+1) or decrement (−1) the active document's depth,
   * clamped to [0, 2], then immediately applies the new depth.
   * @param {number} delta  — typically +1 or -1
   */
  adjustDepth(delta) {
    const file = this.files.find(f => f.id === this.activeId);
    if (!file) return;
    file.depth = Math.max(0, Math.min(2, file.depth + delta));
    this.applyDepth(file.depth);
    this._renderTabs();
  }

  /** Re-render the tab list inside tabsEl. */
  _renderTabs() {
    if (!this.tabsEl) return;
    const list = this.tabsEl.querySelector('.tabs-list');
    if (!list) return;
    list.innerHTML = '';
    this.files.forEach(file => {
      const tab = document.createElement('div');
      tab.className = 'tab-item' + (file.id === this.activeId ? ' active' : '');
      tab.title = `${file.name} — ${DEPTH_TITLES[file.depth]}
Drag to change depth`;
      tab.draggable = true;

      const badge = document.createElement('span');
      badge.className = `tab-depth-badge depth-${file.depth}`;
      badge.title = DEPTH_TITLES[file.depth];
      badge.textContent = DEPTH_ICONS[file.depth];

      const nameEl = document.createElement('span');
      nameEl.className = 'tab-name';
      nameEl.textContent = file.name;

      tab.appendChild(badge);
      tab.appendChild(nameEl);

      tab.addEventListener('click', () => this.setActive(file.id));

      // Drag and Drop Logic
      tab.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', file.id.toString());
        tab.classList.add('dragging');
      });

      tab.addEventListener('dragend', () => {
        tab.classList.remove('dragging');
      });

      // X-Ray Peek Logic
      if (file.id !== this.activeId) {
        tab.addEventListener('mouseenter', () => {
          if (this.echoLayerEl && this.editorEl) {
            const echoEl = this.echoLayerEl.querySelector(`.echo-document[data-id="${file.id}"]`);
            if (echoEl) {
              echoEl.classList.add('peek');
              // Support CSS vars approach for transform
              if (!this.isCascadeView) {
                  echoEl.style.setProperty('--tx', '0px');
                  echoEl.style.setProperty('--ty', '0px');
                  echoEl.style.setProperty('--tz', '50px');
              }
            }
            this.editorEl.classList.add('editor-peek-fade');
          }
        });

        tab.addEventListener('mouseleave', () => {
          if (this.echoLayerEl && this.editorEl) {
            const echoEl = this.echoLayerEl.querySelector(`.echo-document[data-id="${file.id}"]`);
            if (echoEl) {
              echoEl.classList.remove('peek');
              // Restore CSS vars
              if (!this.isCascadeView) {
                  const depthOffset = parseInt(echoEl.dataset.index || 0) + 1;
                  echoEl.style.setProperty('--tz', `-${depthOffset * 10}px`);
              }
            }
            this.editorEl.classList.remove('editor-peek-fade');
          }
        });
      }

      list.appendChild(tab);
    });

    // Add dragover and drop handling to the body to catch drops anywhere
    if (!this._dndInitialized) {
      document.body.addEventListener('dragover', (e) => {
        e.preventDefault(); // Necessary to allow dropping
      });

      document.body.addEventListener('drop', (e) => {
        e.preventDefault();
        const idStr = e.dataTransfer.getData('text/plain');
        if (!idStr) return;

        const id = parseInt(idStr, 10);
        const file = this.files.find(f => f.id === id);
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
          file.depth = newDepth;
          // Apply immediately if it's the active tab
          if (file.id === this.activeId) {
            this.applyDepth(newDepth);
          }
          this._renderTabs();
        }
      });
      this._dndInitialized = true;
    }
  }

  /** Render inactive files as blurred background echoes. */
  _renderEchoes() {
    if (!this.echoLayerEl) return;
    this.echoLayerEl.innerHTML = '';

    const inactiveFiles = this.files.filter(f => f.id !== this.activeId);

    inactiveFiles.forEach((file, index) => {
      const el = document.createElement('div');
      el.className = 'echo-document';
      el.dataset.id = file.id;
      el.dataset.index = index; // Store for CSS vars restore later

      // Extract text or show image placeholder
      let contentStr = '';
      if (file.isImage) {
        contentStr = `[IMAGE: ${file.name}]`;
      } else {
        contentStr = file.model.getValue().substring(0, 1000);
      }

      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = contentStr;
      pre.appendChild(code);
      el.appendChild(pre);

      // Calculate Exploded Orbit View variables
      const totalEchoes = inactiveFiles.length;
      if (totalEchoes > 0) {
          const angle = (index / totalEchoes) * Math.PI * 2;
          const radius = 300; // Orbit radius
          const explodeX = Math.cos(angle) * radius;
          const explodeY = Math.sin(angle) * radius;
          el.style.setProperty('--explode-x', `${explodeX}px`);
          el.style.setProperty('--explode-y', `${explodeY}px`);
      }

      if (this.isCascadeView) {
        // Cascade positions
        const vw = window.innerWidth;
        const tx = (vw * 0.3) + (index * 40);
        const ty = index * 20;
        const tz = -index * 50;
        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        el.style.setProperty('--tz', `${tz}px`);
      } else {
        // Original Parallax depth offsets
        const depthOffset = (index + 1) * 2;
        // tx/ty will be overwritten by mousemove, but we set initial values here
        el.style.setProperty('--tx', `${depthOffset * 2}px`);
        el.style.setProperty('--ty', `${depthOffset * 2}px`);
        // Add var(--stack-z) for the MRI scroll effect
        el.style.setProperty('--tz', `calc(-${index * 50}px + var(--stack-z, 0px))`);

        // Glitch distant echoes
        if (index > 2) {
            el.classList.add('distant-echo');
        }
      }

      // Add click listener to switch to this document
      el.addEventListener('click', () => {
          this.setActive(file.id);
      });

      // Add hover listener to fade editor
      el.addEventListener('mouseenter', () => {
          if (this.editorEl) {
              this.editorEl.classList.add('editor-peek-fade');
          }
      });

      el.addEventListener('mouseleave', () => {
          if (this.editorEl) {
              this.editorEl.classList.remove('editor-peek-fade');
          }
      });

      this.echoLayerEl.appendChild(el);
    });
  }
}
