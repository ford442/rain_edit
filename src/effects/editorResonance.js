/**
 * Echo documents react to the active editor: selections light up background
 * files containing the same text (`.semantic-resonance`), and every edit
 * pulses all echoes (`.typing-pulse`).
 */

/**
 * @param {import("monaco-editor").editor.IStandaloneCodeEditor} editor
 * @param {import("../TabManager.js").TabManager} tabManager
 */
export function initSemanticResonance(editor, tabManager) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let resonanceTimeout;
  const clearAll = () => {
    document
      .querySelectorAll(".semantic-resonance")
      .forEach((node) => node.classList.remove("semantic-resonance"));
  };

  editor.onDidChangeCursorSelection((e) => {
    clearTimeout(resonanceTimeout);
    resonanceTimeout = setTimeout(() => {
      const model = editor.getModel();
      if (!model) return;
      const selectedText = model.getValueInRange(e.selection).trim();
      if (selectedText.length < 3) {
        clearAll();
        return;
      }
      tabManager.files.forEach((file) => {
        if (file.id === tabManager.activeId) return;
        const echoNode = document.querySelector(`.echo-document[data-id="${file.id}"]`);
        if (!echoNode || !file.model) return;
        echoNode.classList.toggle(
          "semantic-resonance",
          file.model.getValue().includes(selectedText),
        );
      });
    }, 150);
  });
}

/** @param {import("monaco-editor").editor.IStandaloneCodeEditor} editor */
export function initKineticTypingPulse(editor) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let pulseTimeout;
  editor.onDidChangeModelContent(() => {
    const echoLayerEl = document.getElementById("echo-layer");
    if (!echoLayerEl) return;
    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    echoes.forEach((echo) => echo.classList.add("typing-pulse"));
    clearTimeout(pulseTimeout);
    pulseTimeout = setTimeout(() => {
      echoes.forEach((echo) => echo.classList.remove("typing-pulse"));
    }, 150);
  });
}
