export class HoloManager {
    constructor(editor, layerEl) {
        this.editor = editor;
        this.layer = layerEl;
        this.elements = [];
        this.init();
    }

    init() {
        // Debounce updates to avoid performance hit on large files
        let debounceTimer;
        this.editor.onDidChangeModelContent(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.update(), 500);
        });

        this.editor.onDidScrollChange(() => this.updatePositions());
        this.editor.onDidLayoutChange(() => this.updatePositions());

        // Initial scan after a short delay to ensure editor is ready
        setTimeout(() => this.update(), 100);
    }

    update() {
        const model = this.editor.getModel();
        if (!model) return;

        const text = model.getValue();
        const lines = text.split('\n');
        const holoItems = [];

        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            // Matches: // TODO: message, // FIXME: message, etc.
            const match = line.match(/\/\/\s*(TODO|FIXME|NOTE|HOLO|OPTIMIZE):\s*(.*)/i);
            if (match) {
                holoItems.push({
                    lineNumber,
                    type: match[1].toUpperCase(),
                    text: match[2].trim()
                });
            }
        });

        this.render(holoItems);
    }

    render(items) {
        if (!this.layer) return;
        this.layer.innerHTML = '';
        this.elements = [];

        items.forEach(item => {
            const el = document.createElement('div');
            el.className = `holo-item holo-${item.type.toLowerCase()}`;

            // Icon mapping
            let icon = '⚡';
            if (item.type === 'TODO') icon = '☐';
            if (item.type === 'FIXME') icon = '🔧';
            if (item.type === 'NOTE') icon = 'ℹ';
            if (item.type === 'HOLO') icon = '💠';

            // Escape HTML to prevent XSS
            const safeText = item.text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

            el.innerHTML = `<span class="holo-icon">${icon}</span> <span class="holo-label">${item.type}</span> <span class="holo-text">${safeText}</span>`;

            this.layer.appendChild(el);
            this.elements.push({ el, lineNumber: item.lineNumber });
        });

        this.updatePositions();
    }

    updatePositions() {
        if (!this.editor || !this.elements) return;

        this.elements.forEach(({ el, lineNumber }) => {
            // Get position relative to the editor's content view
            // Note: getScrolledVisiblePosition returns null if the line is completely outside the viewport
            // but we might want to still track it if it's just partially out.
            // For now, simple logic is fine.
            try {
                const position = this.editor.getScrolledVisiblePosition({ lineNumber, column: 1 });

                if (position) {
                    // Offset logic:
                    // top: match code line
                    // left: shifted right to sit "behind" the comment or near it
                    el.style.top = `${position.top}px`;
                    el.style.left = `${position.left + 60}px`;
                    el.style.display = 'flex';
                } else {
                    el.style.display = 'none';
                }
            } catch (e) {
                // Ignore errors during layout trashing
            }
        });
    }
}
