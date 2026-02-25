export class ReferenceManager {
  constructor(layerEl, overlayEl, monacoInstance) {
    this.layer = layerEl;
    this.overlay = overlayEl;
    this.monaco = monacoInstance;
    this.raindrops = null;
    this.connectionManager = null;
    this.isLanternMode = true;
    this.isLensMode = false;
    this.mouseX = 0;
    this.mouseY = 0;

    // Spotlight Layer
    this.spotlightLayer = document.createElement('div');
    this.spotlightLayer.id = 'spotlight-layer';
    this.spotlightLayer.style.position = 'absolute';
    this.spotlightLayer.style.inset = '0';
    this.spotlightLayer.style.zIndex = '20'; // Above overlay and editor
    this.spotlightLayer.style.pointerEvents = 'none'; // Allow clicks to pass through empty areas
    if (this.layer && this.layer.parentElement) {
        this.layer.parentElement.appendChild(this.spotlightLayer);
    }

    // Draggable state
    this.draggedNote = null;
    this.dragOffset = { x: 0, y: 0 };
    this.zIndexCounter = 50;
    this.stormIntensity = 0;

    this.initEvents();
  }

  setRaindrops(raindrops) {
    this.raindrops = raindrops;
  }

  setConnectionManager(cm) {
    this.connectionManager = cm;
  }

  initEvents() {
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', () => this.handleMouseUp());
  }

  handleMouseMove(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    // Rain Interaction (Shield Effect)
    if (this.raindrops) {
        // Check if mouse is over a note card
        if (e.target && e.target.closest('.note-card')) {
            this.raindrops.clearDroplets(this.mouseX, this.mouseY, 80);
        }
    }

    // Lantern Mask Logic
    if (this.overlay) {
      this.overlay.style.setProperty('--mouse-x', `${this.mouseX}px`);
      this.overlay.style.setProperty('--mouse-y', `${this.mouseY}px`);
    }

    // Drag Logic
    if (this.draggedNote) {
      const x = this.mouseX - this.dragOffset.x;
      const y = this.mouseY - this.dragOffset.y;

      this.draggedNote.style.left = `${x}px`;
      this.draggedNote.style.top = `${y}px`;
    }

    // Parallax is now handled in render loop for smoothness + breathing
  }

  render(time) {
      this.updateParallax(this.layer, time);
      if (this.spotlightLayer) this.updateParallax(this.spotlightLayer, time);
  }

  updateParallax(container, time) {
        if (!container) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const normX = (this.mouseX / w) * 2 - 1;
        const normY = (this.mouseY / h) * 2 - 1;

        const notes = container.children;
        for (let note of notes) {
            if (!note.classList.contains('note-card')) continue;

            const depth = parseFloat(note.dataset.depth) || 1;
            const initialRot = parseFloat(note.dataset.initialRot) || 0;

            // Enhanced Parallax
            const moveX = -normX * 50 * depth;
            const moveY = -normY * 50 * depth;

            // Enhanced Tilt (3D Depth)
            const rotateX = -normY * 5 * depth;
            const rotateY = normX * 5 * depth;
            const translateZ = depth * 50; // Bring closer items more forward in Z space

            // Dynamic Depth of Field (Focus based on mouse proximity)
            const rect = note.getBoundingClientRect();
            const cardCenterX = rect.left + rect.width / 2;
            const cardCenterY = rect.top + rect.height / 2;
            const dist = Math.hypot(this.mouseX - cardCenterX, this.mouseY - cardCenterY);

            const focusRange = this.isLensMode ? 500 : 300;
            const focusFactor = Math.max(0, 1 - dist / focusRange); // 0 to 1 (1 is closest)

            // Base blur comes from depth, but proximity reduces it
            let blurAmount = Math.max(0, (1.2 - depth) * 3);

            // If Lens Mode is active, we want to aggressively sharpen
            const sharpenFactor = this.isLensMode ? 1.0 : 0.8;
            blurAmount = blurAmount * (1 - focusFactor * sharpenFactor);

            // Breathing Effect
            // Scale oscillates based on time and storm intensity
            const breathe = Math.sin(time * 2 + depth * 10) * 0.02 * this.stormIntensity;

            // Subtle scale up when focused
            const focusScale = 1 + (focusFactor * 0.05) + breathe;

            note.style.transform = `translate3d(${moveX}px, ${moveY}px, ${translateZ}px) rotate(${initialRot}deg) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${focusScale})`;

            // Lens Mode Opacity Logic
            if (this.isLensMode && !note.classList.contains('spotlight')) {
                // Fade out distant notes, bring focused one to full opacity
                note.style.opacity = 0.3 + (focusFactor * 0.7);
            } else if (!note.classList.contains('spotlight')) {
                 note.style.opacity = ''; // Revert to CSS default
            }

            if (!note.classList.contains('spotlight') && !note.classList.contains('dimmed')) {
                note.style.filter = `blur(${blurAmount}px)`;
            }
            if (note.classList.contains('spotlight')) {
                // Keep scale for spotlight
                note.style.transform += ' scale(1.05)';
            }
        }
  }

  handleMouseUp() {
    this.draggedNote = null;
  }

  update(text) {
    if (!this.layer) return;
    this.layer.innerHTML = '';
    if (this.spotlightLayer) this.spotlightLayer.innerHTML = '';

    if (!text) return;

    // Split by headings (# ) or horizontal rules (---)
    const parts = text.split(/(?:^|\n)(?=# )|(?:\n---)/g).filter(p => p && p.trim().length > 0);

    const cols = 3;
    const colWidth = 90 / cols;

    parts.forEach((part, index) => {
      const html = this.parseMarkdown(part);
      const card = document.createElement('div');
      card.className = 'note-card floating';

      const content = document.createElement('div');
      content.className = 'card-content';
      content.innerHTML = html;
      card.appendChild(content);

      // Deterministic random positioning based on index
      const seed = index * 1337;
      const rnd = (n) => {
          const x = Math.sin(seed + n) * 10000;
          return x - Math.floor(x);
      };

      // Grid Layout
      const colIndex = index % cols;
      const rowInCol = Math.floor(index / cols);

      const left = 5 + (colIndex * colWidth) + rnd(1) * 5;
      const top = 10 + (rowInCol * 40) + rnd(2) * 10;

      const rot = -2 + rnd(3) * 4;
      const depth = 0.4 + rnd(4) * 0.8;

      card.style.left = left + '%';
      card.style.top = top + '%';
      card.style.transform = `rotate(${rot}deg)`;

      // Animation Configuration
      card.style.animationName = 'float-in, float';
      card.style.animationDuration = `0.6s, 6s`;
      card.style.animationTimingFunction = `ease-out, ease-in-out`;
      card.style.animationIterationCount = `1, infinite`;
      card.style.animationDirection = `normal, alternate`;
      card.style.animationFillMode = `backwards, none`;

      // Stagger entrance based on index, float delay is random
      // entrance delay = index * 0.1s
      // float delay = entrance delay + entrance duration + random bobbing offset
      const entranceDelay = index * 0.1;
      const floatDelay = entranceDelay + 0.6 + rnd(5);
      card.style.animationDelay = `${entranceDelay}s, ${floatDelay}s`;

      card.dataset.initialRot = rot;
      card.dataset.depth = depth;

      // Bring to front on click (Z-Index Management)
      card.addEventListener('mousedown', () => {
         this.zIndexCounter++;
         card.style.zIndex = this.zIndexCounter;
      });

      // Add drag listener
      card.addEventListener('mousedown', (e) => {
        // Drag if Alt is pressed
        if (e.altKey) {
            this.draggedNote = card;
            const rect = card.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            e.preventDefault();
        }
      });

      // Collapse Logic
      const headers = card.querySelectorAll('h1, h2, h3');
      headers.forEach(header => {
          header.style.cursor = 'pointer';
          header.title = 'Click to collapse/expand';
          header.addEventListener('click', (e) => {
               if (!e.altKey) {
                   card.classList.toggle('collapsed');
               }
          });
      });

      // Spotlight Logic
      card.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const wasSpotlit = card.classList.contains('spotlight');

        // Remove spotlight from all others and move back to layer
        if (this.spotlightLayer) {
            const currentSpotlights = Array.from(this.spotlightLayer.children);
            currentSpotlights.forEach(c => {
                c.classList.remove('spotlight');
                this.layer.appendChild(c);
            });
        }

        const notes = this.layer.querySelectorAll('.note-card');
        notes.forEach(c => {
            c.classList.remove('spotlight');
            c.classList.remove('dimmed');
        });
        this.layer.classList.remove('has-spotlight');

        if (!wasSpotlit) {
            card.classList.add('spotlight');
            this.layer.classList.add('has-spotlight');

            // Dim others
            const otherNotes = this.layer.querySelectorAll('.note-card');
            otherNotes.forEach(c => {
                 if (c !== card) c.classList.add('dimmed');
            });

            // Move to spotlight layer
            if (this.spotlightLayer) {
                this.spotlightLayer.appendChild(card);
            }
        }
      });

      // Rain Shield Logic
      card.addEventListener('mousemove', (e) => {
        if (this.raindrops) {
            this.raindrops.clearDroplets(e.clientX, e.clientY, 30);
        }
      });

      // Syntax Highlighting
      if (this.monaco) {
          const codeBlocks = card.querySelectorAll('pre code');
          codeBlocks.forEach(async (block) => {
              let lang = 'javascript';
              // Check class for language
              const classes = block.className.split(' ');
              const langClass = classes.find(c => c.startsWith('language-'));
              if (langClass) {
                  lang = langClass.replace('language-', '');
              }

              const code = block.innerText;
              try {
                  const colorized = await this.monaco.editor.colorize(code, lang, {});
                  block.innerHTML = colorized;
              } catch (err) {
                  console.warn('Colorize failed:', err);
              }
          });
      }

      this.layer.appendChild(card);
    });

    if (this.connectionManager) {
        this.connectionManager.updateKeywords();
    }
  }

  toggleRainStreaks(enable) {
      const cards = this.getCards();
      cards.forEach(card => {
          if (enable) {
              card.classList.add('rain-streaks');
          } else {
              card.classList.remove('rain-streaks');
          }
      });
  }

  parseMarkdown(text) {
    let safeText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Enhanced Table Support
    safeText = safeText.replace(/((?:^\|.*\|\r?\n?)+)/gm, (match) => {
        const lines = match.trim().split(/\r?\n/);
        if (lines.length < 2) return match;

        // Separator check
        if (!lines[1].match(/^[|\s-:.]+$/)) return match;

        let html = '<table class="md-table">';

        // Header
        const headers = lines[0].replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        html += '<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';

        // Body
        html += '<tbody>';
        for(let i = 2; i < lines.length; i++) {
             const row = lines[i].replace(/^\||\|$/g, '').trim();
             if(!row) continue;
             const cols = row.split('|').map(c => c.trim());
             html += '<tr>' + cols.map(c => `<td>${c}</td>`).join('') + '</tr>';
        }
        html += '</tbody></table>';
        return html;
    });

    // Process callouts
    safeText = safeText.replace(/^> \[!NOTE\] (.*$)/gim, '<div class="callout note">$1</div>');

    // Process blockquotes first to avoid conflicts
    safeText = safeText.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Process task lists
    safeText = safeText.replace(/^- \[x\] (.*$)/gim, '<div class="md-list-item checked"><input type="checkbox" checked disabled> $1</div>');
    safeText = safeText.replace(/^- \[ \] (.*$)/gim, '<div class="md-list-item"><input type="checkbox" disabled> $1</div>');

    // Process list items - hacky single level support
    // We replace lines starting with "- " with a div
    safeText = safeText.replace(/^- \[ \] (.*$)/gim, '<div class="md-task-item"><input type="checkbox"> $1</div>');
    safeText = safeText.replace(/^- \[x\] (.*$)/gim, '<div class="md-task-item"><input type="checkbox" checked> $1</div>');
    // Improved list parsing with indentation support
    safeText = safeText.replace(/^(\s*)- (.*$)/gim, (match, indent, content) => {
        let depth = 0;
        for (let char of indent) {
            depth += (char === '\t') ? 4 : 1;
        }
        const padding = (depth * 12) + 20; // Increased padding per level
        return `<div class="md-list-item" style="padding-left: ${padding}px">${content}</div>`;
    });

    return safeText
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/```(\w+)?\s*\n([\s\S]*?)```/gim, (match, lang, code) => {
          return `<pre><code class="language-${lang || 'javascript'}">${code}</code></pre>`;
      })
      .replace(/```([\s\S]*?)```/gim, '<pre><code class="language-javascript">$1</code></pre>')
      .replace(/\n/gim, '<br>');
  }

  setStormIntensity(level) {
      if (!this.layer) return;
      this.stormIntensity = Math.min(1, level / 60);

      // Threshold for visual shaking
      if (level > 40) {
          this.layer.classList.add('storm-shaking');
          if (this.spotlightLayer) this.spotlightLayer.classList.add('storm-shaking');
      } else {
          this.layer.classList.remove('storm-shaking');
          if (this.spotlightLayer) this.spotlightLayer.classList.remove('storm-shaking');
      }
  }

  setLanternMode(enabled) {
      this.isLanternMode = enabled;
      if (this.overlay) {
          if (enabled) {
            this.overlay.classList.add('lantern-active');
            this.overlay.classList.remove('lantern-inactive');
          } else {
            this.overlay.classList.remove('lantern-active');
            this.overlay.classList.add('lantern-inactive');
          }
      }
  }

  getFocusedNoteRect() {
      if (!this.layer) return null;
      const focused = this.layer.querySelector('.focused-behind') ||
                      (this.spotlightLayer && this.spotlightLayer.querySelector('.focused-behind'));
      if (focused) {
          return focused.getBoundingClientRect();
      }
      return null;
  }

  highlightNoteAt(x, y) {
      if (!this.layer) return null;
      let hit = null;

      // Check main layer
      const checkContainer = (container) => {
          if (!container) return null;
          const notes = container.children;
          for (let note of notes) {
              if (!note.classList.contains('note-card')) continue;
              const rect = note.getBoundingClientRect();
              if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                  return note;
              }
          }
          return null;
      }

      hit = checkContainer(this.spotlightLayer) || checkContainer(this.layer);

      // Reset all first
      const allNotes = [
          ...this.layer.querySelectorAll('.note-card'),
          ...(this.spotlightLayer ? this.spotlightLayer.querySelectorAll('.note-card') : [])
      ];

      allNotes.forEach(n => {
          if (n !== hit) n.classList.remove('focused-behind');
      });

      if (hit) {
          hit.classList.add('focused-behind');
      }
      return hit;
  }

  getCards() {
      if (!this.layer) return [];
      const cards = [
          ...Array.from(this.layer.querySelectorAll('.note-card')),
          ...(this.spotlightLayer ? Array.from(this.spotlightLayer.querySelectorAll('.note-card')) : [])
      ];
      return cards;
  }
}
