export class ReferenceManager {
  constructor(layerEl, overlayEl) {
    this.layer = layerEl;
    this.overlay = overlayEl;
    this.isLanternMode = true;
    this.mouseX = 0;
    this.mouseY = 0;

    // Draggable state
    this.draggedNote = null;
    this.dragOffset = { x: 0, y: 0 };

    this.initEvents();
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
    if (this.layer) {
        const notes = this.layer.children;
        for (let note of notes) {
            if (!note.classList.contains('note-card')) continue;

            const depth = parseFloat(note.dataset.depth) || 1;
            const initialRot = parseFloat(note.dataset.initialRot) || 0;

            // Move opposite to mouse
            const moveX = -normX * 30 * depth;
            const moveY = -normY * 30 * depth;

            note.style.transform = `translate(${moveX}px, ${moveY}px) rotate(${initialRot}deg)`;
        }
    }
  }

  handleMouseUp() {
    this.draggedNote = null;
  }

  update(text) {
    if (!this.layer) return;
    this.layer.innerHTML = '';
    if (!text) return;

    // Split by headings (# ) or horizontal rules (---)
    const parts = text.split(/(?:^|\n)(?=# )|(?:\n---)/g).filter(p => p && p.trim().length > 0);

    parts.forEach((part, index) => {
      const html = this.parseMarkdown(part);
      const card = document.createElement('div');
      card.className = 'note-card';
      card.innerHTML = html;

      // Deterministic random positioning based on index
      const seed = index * 1337;
      const rnd = (n) => {
          const x = Math.sin(seed + n) * 10000;
          return x - Math.floor(x);
      };

      const left = 10 + rnd(1) * 60; // 10% to 70%
      const top = 10 + rnd(2) * 60; // 10% to 70%
      const rot = -5 + rnd(3) * 10; // -5 to 5 deg
      const depth = 0.5 + rnd(4) * 1.5; // 0.5 to 2.0

      card.style.left = left + '%';
      card.style.top = top + '%';
      card.style.transform = `rotate(${rot}deg)`; // Initial transform, will be updated by mousemove
      card.dataset.initialRot = rot;
      card.dataset.depth = depth;

      // Add drag listener
      card.addEventListener('mousedown', (e) => {
        // Drag if Alt is pressed
        if (e.altKey) {
            this.draggedNote = card;
            const rect = card.getBoundingClientRect();
            // rect includes translate transform.
            // When we set style.left, we are setting the base position.
            // But visually the card is at rect.
            // If we want the card to stay under the mouse, we need to account for the translate offset?
            // Actually, simply:
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            // However, rect.left includes the translate offset.
            // When we set style.left later, that changes the base position.
            // And translate is applied on top.
            // So if translate is +10px, and we drag 1px.
            // This works out because we use rect (visual pos) to calc offset.

            e.preventDefault();
        }
      });

      this.layer.appendChild(card);
    });
  }

  parseMarkdown(text) {
    let safeText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return safeText
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
      .replace(/^\- (.*$)/gim, '<div class="md-list-item">• $1</div>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
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
