export class HolographicMinimap {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.radarAngle = 0;
    this.rafId = null;
    this.active = true;

    // Start animation loop
    this.render = this.render.bind(this);
    this.rafId = requestAnimationFrame(this.render);
  }

  render() {
    if (!this.active) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear canvas with slight fade for trail effect
    this.ctx.fillStyle = "rgba(10, 15, 25, 0.3)";
    this.ctx.fillRect(0, 0, w, h);

    // Draw holographic grid
    this.ctx.strokeStyle = "rgba(0, 229, 255, 0.1)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let i = 0; i < w; i += 20) {
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, h);
    }
    for (let i = 0; i < h; i += 20) {
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(w, i);
    }
    this.ctx.stroke();

    // Draw documents
    const docs = document.querySelectorAll(".echo-document, #editor");
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    docs.forEach((doc) => {
      const rect = doc.getBoundingClientRect();
      const zIndex = window.getComputedStyle(doc).zIndex;
      const isMain = doc.id === "editor";

      const x = (rect.left / winW) * w;
      const y = (rect.top / winH) * h;
      const docW = (rect.width / winW) * w;
      const docH = (rect.height / winH) * h;

      const depth = isMain ? 100 : parseInt(zIndex) || 0;

      // Map depth to opacity/color
      const opacity = Math.min(1, Math.max(0.2, (depth + 50) / 100));

      if (isMain) {
        this.ctx.fillStyle = `rgba(0, 255, 170, ${opacity})`;
        this.ctx.strokeStyle = `rgba(0, 255, 170, 1)`;
      } else {
        this.ctx.fillStyle = `rgba(0, 229, 255, ${opacity * 0.5})`;
        this.ctx.strokeStyle = `rgba(0, 229, 255, ${opacity})`;
      }

      this.ctx.fillRect(x, y, docW, docH);
      this.ctx.strokeRect(x, y, docW, docH);
    });

    // Draw radar sweep
    this.radarAngle += 0.05;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.max(w, h);

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(this.radarAngle);

    const gradient = this.ctx.createLinearGradient(0, 0, radius, 0);
    gradient.addColorStop(0, "rgba(0, 229, 255, 0.8)");
    gradient.addColorStop(1, "rgba(0, 229, 255, 0)");

    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.arc(0, 0, radius, 0, 0.2);
    this.ctx.closePath();
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Sweep line
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(radius, 0);
    this.ctx.strokeStyle = "rgba(0, 229, 255, 0.8)";
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.restore();

    this.rafId = requestAnimationFrame(this.render);
  }

  destroy() {
    this.active = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}
