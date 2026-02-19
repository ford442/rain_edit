export class ConnectionManager {
    constructor(canvas, referenceManager) {
        this.canvas = canvas;
        this.referenceManager = referenceManager;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    draw(time) {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);

        const cards = this.referenceManager.getCards();
        if (cards.length < 2) return;

        // Extract keywords for each card
        const cardData = cards.map(card => {
            const rect = card.getBoundingClientRect();
            // Get text, remove common words, find significant ones
            // We ignore very short words
            const text = card.innerText.toLowerCase();
            const words = text.split(/\W+/).filter(w => w.length > 4);
            const uniqueWords = new Set(words);

            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                words: uniqueWords,
                element: card
            };
        });

        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';

        // Draw connections
        for (let i = 0; i < cardData.length; i++) {
            for (let j = i + 1; j < cardData.length; j++) {
                const a = cardData[i];
                const b = cardData[j];

                // Check intersection of words
                let shared = 0;
                for (let w of a.words) {
                    if (b.words.has(w)) shared++;
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
    }
}
