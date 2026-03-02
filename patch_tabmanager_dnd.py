import re

with open('src/TabManager.js', 'r') as f:
    content = f.read()

render_tabs_replacement = """  _renderTabs() {
    if (!this.tabsEl) return;
    const list = this.tabsEl.querySelector('.tabs-list');
    if (!list) return;
    list.innerHTML = '';
    this.files.forEach(file => {
      const tab = document.createElement('div');
      tab.className = 'tab-item' + (file.id === this.activeId ? ' active' : '');
      tab.title = `${file.name} — ${DEPTH_TITLES[file.depth]}\\nDrag to change depth`;
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
  }"""

content = re.sub(
    r"  _renderTabs\(\) \{.*?\n  \}",
    render_tabs_replacement,
    content,
    flags=re.DOTALL
)

with open('src/TabManager.js', 'w') as f:
    f.write(content)
