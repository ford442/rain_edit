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
    this.isOrbitView = false;
    this.isScatteredView = false;
    this.isIsometricView = false;
    this.isStackView = false;
    this.isTunnelView = false;
    this.isGridView = false;
    this.isHelixView = false;
    this.isPinboardView = false;
    this.isVortexView = false;
    this.isConstellationView = false;
    this.isPrismView = false;
    this.isCoverflowView = false;
    this.isWaveView = false;
  }

  _deactivateAllViews() {
    this.isCascadeView = false;
    this.isOrbitView = false;
    this.isScatteredView = false;
    this.isIsometricView = false;
    this.isStackView = false;
    this.isTunnelView = false;
    this.isGridView = false;
    this.isHelixView = false;
    this.isPinboardView = false;
    this.isVortexView = false;
    this.isConstellationView = false;
    this.isPrismView = false;
    this.isCoverflowView = false;
    this.isWaveView = false;
    document.body.classList.remove('cascade-active', 'orbit-active', 'scattered-active', 'isometric-active', 'stack-active', 'tunnel-active', 'grid-active', 'helix-active', 'pinboard-active', 'vortex-active', 'constellation-active', 'prism-active', 'coverflow-active', 'wave-active');
    ['btn-cascade-view', 'btn-orbit-view', 'btn-scattered-view', 'btn-isometric-view', 'btn-stack-view', 'btn-tunnel-view', 'btn-grid-view', 'btn-helix-view', 'btn-pinboard-view', 'btn-vortex-view', 'btn-constellation-view', 'btn-prism-view', 'btn-coverflow-view', 'btn-wave-view'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('active');
    });
  }

  toggleCoverflowView() {
    const wasActive = this.isCoverflowView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isCoverflowView = true;
      document.body.classList.add('coverflow-active');
      const btn = document.getElementById('btn-coverflow-view');
      if (btn) btn.classList.add('active');
    }
    this._renderEchoes();
  }

  toggleWaveView() {
    const wasActive = this.isWaveView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isWaveView = true;
      document.body.classList.add('wave-active');
      const btn = document.getElementById('btn-wave-view');
      if (btn) btn.classList.add('active');
    }
    this._renderEchoes();
  }

  togglePrismView() {
    const wasActive = this.isPrismView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isPrismView = true;
      document.body.classList.add('prism-active');
      const btn = document.getElementById('btn-prism-view');
      if (btn) btn.classList.add('active');
    }
    this._renderEchoes();
  }

  toggleHelixView() {
    const wasActive = this.isHelixView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isHelixView = true;
      document.body.classList.add('helix-active');
      const btn = document.getElementById('btn-helix-view');
      if (btn) btn.classList.add('active');
    }
    this._renderEchoes();
  }

  toggleConstellationView() {
    const wasActive = this.isConstellationView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isConstellationView = true;
      document.body.classList.add('constellation-active');
      const btn = document.getElementById('btn-constellation-view');
      if (btn) btn.classList.add('active');
    }
    this._renderEchoes();
  }

  togglePinboardView() {
    const wasActive = this.isPinboardView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isPinboardView = true;
      document.body.classList.add('pinboard-active');
      const btn = document.getElementById('btn-pinboard-view');
      if (btn) btn.classList.add('active');
    }
    this._renderEchoes();
  }

  toggleVortexView() {
    const wasActive = this.isVortexView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isVortexView = true;
      document.body.classList.add('vortex-active');
      const btn = document.getElementById('btn-vortex-view');
      if (btn) btn.classList.add('active');
    }
    this._renderEchoes();
  }

  toggleStackView() {
    const wasActive = this.isStackView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isStackView = true;
      document.body.classList.add('stack-active');
      const btn = document.getElementById('btn-stack-view');
      if (btn) btn.classList.add('active');
    }
    this._renderEchoes();
  }

  toggleTunnelView() {
    const wasActive = this.isTunnelView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isTunnelView = true;
      document.body.classList.add('tunnel-active');
      const btn = document.getElementById('btn-tunnel-view');
      if (btn) btn.classList.add('active');
    }
    this._renderEchoes();
  }

  toggleGridView() {
    const wasActive = this.isGridView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isGridView = true;
      document.body.classList.add('grid-active');
      const btn = document.getElementById('btn-grid-view');
      if (btn) btn.classList.add('active');
    }
    this._renderEchoes();
  }

  toggleIsometricView() {
    const wasActive = this.isIsometricView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isIsometricView = true;
      document.body.classList.add('isometric-active');
      const btn = document.getElementById('btn-isometric-view');
      if (btn) btn.classList.add('active');
    }
    this._renderEchoes();
  }

  toggleScatteredView() {
    const wasActive = this.isScatteredView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isScatteredView = true;
      document.body.classList.add('scattered-active');
      const btn = document.getElementById('btn-scattered-view');
      if (btn) btn.classList.add('active');
    }
    this._renderEchoes();
  }

  toggleCascadeView() {
    const wasActive = this.isCascadeView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isCascadeView = true;
      document.body.classList.add('cascade-active');
      const btn = document.getElementById('btn-cascade-view');
      if (btn) btn.classList.add('active');
    }
    this._renderEchoes();
  }

  toggleOrbitView() {
    const wasActive = this.isOrbitView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isOrbitView = true;
      document.body.classList.add('orbit-active');
      const btn = document.getElementById('btn-orbit-view');
      if (btn) btn.classList.add('active');
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

    this.files.push({ id, name, model, depth: 1, isImage, language, url: isImage ? content : null });
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

    // Trigger Warp-In animation replacing depth-swap
    const targetEl = file.isImage ? this.imageViewerEl : this.editorEl;
    if (targetEl) {
        targetEl.classList.remove('warp-in-active');
        // Force reflow
        void targetEl.offsetWidth;
        targetEl.classList.add('warp-in-active');

        // Clean up animation class
        setTimeout(() => {
            targetEl.classList.remove('warp-in-active');
        }, 600);
    }

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
   * @param {number} oldDepthLevel
   */
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
        const file = this.files.find(f => f.id === this.activeId);
        const targetEl = (file && file.isImage) ? this.imageViewerEl : this.editorEl;

        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;

            // Add splash animation class
            targetEl.classList.remove('rain-splash-active');
            void targetEl.offsetWidth; // Force reflow
            targetEl.classList.add('rain-splash-active');

            setTimeout(() => {
                targetEl.classList.remove('rain-splash-active');
            }, 500);

            const evt = new CustomEvent('document-splash', {
                detail: { x, y, fileId: this.activeId }
            });
            document.dispatchEvent(evt);
        }
      }
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
    const oldDepth = file.depth;
    file.depth = Math.max(0, Math.min(2, file.depth + delta));
    this.applyDepth(file.depth, oldDepth);
    this._renderTabs();

    // Add snap animation if depth changed
    if (oldDepth !== file.depth && this.echoLayerEl) {
        // Trigger snap animation on the background documents
        const targetEl = file.isImage ? this.imageViewerEl : this.editorEl;
        if (targetEl) {
            targetEl.classList.remove('echo-snap-active');
            void targetEl.offsetWidth; // Force reflow
            targetEl.classList.add('echo-snap-active');
            setTimeout(() => {
                targetEl.classList.remove('echo-snap-active');
            }, 500);
        }
    }
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
        tab.addEventListener('mouseenter', (e) => {
          if (this.echoLayerEl && this.editorEl) {
            const echoEl = this.echoLayerEl.querySelector(`.echo-document[data-id="${file.id}"]`);
            if (echoEl) {
              echoEl.classList.add('peek');
              // Support CSS vars approach for transform
              if (!this.isCascadeView) {
                  echoEl.style.setProperty('--tx', '0px');
                  echoEl.style.setProperty('--ty', '0px');
                  echoEl.style.setProperty('--tz', '100px'); // Pull forward more significantly
              }

              // Dispatch event to clear fog where the document roughly sits
              const rect = echoEl.getBoundingClientRect();
              const evt = new CustomEvent('echo-peek', {
                detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
              });
              document.dispatchEvent(evt);
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
                  const index = parseInt(echoEl.dataset.index || 0);
                  echoEl.style.setProperty('--tz', `calc(-${index * 50}px + var(--stack-z, 0px))`);
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
  }

  /** Render inactive files as blurred background echoes. */
  _renderEchoes() {
    if (!this.echoLayerEl) return;
    this.echoLayerEl.innerHTML = '';

    const inactiveFiles = this.files.filter(f => f.id !== this.activeId);

    const activeFile = this.files.find(f => f.id === this.activeId);
    const activeExt = activeFile ? activeFile.name.split('.').pop() : '';
    const activeLang = activeFile ? activeFile.language : '';

    inactiveFiles.forEach((file, index) => {
      const el = document.createElement('div');
      el.className = 'echo-document';
      el.dataset.id = file.id;
      el.dataset.index = index; // Store for CSS vars restore later

      let tint = '0deg'; // default cyan
      if (file.name.endsWith('.js')) tint = '60deg'; // yellow
      else if (file.name.endsWith('.css')) tint = '200deg'; // blue
      else if (file.name.endsWith('.html') || file.name.endsWith('.md')) tint = '320deg'; // pink/orange
      el.style.setProperty('--echo-tint', tint);

      // Semantic Gravity: Pull files with similar extensions or languages closer
      const fileExt = file.name.split('.').pop();
      if ((fileExt === activeExt || file.language === activeLang) && !this.isCascadeView && !this.isOrbitView && !this.isScatteredView && !this.isIsometricView && !this.isStackView && !this.isTunnelView && !this.isGridView && !this.isHelixView && !this.isPinboardView && !this.isVortexView && !this.isConstellationView && !this.isPrismView && !this.isCoverflowView && !this.isWaveView) {
          el.classList.add('semantic-gravity-pull');
      }

      // Set parallax factor for vertical scrolling (deeper = moves slower)
      const parallaxFactor = Math.max(0.05, 0.3 - (index * 0.08));
      el.style.setProperty('--parallax-factor', parallaxFactor);

      if (index === 0) {
          el.classList.add('echo-recent');
      }

      // Add a header so users know what this file is
      const echoHeader = document.createElement('div');
      echoHeader.className = 'echo-header';

      const headerTitle = document.createElement('div');
      headerTitle.className = 'echo-header-title';
      headerTitle.innerHTML = `<span class="echo-file-icon">◈</span> <span class="echo-file-name">${file.name}</span> <span class="echo-file-lang">${file.language || 'text'}</span>`;

      const headerStatus = document.createElement('div');
      headerStatus.className = 'echo-header-status';
      const randomHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase();
      headerStatus.innerHTML = `<span class="echo-status-dot"></span>0x${randomHex}`;

      const peekBtn = document.createElement('button');
      peekBtn.className = 'echo-peek-btn';
      peekBtn.title = 'Peek Document';
      peekBtn.textContent = '👁️';

      echoHeader.appendChild(headerTitle);
      echoHeader.appendChild(headerStatus);
      echoHeader.appendChild(peekBtn);

      peekBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // prevent click from making it active
          const isPeeking = el.classList.contains('is-peeking');
          if (isPeeking) {
              el.classList.remove('is-peeking');
              if (this.editorEl) this.editorEl.classList.remove('editor-peek-fade');
          } else {
              // Optionally un-peek others if only one peek at a time is desired:
              // this.echoLayerEl.querySelectorAll('.is-peeking').forEach(doc => doc.classList.remove('is-peeking'));
              el.classList.add('is-peeking');
              if (this.editorEl) this.editorEl.classList.add('editor-peek-fade');

              const rect = el.getBoundingClientRect();
              const evt = new CustomEvent('echo-peek', {
                detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
              });
              document.dispatchEvent(evt);
          }
      });

      el.appendChild(echoHeader);

      const bodyWrapper = document.createElement('div');
      bodyWrapper.className = 'echo-body-wrapper';

      const lineNumbers = document.createElement('div');
      lineNumbers.className = 'echo-line-numbers';
      let linesHtml = '';
      const lineCount = file.isImage ? 1 : Math.min(40, file.model?.getLineCount ? file.model.getLineCount() : 40);
      for(let i=1; i<=lineCount; i++) {
         linesHtml += `<span>${i}</span>`;
      }
      lineNumbers.innerHTML = linesHtml;
      bodyWrapper.appendChild(lineNumbers);

      // Extract text or show image placeholder
      let contentStr = '';
      if (file.isImage) {
        contentStr = `[IMAGE: ${file.name}]`;
      } else {
        contentStr = file.model.getValue().substring(0, 1000);
      }

      const pre = document.createElement('pre');
      const code = document.createElement('code');
      if (file.isImage) {
          code.textContent = contentStr;
      } else {
          // Asynchronous syntax highlighting for background code blocks
          code.textContent = 'Loading...'; // Placeholder
          this.monaco.editor.colorize(contentStr, file.language || 'javascript', {}).then((html) => {
              // Only update if the element is still in the DOM (the tab manager might have re-rendered)
              if (el.isConnected) {
                  code.innerHTML = html;
              }
          }).catch((err) => {
              console.warn('Failed to colorize background document:', err);
              code.textContent = contentStr; // Fallback to plain text
          });
      }

      // Allow drag & drop for Holographic Siphon
      pre.draggable = true;
      pre.addEventListener('dragstart', (e) => {
          if (!document.body.classList.contains('siphon-mode-active')) {
              e.preventDefault();
              return;
          }

          const selection = window.getSelection();
          let text = selection.toString();

          if (!text) {
              // If no text is selected, fallback to the whole content or a snippet
              text = code.textContent.substring(0, 500);
          }

          e.dataTransfer.setData('text/plain', text);
          e.dataTransfer.effectAllowed = 'copy';

          // Optional: Add a custom drag image
          const dragImg = document.createElement('div');
          dragImg.style.position = 'absolute';
          dragImg.style.top = '-1000px';
          dragImg.style.color = '#00e5ff';
          dragImg.style.background = 'rgba(0, 0, 0, 0.8)';
          dragImg.style.padding = '8px';
          dragImg.style.border = '1px solid #00e5ff';
          dragImg.textContent = text.length > 20 ? text.substring(0, 20) + '...' : text;
          document.body.appendChild(dragImg);

          e.dataTransfer.setDragImage(dragImg, 0, 0);

          setTimeout(() => {
              if (dragImg.parentNode) dragImg.parentNode.removeChild(dragImg);
          }, 100);
      });

      pre.appendChild(code);
      bodyWrapper.appendChild(pre);

      const minimap = document.createElement('div');
      minimap.className = 'echo-minimap';
      minimap.style.transform = 'translateZ(30px)';
      minimap.style.boxShadow = '-10px 10px 20px rgba(0,0,0,0.5)';
      let minimapHtml = '';
      for(let i=0; i<35; i++) {
         const width = 20 + Math.random() * 80;
         const opacity = 0.1 + Math.random() * 0.5;
         minimapHtml += `<div class="minimap-block" style="width: ${width}%; opacity: ${opacity};"></div>`;
      }
      minimap.innerHTML = minimapHtml;
      bodyWrapper.appendChild(minimap);

      el.appendChild(bodyWrapper);

      // Add a CSS-animated scanning line effect to the document
      const scanLineDiv = document.createElement('div');
      scanLineDiv.className = 'scan-line';
      scanLineDiv.style.setProperty('--index', index);
      el.appendChild(scanLineDiv);

      // Dynamic Opacity and Blur based on depth index via CSS variables
      // (This avoids inline style specificity issues that break hover states)
      const baseOpacity = Math.max(0.15, 0.7 - (index * 0.2));
      const baseBlur = Math.min(15, 3 + (index * 3));
      el.style.setProperty('--base-opacity', baseOpacity);
      el.style.setProperty('--base-blur', `${baseBlur}px`);

      // Add visual feedback elements for obscured distant documents
      if (index >= 2) {
          el.classList.add('depth-aware-glitch');
      }

      // Add a CSS-animated scanning line effect to the document
      const scanLine = document.createElement('div');
      scanLine.className = 'scan-line';
      scanLine.style.setProperty('--index', index);
      el.appendChild(scanLine);

      const hexOverlay = document.createElement('div');
      hexOverlay.className = 'hex-overlay';
      el.appendChild(hexOverlay);

      const lightLeak = document.createElement('div');
      lightLeak.className = 'light-leak';
      el.appendChild(lightLeak);

      // Ghost Scroll feature: allow scrolling without bringing document to front
      pre.addEventListener('wheel', (e) => {
        e.stopPropagation(); // prevent main editor from scrolling
        // Dispatch echo-peek to clear fog locally
        const evt = new CustomEvent('echo-peek', {
          detail: { x: e.clientX, y: e.clientY }
        });
        document.dispatchEvent(evt);
      });

      // Calculate Exploded Orbit View variables
      const totalEchoes = inactiveFiles.length;
      if (totalEchoes > 0) {
          const angle = (index / totalEchoes) * Math.PI * 2;
          const radius = 300; // Orbit radius
          const explodeX = Math.cos(angle) * radius;
          const explodeY = Math.sin(angle) * radius;
          el.style.setProperty('--explode-x', `${explodeX}px`);
          el.style.setProperty('--explode-y', `${explodeY}px`);

          // Expose Mode (Grid view) coordinates
          const cols = Math.ceil(Math.sqrt(totalEchoes));
          const rows = Math.ceil(totalEchoes / cols);

          const col = index % cols;
          const row = Math.floor(index / cols);

          const exposeW = window.innerWidth * 0.7; // Spread width
          const exposeH = window.innerHeight * 0.7; // Spread height

          const spacingX = cols > 1 ? exposeW / (cols - 1) : 0;
          const spacingY = rows > 1 ? exposeH / (rows - 1) : 0;

          const offsetX = -exposeW / 2;
          const offsetY = -exposeH / 2;

          const exposeX = offsetX + (col * spacingX);
          const exposeY = offsetY + (row * spacingY);

          el.style.setProperty('--expose-tx', `${exposeX}px`);
          el.style.setProperty('--expose-ty', `${exposeY}px`);
      }

      if (this.isTunnelView) {
        // Tunnel View: arrange into a 3D cylindrical tunnel leading backward
        const angle = (index / totalEchoes) * Math.PI * 2 * 3; // Spiral
        const radius = 400;
        const tx = Math.cos(angle) * radius;
        const ty = Math.sin(angle) * radius;
        const tz = -index * 150;
        const rotZ = (angle * 180) / Math.PI;

        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        el.style.setProperty('--tz', `${tz}px`);
        el.style.setProperty('--rot-z', `${rotZ}deg`);
        el.style.setProperty('--rot-x', '0deg');
        el.style.setProperty('--rot-y', '0deg');
      } else if (this.isGridView) {
        // Grid View: neat 3D matrix-style wall
        const cols = Math.ceil(Math.sqrt(totalEchoes));
        const spacingX = 600;
        const spacingY = 400;

        const col = index % cols;
        const row = Math.floor(index / cols);

        const offsetX = -((cols - 1) * spacingX) / 2;
        const offsetY = -((Math.ceil(totalEchoes / cols) - 1) * spacingY) / 2;

        const tx = offsetX + col * spacingX;
        const ty = offsetY + row * spacingY;
        const tz = -300; // Push back slightly

        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        el.style.setProperty('--tz', `${tz}px`);
        el.style.setProperty('--rot-x', '0deg');
        el.style.setProperty('--rot-y', '0deg');
        el.style.setProperty('--rot-z', '0deg');
      } else if (this.isOrbitView) {
        // Orbit View (3D Carousel Cylindrical) positions
        const angle = (index / totalEchoes) * 360; // Degrees
        const orbitRadius = Math.max(500, totalEchoes * 120); // Dynamic radius based on file count

        el.style.setProperty('--orbit-rot-y', `${angle}deg`);
        el.style.setProperty('--orbit-tz', `${orbitRadius}px`);

        // Remove standard tx, ty offsets to center the carousel properly
        el.style.setProperty('--tx', `0px`);
        el.style.setProperty('--ty', `0px`);
        el.style.setProperty('--tz', `0px`);
      } else if (this.isCascadeView) {
        // Cascade positions
        const vw = window.innerWidth;
        const tx = (vw * 0.3) + (index * 40);
        const ty = index * 20;
        const tz = -index * 50;
        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        el.style.setProperty('--tz', `${tz}px`);
      } else if (this.isStackView) {
        // Time Machine Stack View
        el.style.setProperty('--tx', `0px`);
        el.style.setProperty('--ty', `0px`);
        el.style.setProperty('--tz', `${-index * 300 + (parseFloat(document.getElementById('echo-layer').style.getPropertyValue('--stack-z')) || 0)}px`);
        el.style.setProperty('--rot-x', '0deg');
        el.style.setProperty('--rot-y', '0deg');
      } else if (this.isIsometricView) {
        // Simple stacked positioning for isometric view
        el.style.setProperty('--tx', `0px`);
        el.style.setProperty('--ty', `${index * 20}px`);
        el.style.setProperty('--tz', `${index * 50}px`);
        el.style.setProperty('--rot-x', '0deg');
        el.style.setProperty('--rot-y', '0deg');
      } else if (this.isHelixView) {
        // Helix View positions
        const totalEchoes = inactiveFiles.length;
        const indexRatio = index / Math.max(1, totalEchoes - 1);
        const yRange = window.innerHeight * 0.8;
        const radius = 300;
        const cycles = 2; // Number of full rotations

        const angle = indexRatio * Math.PI * 2 * cycles;

        const tx = Math.cos(angle) * radius;
        const ty = (indexRatio * yRange) - (yRange / 2);
        const tz = Math.sin(angle) * radius - 200; // Push back a bit

        const rotY = -(angle * 180 / Math.PI) + 90; // Face inwards/outwards appropriately

        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        el.style.setProperty('--tz', `${tz}px`);
        el.style.setProperty('--rot-y', `${rotY}deg`);
        el.style.setProperty('--rot-x', '0deg');
        el.style.setProperty('--rot-z', '0deg');
      } else if (this.isConstellationView) {
        // Constellation View: Map to a 3D spherical point cloud
        const totalEchoes = inactiveFiles.length;
        const phi = Math.acos(1 - 2 * (index + 0.5) / totalEchoes);
        const theta = Math.PI * (1 + Math.sqrt(5)) * index;

        const radius = 400 + (Math.sin(index * 123) * 100); // 400-500 radius with some jitter
        const tx = radius * Math.sin(phi) * Math.cos(theta);
        const ty = radius * Math.sin(phi) * Math.sin(theta);
        const tz = radius * Math.cos(phi) - 200; // Offset back

        // Random tilt for constellation nodes
        const rotX = (Math.sin(index * 22) * 20);
        const rotY = (Math.cos(index * 33) * 20);
        const rotZ = (Math.sin(index * 44) * 20);

        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        el.style.setProperty('--tz', `${tz}px`);
        el.style.setProperty('--rot-x', `${rotX}deg`);
        el.style.setProperty('--rot-y', `${rotY}deg`);
        el.style.setProperty('--rot-z', `${rotZ}deg`);
      } else if (this.isVortexView) {
        // Vortex View positions
        const totalEchoes = inactiveFiles.length;
        const indexRatio = index / Math.max(1, totalEchoes - 1);
        const radius = 200 + (index * 40); // Expanding radius
        const angle = indexRatio * Math.PI * 2 * 4; // 4 swirls

        const tx = Math.cos(angle) * radius;
        const ty = Math.sin(angle) * radius;
        const tz = -index * 120 - 100;

        const rotZ = (angle * 180 / Math.PI) + 90;

        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        el.style.setProperty('--tz', `${tz}px`);
        el.style.setProperty('--rot-z', `${rotZ}deg`);
        el.style.setProperty('--rot-x', '0deg');
        el.style.setProperty('--rot-y', '0deg');
      } else if (this.isPinboardView) {
        // Pinboard View positions (Organic spread on a wall)
        const totalEchoes = inactiveFiles.length;
        const spreadW = window.innerWidth * 0.8;
        const spreadH = window.innerHeight * 0.8;

        // Use a grid-like base with random offsets for organic feel
        const cols = Math.ceil(Math.sqrt(totalEchoes));
        const col = index % cols;
        const row = Math.floor(index / cols);

        const cellW = spreadW / Math.max(1, cols);
        const cellH = spreadH / Math.max(1, Math.ceil(totalEchoes / cols));

        const randomSeedX = Math.sin(index * 123) * 0.5;
        const randomSeedY = Math.cos(index * 456) * 0.5;

        const tx = (col * cellW) - (spreadW / 2) + (cellW / 2) + (randomSeedX * cellW * 0.5);
        const ty = (row * cellH) - (spreadH / 2) + (cellH / 2) + (randomSeedY * cellH * 0.5);
        const tz = -150 + (Math.sin(index * 789) * 50); // slight depth variation

        const rotZ = Math.sin(index * 111) * 15; // -15 to 15 deg tilt

        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        el.style.setProperty('--tz', `${tz}px`);
        el.style.setProperty('--rot-z', `${rotZ}deg`);
        el.style.setProperty('--rot-x', '0deg');
        el.style.setProperty('--rot-y', '0deg');
      } else if (this.isCoverflowView) {
        // Coverflow View positions
        const totalEchoes = inactiveFiles.length;
        const middleIndex = Math.floor(totalEchoes / 2);
        const diff = index - middleIndex;

        const spacingX = 150;
        const tx = diff * spacingX;

        // Push back non-center items, scale them down, rotate them inwards
        const absDiff = Math.abs(diff);
        const tz = absDiff === 0 ? 0 : -200 - (absDiff * 50);
        const rotY = diff === 0 ? 0 : (diff < 0 ? 45 : -45); // Left items face right, right items face left
        const scale = 1 - (absDiff * 0.1);

        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `0px`);
        el.style.setProperty('--tz', `${tz}px`);
        el.style.setProperty('--rot-y', `${rotY}deg`);
        el.style.setProperty('--scale', `${Math.max(0.3, scale)}`);
        el.style.setProperty('--z-index', `${100 - absDiff}`);

        // Reset others
        el.style.setProperty('--rot-x', '0deg');
        el.style.setProperty('--rot-z', '0deg');
        el.style.setProperty('--scatter-x', '0px');
        el.style.setProperty('--scatter-y', '0px');
        el.style.setProperty('--scatter-z', '0px');
        el.style.setProperty('--scatter-rot', '0deg');
      } else if (this.isWaveView) {
        // Wave View positions (Sine wave floating)
        const totalEchoes = inactiveFiles.length;
        const spreadW = window.innerWidth * 1.2;
        const startX = -spreadW / 2;

        const stepX = totalEchoes > 1 ? spreadW / (totalEchoes - 1) : 0;
        const tx = startX + (index * stepX);

        // Sine wave for Y
        const frequency = 2; // Number of full waves
        const amplitude = 300; // Height of wave
        const phase = (index / Math.max(1, totalEchoes - 1)) * Math.PI * 2 * frequency;
        const ty = Math.sin(phase) * amplitude;

        const tz = -150; // Constant depth

        // Derivative of sine is cosine, use for tangent rotation
        const rotZ = Math.cos(phase) * 30; // Max tilt 30deg

        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        el.style.setProperty('--tz', `${tz}px`);
        el.style.setProperty('--rot-z', `${rotZ}deg`);

        // Reset others
        el.style.setProperty('--rot-x', '0deg');
        el.style.setProperty('--rot-y', '0deg');
      } else if (this.isPrismView) {
        // Prism View positions (Polyhedron shape)
        const totalEchoes = inactiveFiles.length;

        // Calculate spherical coordinates for an even distribution
        const phi = Math.acos(1 - 2 * (index + 0.5) / totalEchoes);
        const theta = Math.PI * (1 + Math.sqrt(5)) * index;

        const radius = 450;

        const tx = radius * Math.sin(phi) * Math.cos(theta);
        const ty = radius * Math.sin(phi) * Math.sin(theta);
        const tz = radius * Math.cos(phi) - 200; // Offset back

        // Orient planes to face outward from center
        const rotX = -phi * (180 / Math.PI) + 90;
        const rotY = theta * (180 / Math.PI);
        const rotZ = 0;

        el.style.setProperty('--tx', `${tx}px`);
        el.style.setProperty('--ty', `${ty}px`);
        el.style.setProperty('--tz', `${tz}px`);
        el.style.setProperty('--rot-x', `${rotX}deg`);
        el.style.setProperty('--rot-y', `${rotY}deg`);
        el.style.setProperty('--rot-z', `${rotZ}deg`);
      } else if (this.isScatteredView) {
        // Scattered View positions
        const totalEchoes = inactiveFiles.length;

        // Use a simple pseudo-random function based on index
        const randomSeed = index * 12345.6789;
        const randX = (Math.sin(randomSeed) * 0.5) + 0.5; // 0 to 1
        const randY = (Math.cos(randomSeed * 1.5) * 0.5) + 0.5; // 0 to 1

        const spreadW = window.innerWidth * 0.8;
        const spreadH = window.innerHeight * 0.8;

        const sx = (randX * spreadW) - (spreadW / 2);
        const sy = (randY * spreadH) - (spreadH / 2);

        // Further back ones are smaller/further
        const sz = -100 - (index * 80);
        const rotZ = (Math.sin(randomSeed * 2) * 20); // -20deg to 20deg

        el.style.setProperty('--scatter-x', `${sx}px`);
        el.style.setProperty('--scatter-y', `${sy}px`);
        el.style.setProperty('--scatter-z', `${sz}px`);
        el.style.setProperty('--scatter-rot', `${rotZ}deg`);

        // Remove standard offsets
        el.style.setProperty('--tx', `0px`);
        el.style.setProperty('--ty', `0px`);
        el.style.setProperty('--tz', `0px`);
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

      let clickTimeout = null;

      // Add double click listener to break through the active document
      el.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          if (clickTimeout) {
             clearTimeout(clickTimeout);
             clickTimeout = null;
          }
          const isBreakthrough = el.classList.contains('breakthrough');
          // Remove breakthrough from all other echoes
          this.echoLayerEl.querySelectorAll('.echo-document').forEach(doc => {
              doc.classList.remove('breakthrough');
          });
          if (!isBreakthrough) {
              el.classList.add('breakthrough');
          }
      });

      // Add click listener to switch to this document
      // We use a small timeout to distinguish single click from double click,
      // preventing the active document from switching when the user is trying to double click.
      el.addEventListener('click', (e) => {
          if (e.detail === 1) { // single click only
              clickTimeout = setTimeout(() => {
                  this.setActive(file.id);
                  clickTimeout = null;
              }, 250); // wait 250ms to see if it's a double click
          }
      });

      // Add sci-fi glass pane identifier styling to the existing header
      echoHeader.style.position = 'absolute';
      echoHeader.style.top = '0';
      echoHeader.style.left = '0';
      echoHeader.style.width = '100%';
      echoHeader.style.padding = '8px 16px';
      echoHeader.style.background = 'rgba(0, 229, 255, 0.1)';
      echoHeader.style.borderBottom = '1px solid rgba(0, 229, 255, 0.2)';
      echoHeader.style.fontWeight = 'bold';
      echoHeader.style.letterSpacing = '1px';
      echoHeader.style.textTransform = 'uppercase';
      echoHeader.style.transform = 'translateZ(30px)';
      echoHeader.style.boxShadow = '0 10px 20px rgba(0,0,0,0.5)';

      bodyWrapper.style.marginTop = '40px'; // Offset for header
      bodyWrapper.style.height = 'calc(100% - 40px)';

      // Interactive 3D Card Hover Effect
      el.addEventListener('mousemove', (e) => {
          const rect = el.getBoundingClientRect();
          const localX = e.clientX - rect.left;
          const localY = e.clientY - rect.top;

          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          // -1 to 1 based on position from center
          const normX = (localX - centerX) / centerX;
          const normY = (localY - centerY) / centerY;

          // Max tilt 15 degrees
          const rotX = -normY * 15;
          const rotY = normX * 15;

          el.style.setProperty('--hover-rot-x', `${rotX}deg`);
          el.style.setProperty('--hover-rot-y', `${rotY}deg`);

          // Set local mouse variables for glossy reflection
          const pctX = (localX / rect.width) * 100;
          const pctY = (localY / rect.height) * 100;
          el.style.setProperty('--mouse-local-x', `${pctX}%`);
          el.style.setProperty('--mouse-local-y', `${pctY}%`);
      });

      // Add hover listener to fade editor
      el.addEventListener('mouseenter', (e) => {
          if (this.editorEl) {
              this.editorEl.classList.add('editor-peek-fade');
              // Bring forward while hovering the doc itself
              if (!this.isCascadeView && !this.isOrbitView && !this.isScatteredView && !this.isHelixView && !this.isPinboardView && !this.isVortexView && !this.isPrismView && !this.isCoverflowView && !this.isWaveView) {
                  el.style.setProperty('--tz', '100px');
              } else if (this.isOrbitView) {
                  // Push out slightly to emphasize selection in orbit view
                  const tEchoes = inactiveFiles.length;
                  const oRad = Math.max(500, tEchoes * 120);
                  el.style.setProperty('--orbit-tz', `${oRad + 100}px`);
              } else if (this.isScatteredView) {
                  // Bring forward slightly in scattered view
                  const originalZ = parseFloat(el.style.getPropertyValue('--scatter-z') || '0');
                  el.style.setProperty('--scatter-z', `${originalZ + 150}px`);
              } else if (this.isPinboardView || this.isHelixView || this.isVortexView || this.isPrismView || this.isWaveView) {
                  // Pop out for pinboard/helix/vortex/prism/wave
                  const tz = parseFloat(el.style.getPropertyValue('--tz')) || 0;
                  el.style.setProperty('--tz', `${tz + 150}px`);
                  if (this.isPinboardView || this.isVortexView) {
                      el.style.setProperty('--rot-z', '0deg');
                  }
              }
              // Focus Spotlight: Dispatch event to heavily clear fog and rain when peeking
              const rect = el.getBoundingClientRect();
              const evt = new CustomEvent('echo-peek', {
                detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, radius: Math.max(rect.width, rect.height) / 1.5, isFocusSpotlight: true }
              });
              document.dispatchEvent(evt);
          }
      });

      el.addEventListener('mouseleave', () => {
          // Reset 3D tilt
          el.style.setProperty('--hover-rot-x', `0deg`);
          el.style.setProperty('--hover-rot-y', `0deg`);

          if (this.editorEl) {
              this.editorEl.classList.remove('editor-peek-fade');
              // Restore Z
              if (this.isOrbitView) {
                  const tEchoes = inactiveFiles.length;
                  const oRad = Math.max(500, tEchoes * 120);
                  el.style.setProperty('--orbit-tz', `${oRad}px`);
              } else if (this.isScatteredView) {
                  // Restore scatter Z
                  const index = parseInt(el.dataset.index || 0);
                  const sz = -100 - (index * 80);
                  el.style.setProperty('--scatter-z', `${sz}px`);
              } else if (this.isVortexView) {
                  const inactiveFiles = this.files.filter(f => f.id !== this.activeId);
                  const totalEchoes = inactiveFiles.length;
                  const index = parseInt(el.dataset.index || 0);
                  const indexRatio = index / Math.max(1, totalEchoes - 1);
                  const radius = 200 + (index * 40);
                  const angle = indexRatio * Math.PI * 2 * 4;
                  const tz = -index * 120 - 100;
                  const rotZ = (angle * 180 / Math.PI) + 90;
                  el.style.setProperty('--tz', `${tz}px`);
                  el.style.setProperty('--rot-z', `${rotZ}deg`);
              } else if (this.isPinboardView) {
                  const index = parseInt(el.dataset.index || 0);
                  const tz = -150 + (Math.sin(index * 789) * 50);
                  const rotZ = Math.sin(index * 111) * 15;
                  el.style.setProperty('--tz', `${tz}px`);
                  el.style.setProperty('--rot-z', `${rotZ}deg`);
              } else if (this.isHelixView) {
                  const inactiveFiles = this.files.filter(f => f.id !== this.activeId);
                  const totalEchoes = inactiveFiles.length;
                  const index = parseInt(el.dataset.index || 0);
                  const indexRatio = index / Math.max(1, totalEchoes - 1);
                  const radius = 300;
                  const cycles = 2;
                  const angle = indexRatio * Math.PI * 2 * cycles;
                  const tz = Math.sin(angle) * radius - 200;
                  el.style.setProperty('--tz', `${tz}px`);
              } else if (this.isPrismView) {
                  const inactiveFiles = this.files.filter(f => f.id !== this.activeId);
                  const totalEchoes = inactiveFiles.length;
                  const index = parseInt(el.dataset.index || 0);
                  const phi = Math.acos(1 - 2 * (index + 0.5) / totalEchoes);
                  const radius = 450;
                  const tz = radius * Math.cos(phi) - 200;
                  el.style.setProperty('--tz', `${tz}px`);
              } else if (this.isCoverflowView) {
                  const inactiveFiles = this.files.filter(f => f.id !== this.activeId);
                  const totalEchoes = inactiveFiles.length;
                  const index = parseInt(el.dataset.index || 0);
                  const middleIndex = Math.floor(totalEchoes / 2);
                  const diff = index - middleIndex;
                  const absDiff = Math.abs(diff);
                  const tz = absDiff === 0 ? 0 : -200 - (absDiff * 50);
                  el.style.setProperty('--tz', `${tz}px`);
              } else if (this.isWaveView) {
                  el.style.setProperty('--tz', `-150px`);
              } else if (!this.isCascadeView) {
                  const idx = parseInt(el.dataset.index || 0);
                  el.style.setProperty('--tz', `calc(-${idx * 50}px + var(--stack-z, 0px))`);
              }
          }
      });

      this.echoLayerEl.appendChild(el);
    });
  }
}
