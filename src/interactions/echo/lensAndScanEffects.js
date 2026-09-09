/**
 * X-ray lens (Ctrl+Alt+X), neon trace scanner (Alt+S), magnetic repulsion
 * field (hold M), and layer peek glass (Alt+K). Extracted from the
 * original single-file EchoDocumentInteractions.js purely to keep file
 * size down; each feature is independent and order does not affect
 * behavior.
 */
export function initLensAndScanEffects(im) {
// X-Ray Lens Interaction (Ctrl+Alt+X toggle)
im.register({
  id: "xray-lens",
  category: "lens",
  description: "X-ray lens (Ctrl+Alt+X)",
  combo: { ctrl: true, alt: true, code: "KeyX" },
  type: "toggle",
  onDown: (e) => {
    document.body.classList.add("xray-lens-active");
    const echoLayer = document.getElementById("echo-layer");
    if (echoLayer) {
      echoLayer.querySelectorAll(".echo-document").forEach((doc) => {
        const rect = doc.getBoundingClientRect();
        doc.style.setProperty("--xray-local-x", `${e.clientX - rect.left}px`);
        doc.style.setProperty("--xray-local-y", `${e.clientY - rect.top}px`);
      });
    }
  },
  onUp: () => document.body.classList.remove("xray-lens-active"),
});

document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("xray-lens-active")) {
    const echoLayer = document.getElementById("echo-layer");
    if (echoLayer) {
      echoLayer.querySelectorAll(".echo-document").forEach((doc) => {
          const rect = doc.getBoundingClientRect();
          doc.style.setProperty("--xray-local-x", `${e.clientX - rect.left}px`);
          doc.style.setProperty("--xray-local-y", `${e.clientY - rect.top}px`);
      });
    }
  }
});

// Neon Trace Scanner (Alt + S)
let isTraceScannerActive = false;
let traceScannerRaf = null;
let traceScannerY = 0;
let traceScannerVelocity = 15;
let traceScannerEl = null;

im.register({
  id: "neon-trace",
  category: "effects",
  description: "Neon trace scanner (Alt+S)",
  combo: { alt: true, code: "KeyS" },
  type: "action",
  onDown: () => {
    if (isTraceScannerActive) return;
    isTraceScannerActive = true;
    document.body.classList.add("trace-scanner-active");

    if (!traceScannerEl) {
      traceScannerEl = document.createElement("div");
      traceScannerEl.id = "trace-scanner-line";
      document.body.appendChild(traceScannerEl);
    }

    traceScannerEl.style.display = "block";
    traceScannerY = -100;

    const scanLoop = () => {
      if (!isTraceScannerActive) return;

      traceScannerY += traceScannerVelocity;
      traceScannerEl.style.transform = `translateY(${traceScannerY}px)`;

      // Hit detection
      if (window.echoLayerEl) {
        window.echoLayerEl.querySelectorAll(".echo-document").forEach(doc => {
          const rect = doc.getBoundingClientRect();
          // Check if scanline intersects with document bounding box
          if (traceScannerY > rect.top && traceScannerY < rect.bottom) {
            doc.classList.add("trace-hit");
            doc.style.setProperty("--trace-y-percent", `${((traceScannerY - rect.top) / rect.height) * 100}%`);
          } else {
            doc.classList.remove("trace-hit");
          }
        });
      }

      if (traceScannerY > window.innerHeight + 100) {
        // Reset or finish
        isTraceScannerActive = false;
        document.body.classList.remove("trace-scanner-active");
        traceScannerEl.style.display = "none";
        if (window.echoLayerEl) {
          window.echoLayerEl.querySelectorAll(".echo-document").forEach(doc => {
            doc.classList.remove("trace-hit");
          });
        }
      } else {
        traceScannerRaf = requestAnimationFrame(scanLoop);
      }
    };

    traceScannerRaf = requestAnimationFrame(scanLoop);
  },
});

// Magnetic Repulsion Field (Hold M) — guarded against editor typing.
let isMagneticRepulsionActive = false;
im.register({
  id: "magnetic-repulsion",
  category: "effects",
  description: "Magnetic repulsion field (hold M)",
  combo: { key: "m" },
  type: "hold",
  preventDefault: false,
  onDown: () => {
    if (!isMagneticRepulsionActive) {
      isMagneticRepulsionActive = true;
      document.body.classList.add("magnetic-repulsion-active");
    }
  },
  onUp: () => {
    isMagneticRepulsionActive = false;
    document.body.classList.remove("magnetic-repulsion-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        doc.style.removeProperty("--repulse-tx");
        doc.style.removeProperty("--repulse-ty");
        doc.style.removeProperty("--repulse-rot");
      });
    }
  },
});

document.addEventListener("mousemove", (e) => {
  if (isMagneticRepulsionActive && window.echoLayerEl) {
    const echoes = window.echoLayerEl.querySelectorAll(".echo-document");
    const maxDist = 300;
    echoes.forEach(doc => {
      const rect = doc.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.sqrt((cx - e.clientX)**2 + (cy - e.clientY)**2);

      if (dist < maxDist) {
        const force = Math.pow(1 - dist / maxDist, 2);
        const dx = cx - e.clientX;
        const dy = cy - e.clientY;
        const pushX = (dx / (dist || 1)) * force * 150;
        const pushY = (dy / (dist || 1)) * force * 150;
        const rot = (dx / (dist || 1)) * force * 15;

        doc.style.setProperty("--repulse-tx", `${pushX}px`);
        doc.style.setProperty("--repulse-ty", `${pushY}px`);
        doc.style.setProperty("--repulse-rot", `${rot}deg`);
      } else {
        doc.style.setProperty("--repulse-tx", `0px`);
        doc.style.setProperty("--repulse-ty", `0px`);
        doc.style.setProperty("--repulse-rot", `0deg`);
      }
    });
  }
});

// Layer Peek Glass (Alt+K)
im.register({
  id: "layer-peek-glass",
  category: "lens",
  description: "Layer peek glass (Alt+K)",
  combo: { alt: true, code: "KeyK" },
  type: "hold",
  onDown: () => document.body.classList.add("layer-peek-glass-active"),
  onUp: () => {
    document.body.classList.remove("layer-peek-glass-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        doc.classList.remove("peek-focus");
        doc.style.removeProperty("--peek-x");
        doc.style.removeProperty("--peek-y");
      });
    }
  },
});

document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("layer-peek-glass-active")) {
    // Find the topmost document under cursor that isn't the editor
    let target = document.elementFromPoint(e.clientX, e.clientY);
    let echoDoc = target ? target.closest(".echo-document") : null;

    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach(doc => {
        if (doc === echoDoc) {
          doc.classList.add("peek-focus");
        } else {
          doc.classList.remove("peek-focus");
          const rect = doc.getBoundingClientRect();
          doc.style.setProperty("--peek-x", `${e.clientX - rect.left}px`);
          doc.style.setProperty("--peek-y", `${e.clientY - rect.top}px`);
        }
      });
    }
  }
});
}
