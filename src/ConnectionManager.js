export class ConnectionManager {
    constructor(canvas, referenceManager) {
        this.canvas = canvas;
        this.referenceManager = referenceManager;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.editorFocus = null; // { word: string, x: number, y: number }
        this.cardKeywords = new Map(); // Map<HTMLElement, Set<string>>
        this.echoTargets = []; // Array of DOMRects for matched echo documents

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.radarCanvas = document.getElementById('radar-canvas');
        if (this.radarCanvas) {
            this.radarCtx = this.radarCanvas.getContext('2d');
        }
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    setEditorFocus(word, x, y) {
        if (!this.referenceManager) return;

        // Clear previous highlights
        const cards = this.referenceManager.getCards();
        if (!cards) return;

        cards.forEach(card => card.classList.remove('matched-card'));

        if (!word || word.length < 3) {
            this.editorFocus = null;
        } else {
            this.editorFocus = { word: word.toLowerCase(), x, y };

            // Ensure cardKeywords is initialized
            if (!this.cardKeywords) {
                this.cardKeywords = new Map();
            }

            // Populate keywords if empty and we have cards
            if (this.cardKeywords.size === 0 && cards.length > 0) {
                 this.updateKeywords();
            }

            // Highlight matching cards
            cards.forEach(card => {
                const words = this.cardKeywords.get(card);
                if (words && words.has(this.editorFocus.word)) {
                    card.classList.add('matched-card');
                }
            });
        }
    }

    updateKeywords() {
        if (!this.referenceManager) return;
        const cards = this.referenceManager.getCards();
        if (!cards) return;

        if (!this.cardKeywords) {
            this.cardKeywords = new Map();
        } else {
            this.cardKeywords.clear();
        }

        cards.forEach(card => {
            const text = (card.innerText || "").toLowerCase();
            const words = text.split(/\W+/).filter(w => w.length > 3);
            this.cardKeywords.set(card, new Set(words));
        });
    }

    setEchoFocus(targets) {
        this.echoTargets = targets || [];
    }

    draw(time) {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // ... we don't return early if no cards exist, because we might still draw echo targets
        const cards = this.referenceManager ? this.referenceManager.getCards() : [];
        let cardData = [];

        if (cards && cards.length > 0) {
            // Ensure keywords map is ready
            if (!this.cardKeywords) {
                this.cardKeywords = new Map();
            }

            // If cache is empty but we have cards, update it
            if (this.cardKeywords.size === 0) {
                this.updateKeywords();
            }

            // Map current positions
            cardData = cards.map(card => {
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
            this.ctx.setLineDash([2, 8]); // Subtle dash
            this.ctx.lineDashOffset = -time * 5; // Slow movement

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

                             this.ctx.save();
                             this.ctx.setLineDash([]);
                             this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity + 0.2})`;
                             this.ctx.beginPath();
                             this.ctx.arc(px, py, 2, 0, Math.PI * 2);
                             this.ctx.fill();
                             this.ctx.restore();
                        }
                    }
                }
            }
        }

        // Draw Editor Focus Connections (Smart Lens)
        if (this.editorFocus) {
            const { word, x, y } = this.editorFocus;

            this.ctx.setLineDash([8, 6]);
            this.ctx.lineDashOffset = -time * 30; // Fast movement
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)'; // Gold glow

            // Helper to draw a bezier flow line
            const drawFlowLine = (targetX, targetY, isEcho = false) => {
                const dist = Math.hypot(targetX - x, targetY - y);
                // Reduce distance scaling for echoes to make them more visible across the screen
                const opacity = isEcho ? Math.min(1.0, 1500 / (dist + 50)) : Math.min(1.0, 1200 / (dist + 100));

                const strokeColor = isEcho ? `rgba(0, 229, 255, ${opacity})` : `rgba(255, 215, 0, ${opacity})`;

                this.ctx.strokeStyle = strokeColor;
                this.ctx.lineWidth = isEcho ? 1.5 : 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);

                // Bezier curve for more organic feel
                const cx = (x + targetX) / 2;
                const cy = (y + targetY) / 2 - 50;
                this.ctx.quadraticCurveTo(cx, cy, targetX, targetY);

                this.ctx.stroke();

                // Data Flow animation
                const flowTime = (time * 2) % 1;
                const t = flowTime; // t from 0 to 1

                // Quadratic bezier point formula: P(t) = (1-t)^2*P0 + 2*(1-t)*t*P1 + t^2*P2
                const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * targetX;
                const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * targetY;

                this.ctx.save();
                this.ctx.setLineDash([]);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity + 0.3})`;
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = 'rgba(255, 255, 255, 1)';
                this.ctx.beginPath();
                this.ctx.arc(px, py, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            };

            // Draw lines to matched Reference Cards
            cardData.forEach(node => {
                if (node.words.has(word)) {
                    drawFlowLine(node.x, node.y, false);
                }
            });

            // Draw lines to matched Echo Documents (Semantic Depth Linking)
            if (this.echoTargets && this.echoTargets.length > 0) {
                this.ctx.shadowColor = 'rgba(0, 229, 255, 0.8)'; // Cyan glow for echoes
                this.echoTargets.forEach(rect => {
                    const tx = rect.left + rect.width / 2;
                    const ty = rect.top + rect.height / 2;

                    // Modify appearance based on depth and hovered state
                    // If not hovered (semantic link), use a thicker, brighter line
                    // If hovered, use the standard cyan line
                    const isSemantic = !rect.isHovered;

                    const dist = Math.hypot(tx - x, ty - y);
                    let opacity = Math.min(1.0, 1500 / (dist + 50));

                    if (isSemantic) {
                        // Depth-based opacity and thickness
                        const depthBonus = Math.max(0, 1 - (rect.depthIndex * 0.1));
                        opacity = Math.min(1.0, opacity + depthBonus * 0.3);
                        this.ctx.strokeStyle = `rgba(0, 255, 128, ${opacity})`; // Unique green/cyan color for semantic links
                        this.ctx.lineWidth = 2 + depthBonus;
                        this.ctx.shadowColor = 'rgba(0, 255, 128, 0.9)';
                    } else {
                        this.ctx.strokeStyle = `rgba(0, 229, 255, ${opacity})`;
                        this.ctx.lineWidth = 1.5;
                        this.ctx.shadowColor = 'rgba(0, 229, 255, 0.8)';
                    }

                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y);
                    const cx = (x + tx) / 2;
                    const cy = (y + ty) / 2 - 50;
                    this.ctx.quadraticCurveTo(cx, cy, tx, ty);
                    this.ctx.stroke();

                    // Data Flow animation
                    const flowTime = (time * (isSemantic ? 3 : 2)) % 1; // Faster data flow for semantic links
                    const t = flowTime; // t from 0 to 1

                    const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * tx;
                    const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ty;

                    this.ctx.save();
                    this.ctx.setLineDash([]);
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity + 0.3})`;
                    this.ctx.shadowBlur = isSemantic ? 20 : 15;
                    this.ctx.shadowColor = 'rgba(255, 255, 255, 1)';
                    this.ctx.beginPath();
                    this.ctx.arc(px, py, isSemantic ? 4 : 3, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.restore();
                });
            }

            // Draw Semantic 3D Threading between the echo targets themselves
            if (this.echoTargets && this.echoTargets.length > 1) {
                // We only thread echoes that are semantic (not just hovered)
                const semanticEchoes = this.echoTargets.filter(t => !t.isHovered);

                for (let i = 0; i < semanticEchoes.length; i++) {
                    for (let j = i + 1; j < semanticEchoes.length; j++) {
                        const a = semanticEchoes[i];
                        const b = semanticEchoes[j];

                        const ax = a.left + a.width / 2;
                        const ay = a.top + a.height / 2;
                        const bx = b.left + b.width / 2;
                        const by = b.top + b.height / 2;

                        const dist = Math.hypot(ax - bx, ay - by);
                        const opacity = Math.min(0.6, 800 / (dist + 50));

                        this.ctx.strokeStyle = `rgba(255, 0, 128, ${opacity})`; // Neon pink threads
                        this.ctx.lineWidth = 1.5;
                        this.ctx.shadowColor = 'rgba(255, 0, 128, 0.8)';
                        this.ctx.shadowBlur = 10;

                        this.ctx.beginPath();
                        this.ctx.moveTo(ax, ay);

                        // Bezier curve that droops slightly based on distance to simulate physical threads
                        const cx = (ax + bx) / 2;
                        const cy = ((ay + by) / 2) + Math.min(100, dist * 0.2);

                        this.ctx.quadraticCurveTo(cx, cy, bx, by);
                        this.ctx.stroke();

                        // Data packet along the thread
                        const flowTime = ((time * 1.5) + i * 0.3 + j * 0.7) % 1;
                        const px = (1 - flowTime) * (1 - flowTime) * ax + 2 * (1 - flowTime) * flowTime * cx + flowTime * flowTime * bx;
                        const py = (1 - flowTime) * (1 - flowTime) * ay + 2 * (1 - flowTime) * flowTime * cy + flowTime * flowTime * by;

                        this.ctx.save();
                        this.ctx.setLineDash([]);
                        this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity + 0.4})`;
                        this.ctx.shadowBlur = 15;
                        this.ctx.shadowColor = 'rgba(255, 255, 255, 1)';
                        this.ctx.beginPath();
                        this.ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.restore();
                    }
                }
            }

            // Reset
            this.ctx.setLineDash([]);
            this.ctx.shadowBlur = 0;
            this.ctx.shadowColor = 'transparent';
        }
    }

    drawRadar(time) {
        if (!this.radarCtx || !this.radarCanvas) return;

        const w = this.radarCanvas.width;
        const h = this.radarCanvas.height;
        this.radarCtx.clearRect(0, 0, w, h);

        if (!this.referenceManager) return;
        const cards = this.referenceManager.getCards();
        if (!cards || cards.length === 0) return;

        // Draw grid lines
        this.radarCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.radarCtx.lineWidth = 1;
        this.radarCtx.beginPath();
        this.radarCtx.moveTo(w/2, 0);
        this.radarCtx.lineTo(w/2, h);
        this.radarCtx.moveTo(0, h/2);
        this.radarCtx.lineTo(w, h/2);
        this.radarCtx.stroke();

        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            // Map screen coords to radar coords
            const rx = (rect.left / window.innerWidth) * w;
            const ry = (rect.top / window.innerHeight) * h;
            const rw = Math.max(2, (rect.width / window.innerWidth) * w);
            const rh = Math.max(2, (rect.height / window.innerHeight) * h);

            let color = 'rgba(255, 255, 255, 0.3)';
            if (card.classList.contains('matched-card')) {
                color = '#00e5ff';
            } else if (card.classList.contains('spotlight')) {
                color = '#ff0055';
            }

            this.radarCtx.fillStyle = color;
            this.radarCtx.fillRect(rx, ry, rw, rh);
        });

        // Draw Viewport "Scan" line
        const scanY = ((time * 0.2) % 1) * h;
        this.radarCtx.fillStyle = 'rgba(0, 229, 255, 0.1)';
        this.radarCtx.fillRect(0, scanY, w, 2);
    }
}
