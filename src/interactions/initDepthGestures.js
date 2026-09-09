// @ts-check
import { inputManager } from "./InputManager.js";
import { AmbientCursorField } from "./AmbientCursorField.js";
import { CinematicAutofocusTargeting } from "./CinematicAutofocusTargeting.js";
import { DepthSpotlightTargeting } from "./DepthSpotlightTargeting.js";
import { EchoLayerParallax } from "./EchoLayerParallax.js";
import { ShiftLensGesture } from "./ShiftLensGesture.js";
import { WormholeGesture } from "./WormholeGesture.js";
import { PeelFanGesture } from "./PeelFanGesture.js";
import { PointerHoldGestures } from "./PointerHoldGestures.js";
import { TesseractDragGesture } from "./TesseractDragGesture.js";
import { MagnifierLoupeGesture } from "./MagnifierLoupeGesture.js";
import { ProximityWakeGesture } from "./ProximityWakeGesture.js";
import { SiphonInteraction } from "./SiphonInteraction.js";
import { XRayHoldGestures } from "./XRayHoldGestures.js";
import { PointerFeedbackEffects } from "./PointerFeedbackEffects.js";

/**
 * Bootstraps every depth/reveal/lens gesture class extracted out of the
 * `main_init_*.js` shards. A new spatial gesture belongs in its own file
 * under `src/interactions/`; add its construction here rather than growing
 * an init shard. See `docs/depth-interactions.md` for the full gesture list
 * and which class owns each one.
 */
export function initDepthGestures(manager = inputManager) {
  const instances = [
    new AmbientCursorField(),
    new CinematicAutofocusTargeting(),
    new DepthSpotlightTargeting(),
    new EchoLayerParallax(),
    new ShiftLensGesture(),
    new WormholeGesture({ inputManager: manager }),
    new PeelFanGesture(),
    new PointerHoldGestures(),
    new TesseractDragGesture({ inputManager: manager }),
    new MagnifierLoupeGesture({ inputManager: manager }),
    new ProximityWakeGesture(),
    new SiphonInteraction({ inputManager: manager }),
    new XRayHoldGestures({ inputManager: manager }),
    new PointerFeedbackEffects(),
  ];

  instances.forEach((instance) => instance.init());
  return instances;
}
