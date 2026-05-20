export class ConnectionManager {
  constructor(radarCanvas, radarCtx, referenceManager = null) {
    this.radarCanvas = radarCanvas;
    this.radarCtx = radarCtx;
    this.referenceManager = referenceManager;
  }

  drawRadar(time) {
    if (!this.radarCtx || !this.radarCanvas) return;

    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    this.radarCtx.clearRect(0, 0, w, h);

    // Draw concentric depth rings (holographic feel)
    this.radarCtx.strokeStyle = "rgba(0, 229, 255, 0.06)";
    this.radarCtx.lineWidth = 1;
    for (let r = 1; r <= 3; r++) {
      this.radarCtx.beginPath();
      this.radarCtx.arc(w / 2, h / 2, (w / 2) * (r / 3), 0, Math.PI * 2);
      this.radarCtx.stroke();
    }

    // Draw Reference Cards
    const cards = this.referenceManager ? this.referenceManager.getCards() : [];
    if (cards && cards.length > 0) {
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const rx = (rect.left / window.innerWidth) * w;
        const ry = (rect.top / window.innerHeight) * h;
        const rw = Math.max(2, (rect.width / window.innerWidth) * w);
        const rh = Math.max(2, (rect.height / window.innerHeight) * h);

        let color = "rgba(255, 255, 255, 0.3)";
        if (card.classList.contains("matched-card")) {
          color = "#00e5ff";
        } else if (card.classList.contains("spotlight")) {
          color = "#ff0055";
        }

        this.radarCtx.fillStyle = color;
        this.radarCtx.fillRect(rx, ry, rw, rh);
      });
    }

    // Draw Echo Documents as depth-linked blips
    const echoes = document.querySelectorAll(".echo-document");
    if (echoes.length > 0) {
      echoes.forEach((echo) => {
        const rect = echo.getBoundingClientRect();
        const rx = ((rect.left + rect.width / 2) / window.innerWidth) * w;
        const ry = ((rect.top + rect.height / 2) / window.innerHeight) * h;

        // Depth from tz CSS variable
        const tzVal = parseFloat(echo.style.getPropertyValue("--tz")) || 0;
        const depthNorm = Math.max(0, Math.min(1, -tzVal / 1000)); // 0 = front, 1 = deep back

        // Deep = dimmer, smaller, cooler (bluer)
        // Shallow = brighter, larger, warmer (cyan/white)
        const size = Math.max(1.5, 4 - depthNorm * 2.5);
        const brightness = 1 - depthNorm * 0.6;
        const r = Math.floor(100 + 155 * brightness);
        const g = Math.floor(180 + 75 * brightness);
        const b = Math.floor(255);
        const color = `rgba(${r}, ${g}, ${b}, ${0.3 + brightness * 0.7})`;

        this.radarCtx.fillStyle = color;
        this.radarCtx.beginPath();
        this.radarCtx.arc(rx, ry, size, 0, Math.PI * 2);
        this.radarCtx.fill();
      });
    }
  }

  drawConstellationLines(time) {
    if (!this.radarCtx || !this.radarCanvas) return;

    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;

    // We don't clearRect here because drawRadar might have just run.
    // However, if we run this independently, we might need to.
    // Assuming main.js handles clearRect or we just draw over the radar.

    const activeEditor = document.getElementById("editor");
    if (!activeEditor) return;

    const canvasRect = this.radarCanvas.getBoundingClientRect();
    const editorRect = activeEditor.getBoundingClientRect();

    const startX = editorRect.left + editorRect.width / 2 - canvasRect.left;
    const startY = editorRect.top + editorRect.height / 2 - canvasRect.top;

    const echoes = document.querySelectorAll(".echo-document");
    if (echoes.length === 0) return;

    echoes.forEach((echo) => {
      const sharedSymbolsStr = echo.style.getPropertyValue("--shared-symbols");
      const sharedSymbols = parseInt(sharedSymbolsStr);

      if (!sharedSymbols || sharedSymbols <= 0) return;

      const docRect = echo.getBoundingClientRect();
      const endX = docRect.left + docRect.width / 2 - canvasRect.left;
      const endY = docRect.top + docRect.height / 2 - canvasRect.top;

      // Holographic Visuals
      const intensity = Math.min(1, sharedSymbols / 10);
      const dashOffset = -time * 0.05;

      this.radarCtx.save();

      // Outer Glow
      this.radarCtx.beginPath();
      this.radarCtx.moveTo(startX, startY);
      this.radarCtx.lineTo(endX, endY);
      this.radarCtx.strokeStyle = `rgba(0, 229, 255, ${0.2 + intensity * 0.3})`;
      this.radarCtx.lineWidth = 2 + intensity * 4;
      this.radarCtx.shadowColor = "#00e5ff";
      this.radarCtx.shadowBlur = 10;
      this.radarCtx.stroke();

      // Inner Core
      this.radarCtx.beginPath();
      this.radarCtx.moveTo(startX, startY);
      this.radarCtx.lineTo(endX, endY);
      this.radarCtx.strokeStyle = `rgba(255, 255, 255, ${0.5 + intensity * 0.5})`;
      this.radarCtx.lineWidth = 1 + intensity;
      this.radarCtx.setLineDash([5, 10]);
      this.radarCtx.lineDashOffset = dashOffset;
      this.radarCtx.stroke();

      this.radarCtx.restore();
    });
  }

}
