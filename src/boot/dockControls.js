import { toggleExplodeView } from "../interactions/explodeView.js";
import { interactionState } from "../interactions/interactionState.js";
import { triggerZScan } from "../effects/zScan.js";
import { VIEW_MODE_TOGGLES } from "../workspace/sessionSchema.js";

/**
 * @param {EventTarget | null} target
 * @param {string} type
 * @param {(e: any) => void} handler
 */
function on(target, type, handler) {
  if (target) target.addEventListener(type, handler);
}

/**
 * Wire the dock's controls (layer toggles, view mode, sliders, mode
 * checkboxes, effect buttons, search, reference editor) to their owners.
 *
 * @param {{
 *   refs: import("./domRefs.js").DomRefs,
 *   tabManager: import("../TabManager.js").TabManager,
 *   referenceManager: any,
 *   connectionManager: any,
 *   weatherSystem: import("../rain/WeatherSystem.js").WeatherSystem,
 *   weatherAudio: import("../audio/WeatherAudio.js").WeatherAudio,
 *   ctx: Partial<typeof import("../appContext.js")>,
 *   focusDepth: import("../effects/FocusDepth.js").FocusDepth,
 *   cinematicFocus: import("../effects/CinematicFocus.js").CinematicFocus,
 *   wiper: import("../effects/Wiper.js").Wiper,
 *   sonar: import("../effects/Sonar.js").Sonar,
 *   initialMarkdown: string,
 * }} deps
 */
export function bindDockControls(deps) {
  const { refs, tabManager, referenceManager, connectionManager, weatherSystem, weatherAudio, ctx, focusDepth } = deps;
  const body = document.body;
  /** @param {string} cls */
  const bodyClassToggle = (cls) => (/** @type {Event} */ e) =>
    body.classList.toggle(cls, /** @type {HTMLInputElement} */ (e.target).checked);

  on(refs.toggleBack, "change", (e) => ctx.bgLayer?.setVisible(e.target.checked));
  on(refs.toggleFront, "change", (e) => ctx.fgLayer?.setVisible(e.target.checked));
  on(refs.toggleFrontOnTop, "change", (e) => {
    refs.frontCanvas.style.zIndex = e.target.checked ? "10" : "0";
  });

  on(refs.btnDepthForward, "click", () => tabManager.cycleDepth(1));
  on(refs.btnDepthBack, "click", () => tabManager.cycleDepth(-1));

  // One select-value → toggle table, shared with workspace-session restore.
  // Unknown values (and the empty "default" option) deactivate every view.
  on(refs.viewModeSelect, "change", (e) => {
    const method = VIEW_MODE_TOGGLES[e.target.value];
    const tm = /** @type {any} */ (tabManager);
    if (method && typeof tm[method] === "function") tm[method]();
    else tm._deactivateAllViews();
  });

  on(refs.theaterToggle, "change", bodyClassToggle("theater-active"));
  on(refs.portalToggle, "change", (e) => {
    interactionState.isPortalModeActive = e.target.checked;
    body.classList.toggle("portal-mode-active", e.target.checked);
  });
  on(refs.cinematicToggle, "change", (e) => deps.cinematicFocus.setEnabled(e.target.checked));
  on(refs.opacitySlider, "input", () => focusDepth.updateVisuals());

  on(refs.intensitySlider, "input", (e) => weatherSystem.setManualIntensity(parseInt(e.target.value, 10)));
  if (refs.weatherModeSelect) {
    refs.weatherModeSelect.value = weatherSystem.getMode();
    on(refs.weatherModeSelect, "change", (e) => weatherSystem.setMode(e.target.value));
  }
  on(refs.weatherAudioToggle, "change", (e) => {
    if (e.target.checked) weatherAudio.enable();
    else weatherAudio.disable();
  });

  on(refs.focusModeToggle, "change", bodyClassToggle("focus-readable"));
  on(refs.lanternToggle, "change", (e) => referenceManager.setLanternMode(e.target.checked));
  on(refs.wiperToggle, "change", (e) => deps.wiper.setEnabled(e.target.checked));
  on(refs.exposeToggle, "change", bodyClassToggle("expose-active"));
  on(refs.ghostToggle, "change", (e) => focusDepth.setGhostMode(e.target.checked));

  on(refs.blueprintToggle, "change", (e) => {
    if (!refs.referenceLayer) return;
    refs.referenceLayer.classList.toggle("blueprint-mode", e.target.checked);
    // Blueprint mode makes the editor slightly see-through.
    refs.editorEl.style.opacity = e.target.checked ? "0.7" : refs.opacitySlider.value;
  });

  on(refs.themeSelect, "change", (e) => {
    body.classList.remove("theme-journal", "theme-blueprint", "theme-cyberpunk");
    if (e.target.value !== "cyberpunk") body.classList.add(`theme-${e.target.value}`);
  });
  if (refs.dock && refs.dockToggle) {
    on(refs.dockToggle, "click", () => refs.dock?.classList.toggle("dock-collapsed"));
  }

  on(refs.btnSonar, "click", () => deps.sonar.trigger());
  on(refs.btnZScan, "click", () => triggerZScan());
  on(refs.btnBlackHole, "click", () => tabManager.toggleBlackHoleView());
  on(refs.btnExplode, "click", () => toggleExplodeView());

  // Global search pulls matching echo documents forward and threads them.
  on(refs.globalSearch, "input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    /** @param {HTMLElement} el */
    const restoreTz = (el) => {
      if (el.style.getPropertyValue("--tz-override")) {
        el.style.removeProperty("--tz-override");
        el.style.setProperty("--tz", el.dataset.originalTz || "0px");
      }
    };
    if (!searchTerm) {
      document.querySelectorAll(".echo-document.search-hit").forEach((node) => {
        node.classList.remove("search-hit");
        restoreTz(/** @type {HTMLElement} */ (node));
      });
      return;
    }

    /** @type {Array<{ left: number, top: number, width: number, height: number, depthIndex: number, isHovered: boolean }>} */
    const matchedEchoes = [];
    tabManager.files.forEach((file) => {
      if (file.id === tabManager.activeId) return;
      const content = file.isImage
        ? file.name.toLowerCase()
        : file.model
          ? file.model.getValue().toLowerCase()
          : "";
      const echoEl = /** @type {HTMLElement | null} */ (
        document.querySelector(`.echo-document[data-id="${file.id}"]`)
      );
      if (!echoEl) return;
      if (content.includes(searchTerm)) {
        echoEl.classList.add("search-hit");
        if (!echoEl.dataset.originalTz) {
          echoEl.dataset.originalTz = echoEl.style.getPropertyValue("--tz") || "0px";
        }
        echoEl.style.setProperty("--tz-override", "1");
        echoEl.style.setProperty("--tz", "80px");
        const rect = echoEl.getBoundingClientRect();
        matchedEchoes.push({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          depthIndex: parseInt(echoEl.dataset.index || "0", 10),
          isHovered: false,
        });
      } else {
        echoEl.classList.remove("search-hit");
        restoreTz(echoEl);
      }
    });
    // Setting echo focus triggers the semantic 3D threading.
    connectionManager?.setEchoFocus?.(matchedEchoes);
  });

  if (refs.referenceInput) {
    refs.referenceInput.value = deps.initialMarkdown;
    on(refs.referenceInput, "input", (e) => referenceManager.update(e.target.value));
  }
}
