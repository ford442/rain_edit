const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?";

/**
 * Matrix glyph rain on `#matrix-layer`. Drawn by the AppClock `matrix` task
 * (decorative priority: skipped under low LOD).
 */
export class MatrixRain {
  /** @param {HTMLCanvasElement | null} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    /** @type {CanvasRenderingContext2D | null} */
    this.ctx = null;
    /** @type {number[]} */
    this.cols = [];
    this.enabled = true;
  }

  /** Re-derive the column set after the canvas was resized. */
  resize() {
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    const fontSize = 16 * (window.devicePixelRatio || 1);
    const columns = Math.floor(this.canvas.width / fontSize);
    // Re-seed only when the column count changed significantly.
    if (this.cols.length === 0 || Math.abs(this.cols.length - columns) > 5) {
      this.cols = [];
      for (let i = 0; i < columns; i++) this.cols[i] = Math.random() * -100;
    }
  }

  clear() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  draw() {
    const { canvas, ctx } = this;
    if (!canvas || !ctx || !this.enabled) return;

    const fontSize = 16 * (window.devicePixelRatio || 1);
    // Semi-transparent black wash creates the fading trail.
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = fontSize + 'px "JetBrains Mono", monospace';
    ctx.textAlign = "center";

    for (let i = 0; i < this.cols.length; i++) {
      const text = GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
      const x = i * fontSize + fontSize / 2;
      const y = this.cols[i] * fontSize;

      const hue = 160 + Math.random() * 40; // cyan/green
      const lightness = 40 + Math.random() * 40;
      ctx.fillStyle = Math.random() > 0.95 ? "#fff" : `hsl(${hue}, 100%, ${lightness}%)`;
      ctx.fillText(text, x, y);

      if (y > canvas.height && Math.random() > 0.975) this.cols[i] = 0;
      this.cols[i] += 0.5 + Math.random() * 0.5;
    }
  }
}
