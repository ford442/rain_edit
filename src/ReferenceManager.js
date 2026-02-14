export class ReferenceManager {
  constructor(layerEl, overlayEl, monacoInstance) {
    this.layer = layerEl;
    this.overlay = overlayEl;
    this.monaco = monacoInstance;
    this.isLanternMode = true;
    this.mouseX = 0;
    this.mouseY = 0;
    this.raindrops = null; // Store raindrops instance

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

    this.initEvents();
  }

  setRaindrops(raindrops) {
    this.raindrops = raindrops;
  }

  initEvents() {
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', () => this.handleMouseUp());
  }

  handleMouseMove(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

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

    // Parallax Logic
    const w = window.innerWidth;
    const h = window.innerHeight;
    const normX = (this.mouseX / w) * 2 - 1;
    const normY = (this.mouseY / h) * 2 - 1;

    // Apply to all notes
    const applyParallax = (container) => {
        if (!container) return;
        const notes = container.children;
        for (let note of notes) {
            if (!note.classList.contains('note-card')) continue;

            const depth = parseFloat(note.dataset.depth) || 1;
            const initialRot = parseFloat(note.dataset.initialRot) || 0;

            // Move opposite to mouse
            const moveX = -normX * 30 * depth;
            const moveY = -normY * 30 * depth;

            note.style.transform = `translate(${moveX}px, ${moveY}px) rotate(${initialRot}deg)`;
            if (note.classList.contains('spotlight')) {
                // Keep scale for spotlight
                note.style.transform += ' scale(1.05)';
            }
        }
    };

    applyParallax(this.layer);
    applyParallax(this.spotlightLayer);
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
      card.innerHTML = html;

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
      const depth = 0.8 + rnd(4) * 1.0;
      const delay = rnd(5) * 5;

      card.style.left = left + '%';
      card.style.top = top + '%';
      card.style.transform = `rotate(${rot}deg)`;
      card.style.animationDelay = `${delay}s`;

      card.dataset.initialRot = rot;
      card.dataset.depth = depth;

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
      card.addEventListener('dblclick', () => {
        const wasSpotlit = card.classList.contains('spotlight');

        // Remove spotlight from all others and move back to layer
        if (this.spotlightLayer) {
            const currentSpotlights = Array.from(this.spotlightLayer.children);
            currentSpotlights.forEach(c => {
                c.classList.remove('spotlight');
                // Remove scale transform part
                // Actually parallax logic handles transform, we just need to re-trigger or wait for mousemove
                this.layer.appendChild(c);
            });
        }

        const notes = this.layer.querySelectorAll('.note-card');
        notes.forEach(c => c.classList.remove('spotlight'));
        this.layer.classList.remove('has-spotlight');

        if (!wasSpotlit) {
            card.classList.add('spotlight');
            this.layer.classList.add('has-spotlight');
            // Move to spotlight layer
            if (this.spotlightLayer) {
                this.spotlightLayer.appendChild(card);
            }
        } else {
            // Already handled by moving back logic above if we clicked the same card?
            // Wait, logic above moved ALL spotlights back.
            // If we double clicked the SAME card, it was moved back, and class removed.
            // So !wasSpotlit is false. So we do nothing more. Correct.
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
  }

  parseMarkdown(text) {
    let safeText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Process blockquotes first to avoid conflicts
    safeText = safeText.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Process task lists
    safeText = safeText.replace(/^- \[x\] (.*$)/gim, '<div class="md-list-item checked"><input type="checkbox" checked disabled> $1</div>');
    safeText = safeText.replace(/^- \[ \] (.*$)/gim, '<div class="md-list-item"><input type="checkbox" disabled> $1</div>');

    // Process list items - hacky single level support
    // We replace lines starting with "- " with a div
    safeText = safeText.replace(/^\- (.*$)/gim, '<div class="md-list-item">$1</div>');

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
}
