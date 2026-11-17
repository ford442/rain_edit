/**
 * Mutable interaction flags shared between gesture/effect modules.
 *
 * These used to be ad hoc `window.*` globals written by one shard and read by
 * another. Import the object and read/write its fields instead; classes that
 * take a `state` option default to this object so tests can pass their own.
 */
export const interactionState = {
  // Peel / fan / portal reveal modes (echo/depthPeelGestures, PeelFanGesture).
  isPeelActive: false,
  isFanningActive: false,
  isPortalModeActive: false,
  isDepthPeelActive: false,
  // Reveal toggles (echo/revealToggles).
  isSteppedCraterActive: false,
  isFoldOutGalleryActive: false,
  isCardShuffleActive: false,
  isDepthScanActive: false,
  isVenetianBlindsActive: false,
  depthScanTarget: 0,
  // Spatial dispersion effects (echo/spatialDispersionEffects).
  isHolographicExplodeActive: false,
  isKineticEchoActive: false,
  isOrbitalScrubberActive: false,
  // Explode view (interactions/explodeView).
  isExplodeViewActive: false,
  // Depth scanning tools (echo/depthScanningTools, tabManager/layouts archway).
  archScrollOffset: 0,
  cursorZDepth: 0,
  depthCursorThrottle: false,
  depthSliceIndex: 0,
  // Shift lens (ShiftLensGesture, echo/depthPeelGestures).
  lensActive: false,
  // Cinematic autofocus (effects/CinematicFocus, CinematicAutofocusTargeting).
  isAutofocusActive: false,
  autofocusTargetZ: 0,
};
