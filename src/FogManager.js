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
    // Slowly add fog back
    // We want a very subtle accumulation
    // Save context state
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    // Use a very low opacity white to simulate condensation building up
    this.ctx.fillStyle = 'rgba(240, 245, 255, 0.008)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  clearFog(x, y, radius) {
    const rect = this.container.getBoundingClientRect();
    const relX = x - rect.left;
    const relY = y - rect.top;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(relX, relY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Add a softer edge (optional, but multiple passes with different radii look better)
    this.ctx.beginPath();
    this.ctx.arc(relX, relY, radius * 1.2, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Partial clear
    this.ctx.fill();

    this.ctx.restore();
  }
}
