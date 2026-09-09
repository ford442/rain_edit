/**
 * Depth-scanning tools: the Alt+wheel holographic depth cursor, the hold-B
 * depth beam, and the archway/Alt+wheel depth slicer. Extracted from the
 * original single-file EchoDocumentInteractions.js purely to keep file size
 * down; each feature is independent and order does not affect behavior.
 */
export function initDepthCursor(im) {
// Holographic Depth Cursor Logic
window.cursorZDepth = 0;
let depthCursorEl = document.getElementById("holographic-depth-cursor");

document.addEventListener("wheel", (e) => {
  if (e.altKey && !e.shiftKey && !e.ctrlKey) {
    e.preventDefault();

    if (!depthCursorEl) {
      depthCursorEl = document.createElement("div");
      depthCursorEl.id = "holographic-depth-cursor";
      document.body.appendChild(depthCursorEl);
      document.body.classList.add("depth-cursor-active");
    }

    // Adjust depth based on scroll (invert so scrolling down goes "deeper" / more negative)
    window.cursorZDepth -= e.deltaY * 0.5;

    // Clamp or let it go deep? Let's clamp between 500 and -5000
    if (window.cursorZDepth > 500) window.cursorZDepth = 500;
    if (window.cursorZDepth < -5000) window.cursorZDepth = -5000;

    depthCursorEl.style.setProperty("--cursor-tz", `${window.cursorZDepth}px`);

    // Throttle intersection checks for performance
    if (window.depthCursorThrottle) clearTimeout(window.depthCursorThrottle);
    window.depthCursorThrottle = setTimeout(() => {
      // Check intersection with echo-documents
      const echoes = document.querySelectorAll(".echo-document");
      echoes.forEach(doc => {
        // Get the document's computed --tz value
        const tzStr = doc.style.getPropertyValue("--tz");
        if (tzStr) {
          const match = tzStr.match(/-?\d+/);
          if (match) {
            const docZ = parseFloat(match[0]);

            // If within 150px depth, count as a hit
            if (Math.abs(docZ - window.cursorZDepth) < 150) {
              doc.classList.add("depth-cursor-hit");
              // Play a very subtle audio cue if it just entered the hit zone
              if (!doc.dataset.depthHitPlayed && window.AudioContext) {
                doc.dataset.depthHitPlayed = "true";
                try {
                  const ctx = new (window.AudioContext || window.webkitAudioContext)();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = "sine";
                  osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
                  gain.gain.setValueAtTime(0.01, ctx.currentTime); // Very low volume
                  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.1);
                } catch(e) {}
              }
            } else {
              doc.classList.remove("depth-cursor-hit");
              delete doc.dataset.depthHitPlayed;
            }
          }
        }
      });
    }, 50); // 50ms debounce
  }
}, { passive: false });

document.addEventListener("mousemove", (e) => {
  if (depthCursorEl && document.body.classList.contains("depth-cursor-active")) {
    depthCursorEl.style.setProperty("--cursor-x", `${e.clientX}px`);
    depthCursorEl.style.setProperty("--cursor-y", `${e.clientY}px`);
  }
});

// Depth cursor is created by the Alt+wheel handler above; this binding tears it
// down when Alt is released. allowInEditor so it still cleans up if focus moved.
im.register({
  id: "depth-cursor",
  category: "depth",
  description: "Alt + scroll depth cursor",
  combo: { key: "Alt" },
  type: "hold",
  preventDefault: false,
  allowInEditor: true,
  onUp: () => {
    if (depthCursorEl) {
      depthCursorEl.remove();
      depthCursorEl = null;
    }
    document.body.classList.remove("depth-cursor-active");
    document
      .querySelectorAll(".echo-document")
      .forEach((doc) => doc.classList.remove("depth-cursor-hit"));
  },
});

window.addEventListener("blur", () => {
  if (depthCursorEl) {
    depthCursorEl.remove();
    depthCursorEl = null;
  }
  document.body.classList.remove("depth-cursor-active");
  const echoes = document.querySelectorAll(".echo-document");
  echoes.forEach(doc => doc.classList.remove("depth-cursor-hit"));
});
}

export function initDepthBeam(im) {
// Depth Beam (hold B) — guarded so it never fires while typing.
im.register({
  id: "depth-beam",
  category: "depth",
  description: "Depth beam (hold B)",
  combo: { key: "b" },
  type: "hold",
  preventDefault: false,
  onDown: () => document.body.classList.add("depth-beam-active"),
  onUp: () => {
    document.body.classList.remove("depth-beam-active");
    if (echoLayerEl) {
      echoLayerEl
        .querySelectorAll(".echo-document")
        .forEach((echo) => echo.classList.remove("depth-beam-intersect"));
    }
  },
});

document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("depth-beam-active")) {
    const beam = document.getElementById("depth-beam");
    if (beam) {
      const mx = e.clientX;
      const my = e.clientY;
      beam.style.left = `${mx - 150}px`; // Center the 300x300 radial gradient
      beam.style.top = `${my - 150}px`;
      beam.style.width = "300px";
      beam.style.height = "300px";
      beam.style.transform = `translateZ(500px)`; // visually floating
    }

    if (echoLayerEl) {
      const echoes = echoLayerEl.querySelectorAll(".echo-document");
      echoes.forEach((echo) => {
        const rect = echo.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.sqrt(
          Math.pow(e.clientX - cx, 2) + Math.pow(e.clientY - cy, 2),
        );

        if (dist < 150) {
          echo.classList.add("depth-beam-intersect");
        } else {
          echo.classList.remove("depth-beam-intersect");
        }
      });
    }
  }
});
}

export function initArchwayAndDepthSlicer(im) {
window.archScrollOffset = 0;

document.addEventListener("wheel", (e) => {
  if (document.body.classList.contains("archway-active") && e.altKey) {
    e.preventDefault();
    const delta = e.deltaY;
    window.archScrollOffset += delta * 0.005; // Base scroll speed
    if (window.tabManager && window.tabManager.isArchwayView) {
        window.tabManager._renderEchoes();
    }
  }
}, { passive: false });

// Depth Slicer Logic (Alt + Scroll)
window.__depthSliceIndex = 0;
im.register({
  id: "depth-slice",
  category: "depth",
  description: "Depth slicer (hold Alt + scroll)",
  combo: { key: "Alt" },
  type: "hold",
  preventDefault: false,
  allowInEditor: true,
  onDown: () => {
    document.body.classList.add("depth-slice-active");
    updateDepthSlicer();
  },
  onUp: () => {
    document.body.classList.remove("depth-slice-active");
    if (window.echoLayerEl) {
      window.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
        doc.classList.remove("depth-slice-hidden");
        doc.classList.remove("depth-slice-focus");
      });
    }
  },
});

document.addEventListener("wheel", (e) => {
  if (e.altKey && !document.body.classList.contains("archway-active")) {
    e.preventDefault();
    if (e.deltaY > 0) {
      window.__depthSliceIndex++;
    } else {
      window.__depthSliceIndex = Math.max(0, window.__depthSliceIndex - 1);
    }
    updateDepthSlicer();
  }
}, { passive: false });

function updateDepthSlicer() {
  if (!document.body.classList.contains("depth-slice-active")) return;
  if (window.echoLayerEl) {
    const echoes = Array.from(window.echoLayerEl.querySelectorAll(".echo-document"));
    // Limit max slice index to number of background documents
    window.__depthSliceIndex = Math.min(window.__depthSliceIndex, Math.max(0, echoes.length - 1));

    echoes.forEach((doc, i) => {
      doc.classList.remove("depth-slice-hidden", "depth-slice-focus");
      if (i < window.__depthSliceIndex) {
        doc.classList.add("depth-slice-hidden");
      } else if (i === window.__depthSliceIndex) {
        doc.classList.add("depth-slice-focus");
      }
    });
  }
}
}
