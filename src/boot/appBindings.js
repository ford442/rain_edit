/**
 * App-level keyboard bindings and the wheel gestures that share their state.
 * Registration order matches the legacy init shards so `InputManager`
 * dispatch order is unchanged; echo/depth-gesture bindings register after
 * these (see `createApp()`).
 *
 * @param {import("../interactions/InputManager.js").InputManager} im
 * @param {{
 *   tabManager: import("../TabManager.js").TabManager,
 *   editorEl: HTMLElement,
 *   echoLayerEl: HTMLElement | null,
 *   referenceManager: any,
 *   focusDepth: import("../effects/FocusDepth.js").FocusDepth,
 *   portals: import("../effects/PortalMasks.js").PortalMasks,
 *   sonar: import("../effects/Sonar.js").Sonar,
 *   fileActions: ReturnType<typeof import("./fileActions.js").createFileActions>,
 *   viewModeSelect: HTMLSelectElement | null,
 *   win?: Window,
 * }} deps
 */
export function registerAppBindings(im, deps) {
  const { tabManager, editorEl, echoLayerEl, referenceManager, focusDepth, portals, sonar, fileActions } = deps;
  const win = deps.win || window;
  const body = document.body;
  let zCameraOffset = 0;

  /** @param {string} cls */
  const bodyToggle = (cls) => ({
    onDown: () => body.classList.add(cls),
    onUp: () => body.classList.remove(cls),
  });

  const releaseAltFocus = () => {
    focusDepth.isAltDown = false;
    focusDepth.setDepth(0);
    body.classList.remove("alt-focus-active");
  };

  // Gravity Well — Alt+Shift+Z (Alt+Z is the depth x-ray scan).
  im.register({
    id: "gravity-well",
    category: "depth",
    description: "Gravity well (Alt+Shift+Z)",
    combo: { alt: true, shift: true, code: "KeyZ" },
    type: "toggle",
    preventDefault: false,
    ...bodyToggle("gravity-well-active"),
  });

  im.register({
    id: "depth-cycle-up",
    category: "navigation",
    description: "Cycle depth forward (Ctrl+Up)",
    combo: { ctrlOrMeta: true, key: "ArrowUp" },
    type: "action",
    allowInEditor: true,
    onDown: () => tabManager.cycleDepth(1),
  });
  im.register({
    id: "depth-cycle-down",
    category: "navigation",
    description: "Cycle depth back (Ctrl+Down)",
    combo: { ctrlOrMeta: true, key: "ArrowDown" },
    type: "action",
    allowInEditor: true,
    onDown: () => tabManager.cycleDepth(-1),
  });

  // Ctrl/Cmd+Shift+wheel cycles the active tab.
  win.addEventListener(
    "wheel",
    (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        if (e.deltaY > 0) tabManager.cycleActiveTab(-1);
        else if (e.deltaY < 0) tabManager.cycleActiveTab(1);
      }
    },
    { passive: false },
  );

  im.register({
    id: "alt-focus",
    category: "navigation",
    description: "Alt focus depth (hold Alt)",
    combo: { key: "Alt" },
    sharedCombo: true,
    type: "hold",
    preventDefault: false,
    allowInEditor: true,
    onDown: () => {
      if (!focusDepth.isAltDown) {
        focusDepth.isAltDown = true;
        focusDepth.setDepth(focusDepth.preferredDepth);
        body.classList.add("alt-focus-active");
      }
    },
    onUp: releaseAltFocus,
  });

  // Z-axis camera fly-through: Alt + wheel.
  win.addEventListener(
    "wheel",
    (e) => {
      if (!e.altKey || tabManager.isCascadeView) return;
      e.preventDefault();
      zCameraOffset += e.deltaY * 1.5;
      const maxDepth = tabManager.files.length * 100 + 400;
      zCameraOffset = Math.max(-200, Math.min(maxDepth, zCameraOffset));
      body.style.setProperty("--z-camera-offset", `${zCameraOffset}px`);

      if (echoLayerEl) {
        echoLayerEl.querySelectorAll(".echo-document").forEach((node) => {
          const echo = /** @type {HTMLElement} */ (node);
          const docZ =
            parseInt(echo.dataset.index || "0") * 50 +
            parseInt(echo.style.getPropertyValue("--tz") || "0");
          echo.classList.toggle("z-intersect", Math.abs(docZ - zCameraOffset) < 60);
        });
      }
    },
    { passive: false },
  );

  // Flashlight — Alt+L (Alt+F is focus pull).
  im.register({
    id: "flashlight",
    category: "lens",
    description: "Flashlight (Alt+L)",
    combo: { alt: true, code: "KeyL" },
    type: "toggle",
    ...bodyToggle("flashlight-active"),
  });

  // Z-camera reset on Alt release. Shares Alt with alt-focus; both fire.
  im.register({
    id: "z-camera",
    category: "navigation",
    description: "Z-axis camera fly-through (hold Alt + scroll)",
    combo: { key: "Alt" },
    sharedCombo: true,
    type: "hold",
    preventDefault: false,
    allowInEditor: true,
    onUp: () => {
      zCameraOffset = 0;
      body.style.setProperty("--z-camera-offset", "0px");
      if (echoLayerEl) {
        echoLayerEl
          .querySelectorAll(".echo-document")
          .forEach((echo) => echo.classList.remove("z-intersect"));
      }
      releaseAltFocus();
    },
  });

  // Lens Mode — Alt+Shift+L.
  im.register({
    id: "lens-mode",
    category: "lens",
    description: "Lens mode (Alt+Shift+L)",
    combo: { alt: true, shift: true, code: "KeyL" },
    type: "toggle",
    onDown: () => {
      if (referenceManager) referenceManager.isLensMode = true;
      editorEl.classList.add("lens-active");
      portals.requestUpdate();
    },
    onUp: () => {
      if (referenceManager) referenceManager.isLensMode = false;
      editorEl.classList.remove("lens-active");
      portals.requestUpdate();
    },
  });

  im.register({
    id: "sonar-ping",
    category: "effects",
    description: "Sonar ping (Ctrl+Space)",
    combo: { ctrl: true, code: "Space" },
    type: "action",
    onDown: () => sonar.trigger(),
  });

  // Holographic Slice — Ctrl+Alt+S (Alt+Shift+S is the depth spotlight).
  im.register({
    id: "holographic-slice",
    category: "reveal",
    description: "Holographic slice (Ctrl+Alt+S)",
    combo: { ctrl: true, alt: true, code: "KeyS" },
    type: "toggle",
    ...bodyToggle("holographic-slice-active"),
  });

  im.register({
    id: "singularity",
    category: "reveal",
    description: "Singularity collapse (Alt+Shift+Backspace)",
    combo: { alt: true, shift: true, key: "Backspace" },
    type: "toggle",
    ...bodyToggle("singularity-active"),
  });

  im.register({
    id: "vps-save",
    category: "editor",
    description: "Save to VPS (Ctrl+Shift+S)",
    combo: { ctrlOrMeta: true, shift: true, code: "KeyS" },
    type: "action",
    allowInEditor: true,
    onDown: () => fileActions.saveActive(),
  });

  im.register({
    id: "outline-view",
    category: "editor",
    description: "Toggle outline view (Ctrl+Shift+O)",
    combo: { ctrlOrMeta: true, shift: true, code: "KeyO" },
    type: "action",
    allowInEditor: true,
    onDown: () => {
      tabManager.toggleOutlineView();
      if (deps.viewModeSelect) {
        deps.viewModeSelect.value = body.classList.contains("outline-active") ? "outline" : "";
      }
    },
  });

  im.register({
    id: "save-note",
    category: "editor",
    description: "Save note (Ctrl+S)",
    combo: { ctrlOrMeta: true, code: "KeyS" },
    type: "action",
    allowInEditor: true,
    onDown: () => fileActions.saveNote(),
  });
}
