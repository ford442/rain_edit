export class ConnectionManager {
    constructor(canvas, referenceManager) {
        this.canvas = canvas;
        this.referenceManager = referenceManager;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.editorFocus = null; // { word: string, x: number, y: number }
        this.cardKeywords = new Map(); // Map<HTMLElement, Set<string>>

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    setEditorFocus(word, x, y) {
        if (!word || word.length < 3) {
            this.editorFocus = null;
        } else {
            this.editorFocus = { word: word.toLowerCase(), x, y };
        }
    }

    updateKeywords() {
        const cards = this.referenceManager.getCards();
        this.cardKeywords.clear();
        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            const words = text.split(/\W+/).filter(w => w.length > 3);
            this.cardKeywords.set(card, new Set(words));
        });
    }

    draw(time) {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);

        const cards = this.referenceManager.getCards();
        if (cards.length === 0) return;

        // If cache is empty but we have cards, update it
        if (this.cardKeywords.size === 0 && cards.length > 0) {
            this.updateKeywords();
        }

        // Map current positions
        const cardData = cards.map(card => {
            const rect = card.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                words: this.cardKeywords.get(card) || new Set(),
                element: card
            };
        });

        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';

        // Draw Inter-Card connections
        for (let i = 0; i < cardData.length; i++) {
            for (let j = i + 1; j < cardData.length; j++) {
                const a = cardData[i];
                const b = cardData[j];

                // Check intersection of words
                let shared = 0;
                // Optimization: Iterate over smaller set
                const [small, large] = a.words.size < b.words.size ? [a.words, b.words] : [b.words, a.words];
                for (let w of small) {
                    if (large.has(w) && w.length > 4) shared++;
                }

                // Force connections if cards are very close (visual proximity)
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 300) {
                    shared += 1; // Boost proximity
                }

                if (shared > 0) {
                    // Calculate opacity based on shared count and time
                    // Pulse
                    const baseOpacity = Math.min(0.4, shared * 0.15);
                    const pulse = (Math.sin(time * 2 + i * 13 + j * 7) * 0.3 + 0.7);
                    const opacity = baseOpacity * pulse;

                    this.ctx.strokeStyle = `rgba(0, 229, 255, ${opacity})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(a.x, a.y);
                    this.ctx.lineTo(b.x, b.y);
                    this.ctx.stroke();

                    // Draw "data packets" moving along the line occasionally
                    const packetTime = (time + i + j) % 4; // 4 second cycle
                    if (packetTime < 1) {
                         const t = packetTime; // 0 to 1
                         const px = a.x + (b.x - a.x) * t;
                         const py = a.y + (b.y - a.y) * t;

                         this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity + 0.2})`;
                         this.ctx.beginPath();
                         this.ctx.arc(px, py, 2, 0, Math.PI * 2);
                         this.ctx.fill();
                    }
                }
            }
        }

        // Draw Editor Focus Connections
        if (this.editorFocus) {
            const { word, x, y } = this.editorFocus;
            cardData.forEach(node => {
                if (node.words.has(word)) {
                    // Draw connection
                    const dist = Math.hypot(node.x - x, node.y - y);
                    const opacity = Math.min(0.8, 1000 / (dist + 100)); // Fade with distance

                    this.ctx.strokeStyle = `rgba(255, 200, 50, ${opacity})`; // Gold color
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(node.x, node.y);
                    this.ctx.stroke();
                    this.ctx.lineWidth = 1.5;

                    // Highlight the card slightly?
                    // We can't easily modify DOM style from here efficiently every frame,
                    // but the line itself is a good indicator.
                }
            });
        }
    }
}
