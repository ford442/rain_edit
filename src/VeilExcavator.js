import { inputManager } from "./interactions/InputManager.js";

export class VeilExcavator {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.isActive = false;
    this.isBrushing = false;
    this.maskCanvas = document.createElement("canvas");
    this.maskCtx = this.maskCanvas.getContext("2d");
    this.brushSize = 80;
    this.particles = [];

    // We'll overlay the mask canvas full screen to capture brush strokes,
    // then sync it to a CSS variable or directly use canvas mix-blend-mode for the echo layer.
    // Alternatively, since CSS mask-image can take an SVG/URL, we can update a CSS variable
    // or inject a mask style. Let's use a canvas element over the screen when active,
    // generate the mask, and apply it as a CSS mask via data URL.

    // A better DOM approach: we apply `mask-image: radial-gradient` on individual elements.
    // However, the criteria says: "Interactive brushing mechanic... progressive reveal... GPU-friendly accumulation mask".
    // Use an offscreen canvas at a lower resolution for performance to avoid lag on toDataURL.
    // CSS will stretch it back to cover the screen.
    this.scaleFactor = 0.25;

    this.maskCanvas.style.display = "none"; // Kept purely offscreen

    // Resize handler
    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();

    // Throttle for toDataURL
    this.lastUpdate = 0;
    this.updateRAF = null;

    // Clear mask initially
    this.clearMask();

    // Event listeners
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);

    // Toggle registered through the shared dispatcher; requires a bare "v" (no
    // modifiers) so it no longer collides with Alt+Shift+V peel reveal, and is
    // guarded so it never fires while typing.
    if (inputManager && !inputManager.bindings.has("veil-excavator")) {
      inputManager.register({
        id: "veil-excavator",
        category: "reveal",
        description: "Veil excavator brush (V)",
        combo: { key: "v" },
        type: "action",
        preventDefault: false,
        onDown: () => this.toggle(),
      });
    }
    window.addEventListener("pointerdown", this.handlePointerDown);
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("pointerleave", this.handlePointerLeave);
  }

  resize() {
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.maskCanvas.width = Math.max(
      1,
      Math.floor(this.screenWidth * this.scaleFactor),
    );
    this.maskCanvas.height = Math.max(
      1,
      Math.floor(this.screenHeight * this.scaleFactor),
    );
    this.clearMask();
  }

  clearMask() {
    this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    // Fill with semi-transparent black. Alpha channel controls the mask.
    // Low alpha = obscured. High alpha = revealed.
    this.maskCtx.fillStyle = "rgba(0, 0, 0, 0.15)";
    this.maskCtx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    this.updateMaskCSS(true);
  }

  toggle() {
    this.isActive = !this.isActive;

    if (this.isActive) {
      document.body.classList.add("veil-excavator-active");
      this.clearMask();
      this.showExcavationUI();
    } else {
      document.body.classList.remove("veil-excavator-active");
      this.clearMask();
      this.hideExcavationUI();
    }
  }

  showExcavationUI() {
    if (!this.uiEl) {
      this.uiEl = document.createElement("div");
      this.uiEl.className = "veil-excavator-ui";
      this.uiEl.innerHTML = `<span>VEIL EXCAVATOR ACTIVE</span><br><small>Click and drag to reveal. Click revealed document to jump.</small>`;
      document.body.appendChild(this.uiEl);
    }
    this.uiEl.style.display = "block";
  }

  hideExcavationUI() {
    if (this.uiEl) {
      this.uiEl.style.display = "none";
    }
  }

  handleKeyDown(e) {
    if (e.key.toLowerCase() === "v") {
      // Toggle
      if (
        e.ctrlKey ||
        e.metaKey ||
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        // only toggle if not typing in editor
        if (
          document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA"
        )
          return;
        this.toggle();
      }
    }
  }

  handlePointerDown(e) {
    if (!this.isActive) return;
    this.isBrushing = true;
    this.brush(e.clientX, e.clientY);
  }

  handlePointerMove(e) {
    if (!this.isActive) return;
    if (this.isBrushing) {
      this.brush(e.clientX, e.clientY);
    }
  }

  handlePointerUp(e) {
    if (!this.isActive) return;
    this.isBrushing = false;

    // Raycast / Code Jump logic
    // If we click without brushing much, and it's on a revealed area, we jump.
    this.checkRevealClick(e.clientX, e.clientY);
  }

  handlePointerLeave(e) {
    this.isBrushing = false;
  }

  brush(x, y) {
    const scaledX = x * this.scaleFactor;
    const scaledY = y * this.scaleFactor;
    const scaledRadius = this.brushSize * this.scaleFactor;

    // Draw an opaque soft radial gradient to "reveal" the document (make alpha = 1)
    const gradient = this.maskCtx.createRadialGradient(
      scaledX,
      scaledY,
      0,
      scaledX,
      scaledY,
      scaledRadius,
    );
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    this.maskCtx.globalCompositeOperation = "source-over"; // Add opacity
    this.maskCtx.fillStyle = gradient;
    this.maskCtx.beginPath();
    this.maskCtx.arc(scaledX, scaledY, scaledRadius, 0, Math.PI * 2);
    this.maskCtx.fill();

    this.updateMaskCSS();
    this.emitParticles(x, y);
  }

  updateMaskCSS(force = false) {
    if (!this.isActive) {
      document.documentElement.style.removeProperty("--veil-mask-url");
      return;
    }

    // Throttle toDataURL calls to ~30fps max to avoid jank
    const now = performance.now();
    if (!force && now - this.lastUpdate < 32) {
      if (!this.updateRAF) {
        this.updateRAF = requestAnimationFrame(() => {
          this.updateRAF = null;
          this.updateMaskCSS(true);
        });
      }
      return;
    }
    this.lastUpdate = now;

    // Fast generation
    const dataUrl = this.maskCanvas.toDataURL("image/webp", 0.5);
    document.documentElement.style.setProperty(
      "--veil-mask-url",
      `url(${dataUrl})`,
    );
  }

  emitParticles(x, y) {
    // Phase 2: Particle FX
    for (let i = 0; i < 3; i++) {
      const p = document.createElement("div");
      p.className = "excavator-particle";
      p.style.left = x + "px";
      p.style.top = y + "px";

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 20 + 10;
      const tx = Math.cos(angle) * speed;
      const ty = Math.sin(angle) * speed;

      p.style.setProperty("--tx", tx + "px");
      p.style.setProperty("--ty", ty + "px");

      document.body.appendChild(p);

      setTimeout(() => {
        if (p.parentNode) p.parentNode.removeChild(p);
      }, 800);
    }
  }

  checkRevealClick(x, y) {
    // Phase 3: Raycast to find the element
    // Read the scaled mask canvas to see if the region is revealed
    const scaledX = Math.floor(x * this.scaleFactor);
    const scaledY = Math.floor(y * this.scaleFactor);
    const pixel = this.maskCtx.getImageData(scaledX, scaledY, 1, 1).data;
    const alpha = pixel[3]; // We draw opaque black to reveal, so high alpha = revealed.

    // If mostly revealed (alpha > 200)
    if (alpha > 200) {
      // Temporarily remove the veil excavator active class to restore pointer-events to echo-documents
      document.body.classList.remove("veil-excavator-active");

      // Find the echo-document under the cursor
      const els = document.elementsFromPoint(x, y);

      // Re-apply the class immediately after capturing elements
      document.body.classList.add("veil-excavator-active");

      for (const el of els) {
        if (el.classList.contains("echo-document")) {
          // Trigger jump
          const index = parseInt(el.dataset.index, 10);
          if (!isNaN(index)) {
            // Let's create an effect then focus
            el.classList.add("excavator-flash");
            setTimeout(() => {
              el.classList.remove("excavator-flash");
              if (this.tabManager) {
                this.tabManager.setActive(el.dataset.id);
                // Optional: turn off excavator
                this.toggle();
              }
            }, 300);
          }
          break;
        }
      }
    }
  }
}
