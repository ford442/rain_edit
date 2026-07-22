/**
 * Generated keyboard cheatsheet. Reads the live binding catalog from an
 * InputManager and renders a grouped overlay. Toggled by `?` or `Alt+/`
 * (registered as normal bindings in initInteractions).
 */

const CATEGORY_LABELS = {
  lens: "Lenses & Magnifiers",
  reveal: "Reveal Effects",
  depth: "Depth & Layers",
  navigation: "Navigation & Focus",
  effects: "Ambient Effects",
  editor: "Editor & Files",
  "editor-feedback": "Editor Feedback",
  help: "Help",
  misc: "Other",
};

export class CheatsheetOverlay {
  constructor(manager, { doc = document } = {}) {
    this.manager = manager;
    this.doc = doc;
    this.el = null;
  }

  toggle() {
    if (this.el) this.hide();
    else this.show();
  }

  show() {
    if (this.el) return;
    const overlay = this.doc.createElement("div");
    overlay.id = "keyboard-cheatsheet";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Keyboard shortcuts");

    const panel = this.doc.createElement("div");
    panel.className = "cheatsheet-panel";

    const title = this.doc.createElement("h2");
    title.textContent = "Keyboard Shortcuts";
    panel.appendChild(title);

    const hint = this.doc.createElement("p");
    hint.className = "cheatsheet-hint";
    hint.textContent = "Press ? or Alt+/ to toggle • Esc to close";
    panel.appendChild(hint);

    const grid = this.doc.createElement("div");
    grid.className = "cheatsheet-grid";

    const groups = this.manager.list();
    Object.keys(groups)
      .sort((a, b) => (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b))
      .forEach((cat) => {
        const section = this.doc.createElement("section");
        const h = this.doc.createElement("h3");
        h.textContent = CATEGORY_LABELS[cat] || cat;
        section.appendChild(h);
        groups[cat]
          .slice()
          .sort((a, b) => a.description.localeCompare(b.description))
          .forEach((b) => {
            const row = this.doc.createElement("div");
            row.className = "cheatsheet-row";
            const combo = this.doc.createElement("kbd");
            combo.textContent = b.combo || "—";
            const desc = this.doc.createElement("span");
            desc.textContent = b.description;
            row.appendChild(combo);
            row.appendChild(desc);
            section.appendChild(row);
          });
        grid.appendChild(section);
      });

    panel.appendChild(grid);
    overlay.appendChild(panel);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.hide();
    });

    this.doc.body.appendChild(overlay);
    this.el = overlay;
  }

  hide() {
    if (!this.el) return;
    this.el.remove();
    this.el = null;
  }
}
