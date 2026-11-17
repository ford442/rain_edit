import { spawnSemanticSpark, createTypingParticle } from "../effects/particles.js";
import { initSemanticResonance, initKineticTypingPulse } from "../effects/editorResonance.js";

/**
 * @param {Element} echo
 * @param {string} cls
 * @param {number} ms
 */
function restartClass(echo, cls, ms) {
  echo.classList.remove(cls);
  void (/** @type {HTMLElement} */ (echo).offsetWidth); // restart the CSS animation
  echo.classList.add(cls);
  setTimeout(() => echo.classList.remove(cls), ms);
}

/**
 * Monaco editor events → weather, rain clearing, fog, reference/echo
 * resonance, atmosphere, portals, and typing particles.
 *
 * @param {{
 *   editor: import("monaco-editor").editor.IStandaloneCodeEditor,
 *   monaco: typeof import("monaco-editor"),
 *   editorEl: HTMLElement,
 *   echoLayerEl: HTMLElement | null,
 *   tabManager: import("../TabManager.js").TabManager,
 *   referenceManager: any,
 *   connectionManager: any,
 *   fogManager: any,
 *   weatherSystem: import("../rain/WeatherSystem.js").WeatherSystem,
 *   rainScene: import("../rain/RainScene.js").RainScene,
 *   atmosphere: import("../effects/Atmosphere.js").Atmosphere,
 *   portals: import("../effects/PortalMasks.js").PortalMasks,
 * }} deps
 */
export function bindEditorEffects(deps) {
  const { editor, monaco, editorEl, echoLayerEl, tabManager, referenceManager, connectionManager, fogManager, weatherSystem, rainScene, atmosphere, portals } = deps;
  const echoes = () => (echoLayerEl ? echoLayerEl.querySelectorAll(".echo-document") : []);
  const raindrops = () => rainScene.raindrops;

  editor.onDidFocusEditorText(() => weatherSystem.registerFocus(true));
  editor.onDidBlurEditorText(() => weatherSystem.registerFocus(false));

  // Wipe the rain across the editor when switching files.
  editor.onDidChangeModel(() => {
    const rect = editorEl.getBoundingClientRect();
    if (rect.width > 0) rainScene.effects.addWipe(rect, 50);
  });

  // Scroll-linked parallax + kinetic chromatic aberration.
  let lastScrollTop = 0;
  let lastScrollTime = performance.now();
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let scrollDecayTimer;
  editor.onDidScrollChange((e) => {
    if (!echoLayerEl) return;
    echoLayerEl.style.setProperty("--editor-scroll-y", `${e.scrollTop}px`);
    const now = performance.now();
    const dt = now - lastScrollTime;
    if (dt > 0) {
      const velocity = Math.abs((e.scrollTop - lastScrollTop) / dt);
      document.body.style.setProperty("--scroll-vel", String(Math.min(velocity * 10, 50)));
      clearTimeout(scrollDecayTimer);
      scrollDecayTimer = setTimeout(() => document.body.style.setProperty("--scroll-vel", "0"), 100);
    }
    lastScrollTop = e.scrollTop;
    lastScrollTime = now;
  });

  // Enter: shockwave through the echoes and a wipe along the new line.
  editor.onKeyDown((e) => {
    if (e.keyCode !== monaco.KeyCode.Enter) return;
    const drops = raindrops();
    if (!drops) return;
    echoes().forEach((echo) => restartClass(echo, "shockwave-hit", 600));

    const position = editor.getPosition();
    const visible = position && editor.getScrolledVisiblePosition(position);
    if (visible) {
      const y = visible.top;
      for (let x = 0; x < editorEl.clientWidth; x += 40) {
        setTimeout(() => drops.clearDroplets(x, y + 10, 80), x * 0.5);
      }
    }
  });

  editor.onDidChangeCursorPosition((e) => {
    weatherSystem.registerCursorMove();
    const visible = editor.getScrolledVisiblePosition(e.position);
    if (!visible) return;
    const x = visible.left;
    const y = visible.top;
    const rect = editorEl.getBoundingClientRect();

    // Semantic sync plane follows the caret's vertical position.
    if (editorEl.clientHeight > 0) {
      document.body.style.setProperty("--cursor-y-percent", `${(y / editorEl.clientHeight) * 100}%`);
    }

    referenceManager?.highlightNoteAt(x, y);
    const drops = raindrops();
    if (drops && document.body.classList.contains("focus-readable")) {
      drops.clearDroplets(x, y, 100);
    }
    fogManager?.clearFogAt(x + rect.left, y + rect.top, 80);

    // Focus link: tether the word under the caret to notes and echoes.
    const model = editor.getModel();
    const wordAtPosition = model ? model.getWordAtPosition(e.position) : null;
    const currentWord = wordAtPosition ? wordAtPosition.word : null;
    connectionManager?.setEditorFocus?.(currentWord || "___CURSOR_TETHER___", x + rect.left, y + rect.top + 10);

    if (!echoLayerEl) return;
    const all = /** @type {NodeListOf<HTMLElement>} */ (echoLayerEl.querySelectorAll(".echo-document"));
    all.forEach((echo) => {
      echo.classList.remove("resonance-hit");
      if (echo.style.getPropertyValue("--tz-override")) {
        echo.style.removeProperty("--tz-override");
        echo.style.setProperty("--tz", echo.dataset.originalTz || "0px");
      }
    });

    /** @type {Array<{ left: number, top: number, width: number, height: number, depthIndex: number, isHovered: boolean }>} */
    const matched = [];
    /** @param {HTMLElement} el @param {boolean} isHovered */
    const pushMatch = (el, isHovered) => {
      const r = el.getBoundingClientRect();
      matched.push({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        depthIndex: parseInt(el.dataset.index || "0", 10),
        isHovered,
      });
    };

    if (currentWord && currentWord.length > 3) {
      const lowerWord = currentWord.toLowerCase();
      tabManager.files.forEach((file) => {
        if (file.id === tabManager.activeId) return;
        const content = file.isImage
          ? file.name.toLowerCase()
          : file.model
            ? file.model.getValue().toLowerCase()
            : "";
        if (!content.includes(lowerWord)) return;
        const echoEl = /** @type {HTMLElement | null} */ (
          echoLayerEl.querySelector(`.echo-document[data-id="${file.id}"]`)
        );
        if (!echoEl) return;
        echoEl.classList.add("resonance-hit");
        // Magnetic surfacing: pull the match forward before the pulse runs.
        if (!echoEl.dataset.originalTz) {
          echoEl.dataset.originalTz = echoEl.style.getPropertyValue("--tz") || "0px";
        }
        echoEl.style.setProperty("--tz-override", "1");
        echoEl.style.setProperty("--tz", "30px");
        pushMatch(echoEl, false);
      });
    }

    all.forEach((echoEl) => {
      if (echoEl.matches(":hover") && !echoEl.classList.contains("resonance-hit")) {
        pushMatch(echoEl, true);
      }
    });

    connectionManager?.setEchoFocus?.(matched);
    matched.forEach((m) => {
      if (m.isHovered && Math.random() > 0.7) {
        spawnSemanticSpark(m.left + m.width / 2, m.top + m.height / 2);
      }
    });
  });

  editor.onDidChangeModelDecorations(() => atmosphere.updateFromMarkers());

  editor.onDidChangeModelContent((e) => {
    e.changes.forEach((change) => {
      atmosphere.registerTyping(change.text.length);
      weatherSystem.registerTyping(change.text.length || 1);
      if (change.text.length === 0) return;
      const position = editor.getPosition();
      const visible = position && editor.getScrolledVisiblePosition(position);
      if (!visible) return;
      const rect = editorEl.getBoundingClientRect();
      const count = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < count; i++) {
        createTypingParticle(visible.left + rect.left, visible.top + rect.top + 10);
      }
    });

    // Keystroke ripple through every echo.
    echoes().forEach((echo) => restartClass(echo, "ripple-active", 500));

    // Semantic explode: finishing a word shatters echoes that contain it.
    e.changes.forEach((change) => {
      if (!change.text.match(/[\s\n]$/)) return;
      const position = editor.getPosition();
      const model = editor.getModel();
      if (!position || !model) return;
      const wordInfo = model.getWordUntilPosition({
        lineNumber: position.lineNumber,
        column: position.column - 1,
      });
      if (!wordInfo || !wordInfo.word || wordInfo.word.length <= 3) return;
      const lowerWord = wordInfo.word.toLowerCase();
      tabManager.files.forEach((file) => {
        if (file.id === tabManager.activeId) return;
        const content = file.model
          ? file.model.getValue().toLowerCase()
          : file.isImage
            ? file.name.toLowerCase()
            : "";
        if (!content.includes(lowerWord)) return;
        const echoEl = document.querySelector(`.echo-document[data-id="${file.id}"]`);
        if (echoEl) restartClass(echoEl, "shatter-active", 600);
      });
    });
  });

  editor.onDidChangeModelContent(portals.scan);
  editor.onDidScrollChange(portals.update);

  initSemanticResonance(editor, tabManager);
  initKineticTypingPulse(editor);
}
