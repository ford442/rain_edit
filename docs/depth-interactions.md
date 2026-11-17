# Depth & Spatial Interactions

The rain-2 depth metaphor — echo documents at different z-layers, lenses
that reveal them, gestures that push/pull/fan them — is implemented as a set
of focused classes under `src/interactions/`, dispatched through the shared
`InputManager` (`src/interactions/InputManager.js`) for anything bound to a
key, and an `InputRegistry` (`src/interactions/InputRegistry.js`) for
listener lifecycle. This doc lists every gesture family and which file owns
it, so a new spatial feature has an obvious place to land.

Every class in this list follows the same shape: a constructor that accepts
its dependencies — `doc`/`win` for events, `ctx` for app references
(defaults to the `src/appContext.js` namespace: `echoLayerEl`, `editorEl`,
`tabManager`, `raindrops`, …) and `state` for shared interaction flags
(defaults to `src/interactions/interactionState.js`: `isPeelActive`,
`lensActive`, `autofocusTargetZ`, …) — never `window.*` globals, an `init()` that registers its keybinding(s) and/or starts its
`InputRegistry`-tracked listeners, and a `destroy()` that tears them down.
`src/interactions/initDepthGestures.js` constructs and initializes all of
them; `src/boot/createApp.js` calls it once. Add a new gesture's
construction there. Anything that animates per frame registers an
`appClock` task (`src/runtime/AppClock.js`) or uses `appClock.nextFrame()`;
private `requestAnimationFrame` loops fail `tests/architecture.test.js`.

## Shared helper

`src/interactions/depthState.js` — pure functions used by several of the
classes below so they don't each re-implement "find the closest
echo-document to the cursor", "compute mouse position local to an echo", or
"batch-set a handful of CSS custom properties": `queryEchoes`, `closestEcho`,
`distanceToCenter`, `localMouse`, `normalizedPointerInRect`, `setVars`,
`clearVars`.

## Gesture families and owners

| Gesture | Trigger | Owner |
| --- | --- | --- |
| Global cursor CSS vars, parallax edge fanning, dock/tabs magnetic gravity + tilt, editor parallax, per-echo hover tilt, fog wipe trail | always-on mousemove | `AmbientCursorField.js` |
| Cinematic autofocus target-picking (hover echo → depth Z) | always-on mousemove, gated by the autofocus toggle | `CinematicAutofocusTargeting.js` |
| Depth Spotlight / Hologram Preview closest-echo targeting | mousemove, gated by body classes (bindings in `EchoDocumentInteractions.js`) | `DepthSpotlightTargeting.js` |
| Orbit / Solar-System / Helix global rotation + per-echo parallax/tilt | mousemove, gated by active view mode | `EchoLayerParallax.js` |
| 3D magnifying glass / magnetic lens pull | hold Shift | `ShiftLensGesture.js` |
| Gravitational wormhole | hold Ctrl+Alt | `WormholeGesture.js` |
| Peel/fan echo layout | hold Alt+Shift+Q (binding in `EchoDocumentInteractions.js`) | `PeelFanGesture.js` (mousemove consumer only) |
| Middle-click Flashlight fog clear; Alt+drag free-cam rotation of the echo layer | mouse button hold | `PointerHoldGestures.js` |
| Tesseract view drag rotation + Escape exit | drag while `.tesseract-active`, Escape | `TesseractDragGesture.js` |
| Loupe magnifier | hold Cmd/⌘+Shift | `MagnifierLoupeGesture.js` |
| Proximity wake, neon tracing, fluid repulsion, holographic foil, echo-wave distortion | always-on mousemove | `ProximityWakeGesture.js` |
| Holographic siphon: drag text from an echo into the editor, or release a selection made inside one | hold Alt+Shift+W, then drag-drop or select+release | `SiphonInteraction.js` |
| Editor x-ray; semantic x-ray | hold Ctrl/⌘; hold Alt+Shift+X | `XRayHoldGestures.js` |
| Raindrop splash on click; staggered z-depth-wave ripple | mousedown; dblclick | `PointerFeedbackEffects.js` |
| Depth cursor (Alt+scroll), depth scan, card shuffle, explode view, peel/fan bindings, kinetic echo, orbital scrubber, and the ~50 other echo-document gestures (portal mode, holographic slice, singularity's echo behavior, etc.) | various | `EchoDocumentInteractions.js` (pre-existing) |
| ~90 "lens" family shortcuts that just toggle a `loupe-active` + feature class on `body` (chrono-pulse, nebula-void, x-ray-core, magnifier, …) | hold Alt/Alt+Shift+\<key\> | `lensBindings.js` (pre-existing) |

## What's intentionally not here

Non-spatial UI wiring (dock toggles, the view-mode `<select>`, weather
controls, save/VPS actions, sonar, typing-particle/atmosphere effects,
cursor-position semantic resonance) lives in `src/boot/` (`dockControls.js`,
`appBindings.js`, `editorEffects.js`, `globalListeners.js`) and
`src/effects/` — those aren't depth/reveal/lens gestures, just event
listeners for controls and editor feedback. The small always-on mousemove
effects (the highlight-angle inset shadow, fabric-tear reveal speed) are
cosmetic editor chrome in `boot/globalListeners.js`.

The legacy `main_vars_*.js` / `main_init_*.js` shards no longer exist and
may not return (`tests/architecture.test.js`).

## Adding a new gesture

1. Create a class in `src/interactions/` following the shape described
   above. Reuse `depthState.js` helpers instead of re-deriving
   echo-under-cursor / local-mouse math.
2. Register any keybinding through the shared `inputManager` (see
   `InputManager.js` for the binding spec: `id`, `category`, `combo`,
   `type`, `onDown`/`onUp`).
3. Construct it in `initDepthGestures.js`. Read app refs through `ctx` and
   shared flags through `state`; put per-frame work on the AppClock.
4. Add a row to the table above.
