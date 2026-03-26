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
  }

  _deactivateAllViews() {
    this.isCascadeView = false;
    this.isOrbitView = false;
    this.isScatteredView = false;
    this.isIsometricView = false;
    this.isStackView = false;
    this.isTunnelView = false;
    this.isGridView = false;
    document.body.classList.remove('cascade-active', 'orbit-active', 'scattered-active', 'isometric-active', 'stack-active', 'tunnel-active', 'grid-active');
    ['btn-cascade-view', 'btn-orbit-view', 'btn-scattered-view', 'btn-isometric-view', 'btn-stack-view', 'btn-tunnel-view', 'btn-grid-view'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('active');
    });
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

    // Trigger Depth-Swap animation
    const targetEl = file.isImage ? this.imageViewerEl : this.editorEl;
    if (targetEl) {
        targetEl.classList.remove('depth-swap-active');
        // Force reflow
        void targetEl.offsetWidth;
        targetEl.classList.add('depth-swap-active');

        // Clean up animation class
        setTimeout(() => {
            targetEl.classList.remove('depth-swap-active');
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
      const baseOpacity = Math.max(0.05, 0.4 - (index * 0.15));
      const baseBlur = Math.min(10, 2 + (index * 2));
      el.style.setProperty('--base-opacity', baseOpacity);
      el.style.setProperty('--base-blur', `${baseBlur}px`);

      // Add a CSS-animated scanning line effect to the document
      const scanLine = document.createElement('div');
      scanLine.className = 'scan-line';
      scanLine.style.setProperty('--index', index);
      el.appendChild(scanLine);

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
              if (!this.isCascadeView && !this.isOrbitView && !this.isScatteredView) {
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
              }
              // Dispatch event to clear fog
              const rect = el.getBoundingClientRect();
              const evt = new CustomEvent('echo-peek', {
                detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
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
