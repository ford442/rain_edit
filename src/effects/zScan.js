/**
 * Z-scan: sweeps `#z-scanner-plane` from z=+200 to z=-2000 over ~4s and
 * flashes each echo document (`.z-scan-hit`) as the plane passes its depth.
 * Bound to the dock's `#btn-z-scan`.
 * @param {{ doc?: Document, stackZ?: number }} [deps]
 */
export function triggerZScan({ doc = document, stackZ = 0 } = {}) {
  const scannerPlane = doc.getElementById("z-scanner-plane");
  if (!scannerPlane) return;

  scannerPlane.classList.remove("scanning");
  void scannerPlane.offsetWidth; // restart the CSS animation
  scannerPlane.classList.add("scanning");

  doc.querySelectorAll(".echo-document").forEach((node) => {
    const echo = /** @type {HTMLElement} */ (node);
    let z = 0;
    const tzStyle = echo.style.getPropertyValue("--tz");
    if (tzStyle && tzStyle.includes("px")) {
      const match = tzStyle.match(/(-?\d+)/);
      if (match && !tzStyle.includes("calc")) {
        z = parseInt(match[0], 10);
      } else {
        const idx = parseInt(echo.dataset.index || "0", 10);
        z = -(idx * 50) + stackZ; // approximation
      }
    }

    // The plane covers 2200px of depth in ~3800ms.
    let delayMs = ((200 - z) / 2200) * 3800;
    if (delayMs < 0) delayMs = 100;
    if (delayMs > 4000) delayMs = 4000;

    setTimeout(() => {
      echo.classList.add("z-scan-hit");
      echo.style.setProperty("--scan-temp-color", "rgba(255, 0, 128, 1)");
      setTimeout(() => echo.classList.remove("z-scan-hit"), 800);
    }, delayMs);
  });

  setTimeout(() => scannerPlane.classList.remove("scanning"), 4500);
}
