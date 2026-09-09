import { monaco } from "../editor/setupMonaco.js";
import { inputManager } from "./InputManager.js";
import { registerLensBindings } from "./lensBindings.js";
import { tabManager as appTabManager } from "../appContext.js";
import { initDepthCursor, initDepthBeam, initArchwayAndDepthSlicer } from "./echo/depthScanningTools.js";
import { initRevealToggles } from "./echo/revealToggles.js";
import { initDepthPeelGestures } from "./echo/depthPeelGestures.js";
import { initPointerEffectsMousemove } from "./echo/pointerEffectsMousemove.js";
import { initLensAndScanEffects } from "./echo/lensAndScanEffects.js";
import { initSpatialDispersionEffects } from "./echo/spatialDispersionEffects.js";

/**
 * Echo-document depth gestures, peel/fan/portal modes, and related keyboard bindings.
 * Call once during bootstrap after managers are constructed.
 *
 * The individual feature bindings live in `./echo/*.js`, split out of this
 * single file purely to keep each file under a manageable size; every
 * feature is independent and the split does not affect registration order
 * requirements.
 */
export function initEchoDocumentInteractions() {
  const im = inputManager;
  const tabManager = appTabManager ?? window.tabManager;

  initDepthCursor(im);
  initRevealToggles(im);
  initDepthPeelGestures(im, tabManager);
  initPointerEffectsMousemove();
  initDepthBeam(im);
  initArchwayAndDepthSlicer(im);
  initSpatialDispersionEffects(im);

  // Obscured Layer Magnifier (Alt+M) / Magnetic Separation (Alt+Shift+M)
  registerLensBindings(im);

  initLensAndScanEffects(im);
}

/** @deprecated Session-lifetime listeners; destroy is a no-op until migrated to AbortController. */
export function destroyEchoDocumentInteractions() {}
