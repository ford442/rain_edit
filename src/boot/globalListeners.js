/**
 * Window/document listeners that bridge DOM events to the rain, fog, ghost
 * mode, portals, and sonar. Echo-document gestures live in
 * `src/interactions/`; this file holds only the app-shell glue.
 *
 * @param {{
 *   win?: Window,
 *   doc?: Document,
 *   editorEl: HTMLElement,
 *   rainScene: import("../rain/RainScene.js").RainScene,
 *   fogManager: any,
 *   focusDepth: import("../effects/FocusDepth.js").FocusDepth,
 *   portals: import("../effects/PortalMasks.js").PortalMasks,
 *   sonar: import("../effects/Sonar.js").Sonar,
 *   onResize: () => void,
 *   onCabinetFile: (e: CustomEvent) => void,
 * }} deps
 */
export function bindGlobalListeners(deps) {
  const { editorEl, rainScene, fogManager, focusDepth, portals, sonar } = deps;
  const win = deps.win || window;
  const doc = deps.doc || document;
  const effects = rainScene.effects;

  win.addEventListener("fileCubeClicked", /** @type {EventListener} */ (deps.onCabinetFile));

  win.addEventListener("resize", () => {
    deps.onResize();
    // Gravity-pulled UI recomputes its resting rects lazily.
    const dockEl = /** @type {any} */ (doc.getElementById("dock"));
    const tabsEl = /** @type {any} */ (doc.getElementById("tabs-container"));
    if (dockEl) dockEl._origRect = null;
    if (tabsEl) tabsEl._origRect = null;
    portals.update();
  });

  win.addEventListener("cabinet-rain-clear", (/** @type {any} */ e) => {
    effects.addClear(e.detail.x, e.detail.y, e.detail.r, 3);
  });
  win.addEventListener("cabinet-rain-splash", (/** @type {any} */ e) => {
    const { x, y, r } = e.detail;
    effects.addClear(x, y, r, 40); // long-lived clear at the impact radius
    const drops = rainScene.raindrops;
    if (drops) {
      drops.splash(x, y, 14);
      // Concentric rings pushed directly (bypassing de-dup) decay outward.
      effects.clears.push({ x, y, r: r * 0.28, life: 12 });
      effects.clears.push({ x, y, r: r * 0.52, life: 8 });
      effects.clears.push({ x, y, r: r * 0.76, life: 5 });
    }
  });

  doc.addEventListener("echo-peek", (/** @type {any} */ e) => {
    if (!fogManager || !e.detail) return;
    const radius = e.detail.radius || 120;
    fogManager.clearFogAt(e.detail.x, e.detail.y, radius, e.detail.isFocusSpotlight);
    if (e.detail.isFocusSpotlight && rainScene.raindrops) {
      rainScene.raindrops.clearDroplets(e.detail.x, e.detail.y, radius);
    }
  });
  doc.addEventListener("document-splash", (/** @type {any} */ e) => {
    if (rainScene.raindrops && e.detail) rainScene.raindrops.splash(e.detail.x, e.detail.y, 15);
  });

  // Clicking outside an echo clears any holo projection.
  doc.addEventListener("mousedown", (e) => {
    const target = /** @type {Element} */ (e.target);
    if (target.closest && target.closest(".echo-document")) return;
    doc.querySelectorAll("#echo-layer .holo-projected").forEach((el) => el.classList.remove("holo-projected"));
  });

  // Any activity restarts the ghost timer and drops the idle blur.
  ["mousemove", "keydown", "mousedown", "wheel"].forEach((type) => {
    win.addEventListener(type, () => {
      focusDepth.noteActivity();
      if (focusDepth.depth < 0.1) editorEl.style.filter = "none";
    });
  });

  // Double-tap Shift → sonar (timing chord, so not an InputManager combo).
  let lastShiftTime = 0;
  doc.addEventListener("keydown", (e) => {
    if (e.key !== "Shift") return;
    const now = Date.now();
    if (now - lastShiftTime < 300) sonar.trigger();
    lastShiftTime = now;
  });

  // Reveal-mode classes change on key events; refresh portal masks next frame.
  doc.addEventListener("keydown", portals.requestUpdate);
  doc.addEventListener("keyup", portals.requestUpdate);
  doc.addEventListener("mousemove", () => {
    if (portals.needsPointerUpdates) portals.update();
  });

  // Dark-glass highlight angle + fabric-tear reveal speed from cursor velocity.
  let lastTear = /** @type {{ t: number, x: number, y: number } | null} */ (null);
  doc.addEventListener("mousemove", (e) => {
    const normX = e.clientX / win.innerWidth - 0.5;
    const normY = e.clientY / win.innerHeight - 0.5;
    doc.documentElement.style.setProperty("--highlight-angle", `${Math.atan2(normY, normX) * (180 / Math.PI)}deg`);

    if (!doc.body.classList.contains("fabric-tear-active")) return;
    const now = performance.now();
    if (lastTear) {
      const vel = Math.hypot(e.clientX - lastTear.x, e.clientY - lastTear.y) / (now - lastTear.t);
      doc.body.style.setProperty("--tear-transition", `${Math.max(0.05, 0.3 - vel * 0.1)}s`);
    }
    lastTear = { t: now, x: e.clientX, y: e.clientY };
  });
}
