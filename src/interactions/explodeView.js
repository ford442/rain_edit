import * as app from "../appContext.js";
import { interactionState } from "./interactionState.js";

/**
 * Explode view: scatters every echo document onto a Fibonacci sphere
 * (`--exp-*` CSS vars + `body.explode-view-active`), or collapses them back.
 * Bound to the dock's `#btn-explode-view` and Ctrl/Cmd+Alt+E.
 * @param {{ echoLayerEl?: HTMLElement | null, body?: HTMLElement }} [deps]
 */
export function toggleExplodeView({
  echoLayerEl = app.echoLayerEl ?? document.getElementById("echo-layer"),
  body = document.body,
} = {}) {
  if (!echoLayerEl) return;

  interactionState.isExplodeViewActive = !interactionState.isExplodeViewActive;
  const echoes = echoLayerEl.querySelectorAll(".echo-document");

  if (interactionState.isExplodeViewActive) {
    body.classList.add("explode-view-active");
    const total = echoes.length;

    echoes.forEach((echo, index) => {
      // Spherical coordinates for the explosion.
      const phi = Math.acos(1 - (2 * (index + 0.5)) / total);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      const radius = 800 + Math.random() * 400;

      const tx = radius * Math.sin(phi) * Math.cos(theta);
      const ty = radius * Math.sin(phi) * Math.sin(theta);
      const tz = radius * Math.cos(phi) - 200;

      echo.style.setProperty("--exp-tx", `${tx}px`);
      echo.style.setProperty("--exp-ty", `${ty}px`);
      echo.style.setProperty("--exp-tz", `${tz}px`);
      echo.style.setProperty("--exp-rot-x", `${(Math.random() - 0.5) * 180}deg`);
      echo.style.setProperty("--exp-rot-y", `${(Math.random() - 0.5) * 180}deg`);
      echo.style.setProperty("--exp-rot-z", `${(Math.random() - 0.5) * 180}deg`);
    });
  } else {
    body.classList.remove("explode-view-active");
    echoes.forEach((echo) => {
      for (const prop of [
        "--exp-tx",
        "--exp-ty",
        "--exp-tz",
        "--exp-rot-x",
        "--exp-rot-y",
        "--exp-rot-z",
      ]) {
        echo.style.removeProperty(prop);
      }
    });
  }
}
