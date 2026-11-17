/**
 * Holographic dust particles on `#dust-layer`, with mouse parallax and a
 * typing-driven drift speed. Drawn by the AppClock `dust` task (decorative
 * priority: skipped under low LOD).
 */
export class HoloDust {
  /**
   * @param {HTMLCanvasElement | null} canvas
   * @param {{ getIntensity?: () => number, count?: number }} [options]
   */
  constructor(canvas, { getIntensity = () => 1, count = 100 } = {}) {
    this.canvas = canvas;
    this.getIntensity = getIntensity;
    /** @type {CanvasRenderingContext2D | null} */
    this.ctx = null;
    /** @type {Array<{ x: number, y: number, size: number, speedX: number, speedY: number, opacity: number }>} */
    this.particles = [];
    this.count = count;
  }

  init() {
    if (!this.canvas) return this;
    this.ctx = this.canvas.getContext("2d");
    for (let i = 0; i < this.count; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }
    return this;
  }

  clear() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /** @param {number} time seconds */
  draw(time) {
    const { canvas, ctx } = this;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const body = document.body.style;
    const mxStr = body.getPropertyValue("--mouse-x");
    const myStr = body.getPropertyValue("--mouse-y");
    const mx = mxStr ? parseFloat(mxStr) : window.innerWidth / 2;
    const my = myStr ? parseFloat(myStr) : window.innerHeight / 2;
    const pX = mx / window.innerWidth - 0.5;
    const pY = my / window.innerHeight - 0.5;

    const intensity = this.getIntensity();
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = "#00e5ff";

    this.particles.forEach((p, i) => {
      p.x += p.speedX * intensity;
      p.y += p.speedY * intensity;

      const finalX = p.x - pX * 50 * ((i % 3) + 1);
      const finalY = p.y - pY * 50 * ((i % 3) + 1);

      if (p.x > window.innerWidth) p.x = 0;
      if (p.x < 0) p.x = window.innerWidth;
      if (p.y > window.innerHeight) p.y = 0;
      if (p.y < 0) p.y = window.innerHeight;

      ctx.globalAlpha = p.opacity + Math.sin(time * 0.002 + i) * 0.2; // twinkle
      ctx.beginPath();
      ctx.arc(finalX * dpr, finalY * dpr, p.size * dpr, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  }
}
