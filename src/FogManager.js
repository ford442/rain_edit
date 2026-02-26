export class FogManager {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    // Initial fill
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Start foggy
    this.ctx.fillRect(0, 0, rect.width, rect.height);
  }

  render() {
    // Slowly add fog back with noise
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';

    // Fill with very low opacity white/blue
    // Reduced opacity to 0.001 to slow down accumulation (approx 10s to full opacity)
    this.ctx.fillStyle = 'rgba(240, 245, 255, 0.001)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Add noise grain
    // We draw random tiny pixels to simulate organic condensation
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;
        const s = Math.random() * 2 + 1;
        this.ctx.fillStyle = `rgba(255, 255, 255, 0.05)`;
        this.ctx.fillRect(x, y, s, s);
    }

    this.ctx.restore();
  }

  clearFogAt(x, y, radius) {
    if (!this.ctx) return;
    const rect = this.container.getBoundingClientRect();
    const relX = x - rect.left;
    const relY = y - rect.top;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';

    // Main clear
    this.ctx.beginPath();
    this.ctx.arc(relX, relY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Soft edge
    this.ctx.beginPath();
    this.ctx.arc(relX, relY, radius * 1.3, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.fill();

    // Irregularities (droplets running)
    // Random chance to clear a "drip" downwards
    if (Math.random() < 0.3) {
        this.ctx.beginPath();
        this.ctx.moveTo(relX, relY + radius);
        this.ctx.lineTo(relX + (Math.random() - 0.5) * 10, relY + radius + 20 + Math.random() * 30);
        this.ctx.lineWidth = 5;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
        this.ctx.stroke();
    }

    this.ctx.restore();
  }
}
