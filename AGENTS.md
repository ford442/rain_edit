# rain-2 — Agent Context

This document contains project-specific context for AI coding agents. If you are modifying code here, read this first.

---

## Project Overview

**rain-2** is a single-page frontend application that combines a Monaco code editor with immersive WebGL rain effects, holographic UI overlays, and a 3D file cabinet browser. It is a vanilla-JavaScript ES-module project built with Vite. The visual metaphor is "code editing inside a storm": documents exist at different z-depths (behind rain, between rain layers, or in front), and inactive files are rendered as blurred "echo" documents in the background.

Key product features:

- Monaco editor with transparent cyberpunk theme.
- Dual WebGL rain layers (front and back) driven by a dynamic water-map simulation.
- Reference layer: floating markdown note cards with lantern, spotlight, frost, and rain-shield effects.
- Connection manager / holographic minimap: draws animated canvas lines and a radar view of reference cards and echo documents.
- Tab manager: 81 registry-driven 3D view modes (waterfall, cascade, orbit, scattered, isometric, stack, timeline, tunnel, grid, helix, pinboard, vortex, constellation, prism, coverflow, sphere, wave, black hole, rolodex, cylinder, galaxy, data-hive, origami, matrix-rain, crystal, fractal, …) over a virtualized echo layer.
- 3D File Cabinet (Three.js): a "cube of cubes" browser that fetches categorized files from a remote FastAPI backend.
- VPS File Browser: browse, open, and save files to a remote VPS path via the same backend.
- Holographic comment parser: turns `// TODO:`, `// FIXME:`, etc. into floating UI badges.
- Matrix rain canvas effect and holographic dust particle overlay.
- Gravitational cursor tracking: UI elements (dock, tabs) are physically pulled toward the mouse.
- Flashlight, wormhole, magnifier, peel, and proximity-wake interaction modes for echo documents.

---

## Tech Stack

| Layer          | Choice                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------- |
| Build tool     | Vite 5                                                                                        |
| Language       | Vanilla ES modules (JavaScript), no TypeScript                                                |
| Editor         | `monaco-editor` v0.43.0 (workers configured in `src/editor/setupMonaco.js`)                  |
| 3D graphics    | `three` v0.183.2 (used only in `Cabinet3D.js`)                                                |
| Shaders        | Custom WebGL in `RainLayer.js`; GLSL source files compiled via a custom `glslify` Vite plugin |
| Styling        | `src/styles_{base,views,echo,ui}.css` (merged from legacy shards), heavy use of CSS variables |
| Backend client | `StorageAPI.js` talks to a FastAPI backend at `https://storage.noahcohn.com`                  |
| Dev server     | Vite (port 5173); configured to allow FS access to parent directory (`'..'`)                  |

---

## Project Structure

```
root/
  index.html              # SPA shell: many layered divs/canvases for effects
  package.json            # npm scripts: dev, test, check, smoke, build, preview, ci
  vite.config.js          # Vite config + custom glslify plugin
  git.sh                  # Simple helper: git add/commit/push
  src/
    main.js               # Entry point: imports and calls createApp() — nothing else
    appContext.js         # Shared runtime refs (managers, editor, DOM roots, rain layers); never window.*
    boot/
      createApp.js        # The single, ordered construction graph (typed); starts the AppClock
      domRefs.js          # One-time DOM lookups (typed) + #portal-visuals creation
      appBindings.js      # App-level InputManager bindings (registered before echo bindings)
      dockControls.js     # Dock controls → owners (view mode uses sessionSchema VIEW_MODE_TOGGLES)
      editorEffects.js    # Monaco editor events → rain/fog/resonance/atmosphere/portals
      globalListeners.js  # window/document glue (resize, cabinet rain events, ghost, sonar chord)
      fileActions.js      # Local/VPS save, note save, open-from-cabinet
      initialContent.js   # First-visit demo file + reference markdown
    runtime/
      AppClock.js         # The one main-thread RAF: tasks, visibility pause, nextFrame, LOD (typed)
    effects/              # Per-feature effects driven by AppClock tasks: MatrixRain, HoloDust,
                          # FocusDepth, CinematicFocus, Wiper, PortalMasks, Sonar, Atmosphere,
                          # particles, zScan, tearSound, editorResonance
    editor/
      setupMonaco.js      # Sole Monaco language/worker registration point
    interactions/
      InputManager.js     # Unified keyboard registry + cheatsheet
      InputRegistry.js    # Listener lifecycle/disposal helper
      interactionState.js # Shared mutable interaction flags (peel/fan/lens/autofocus/…); never window.*
      explodeView.js      # Explode-view toggle (dock button + Ctrl/Cmd+Alt+E)
      EchoDocumentInteractions.js # Echo depth gestures, peel/fan/portal modes;
                          # thin orchestrator over echo/*.js (split by feature to stay under ~700 lines/file)
      echo/               # initEchoDocumentInteractions's feature modules: depthScanningTools,
                          # revealToggles, depthPeelGestures, pointerEffectsMousemove,
                          # lensAndScanEffects, spatialDispersionEffects
      lensBindings.js     # Registrar: loops lenses/catalog.js into InputManager ("lens" group)
      lenses/catalog.js   # THE lens catalog (~12 rows: id, combo, description, effect kind+params)
      depthState.js       # Shared echo/mouse-math helpers for the depth gesture classes below
      AmbientCursorField.js, CinematicAutofocusTargeting.js, DepthSpotlightTargeting.js,
      EchoLayerParallax.js, ShiftLensGesture.js, WormholeGesture.js, PeelFanGesture.js,
      PointerHoldGestures.js, TesseractDragGesture.js, MagnifierLoupeGesture.js,
      ProximityWakeGesture.js, SiphonInteraction.js, XRayHoldGestures.js,
      PointerFeedbackEffects.js # Depth/reveal/lens gesture classes (take ctx/state deps) — see docs/depth-interactions.md
      initDepthGestures.js # Constructs + inits every class above; called once from boot/createApp.js
      initInteractions.js # Starts InputManager after all bindings register
    tabManager/
      viewModes.js        # THE view-mode registry (value, name, body class, hover rule) (typed)
      layouts/            # Pure echo layouts: index.js registry (value → fn) + family modules
                          # (stacks, rings, curves, spheres, grids, scatter, solids); types.js (typed)
      EchoLayer.js        # Virtualized echoes: ≤12 pooled cards, ≤8 colorized, stubs beyond (typed)
      echoCard.js         # One recyclable .echo-document: DOM built + listeners bound once
      symbols.js          # Regex symbol extraction for echo outlines
      constants.js        # Depth z-indices/icons/titles, toast duration (typed)
    dom/
      sanitize.js         # escapeHtml + allowlist DOM rebuild (Monaco tokens, markdown) (typed)
    rendering/
      createGLContext.js  # Shared WebGL2-first context policy + DPR sizing
    TabManager.js         # Real class: tabs, depth, persistence, notes; delegates echoes to EchoLayer
    ConnectionManager.js  # Radar/minimap canvas drawing (echo blips + reference cards)
    ReferenceManager.js   # Markdown note cards + visual effects (lantern, spotlight, frost, drag)
    FogManager.js         # Canvas fog that regenerates and is cleared by mouse
    HoloManager.js        # Scans editor for // TODO/FIXME/etc. and renders badges
    RainLayer.js          # Recoverable WebGL rain pass; rebuilds resources after context loss
    StorageAPI.js         # HTTP client for categories, notes, and VPS file operations
    Cabinet3D.js          # Three.js modal file browser (methods in cabinet3d/methods.js)
    VPSFileBrowser.js     # Slide-in panel to browse/open/save VPS remote files
    UploadProgressUI.js   # Small toast UI for drag-and-drop uploads
    styles_base.css       # Base layout, shell, editor chrome; @imports styles_base/
                           # (each module kept under ~700 lines)
    styles_base/            # Shell/editor chrome, reference-layer content, dock UI, note
                           # cards, ambient fx/themes, tabs container, echo-layer base —
                           # modules imported by styles_base.css
    styles_views.css      # 3D view-mode body classes; @imports styles_views/
                           # (each module kept under ~700 lines)
    styles_views/          # View-mode/echo-effect CSS modules imported by styles_views.css
                           # (holographic overlays, transition effects, flat/layered/orbital/
                           # crystal-matrix view modes, background effects, lens overlays)
    styles_echo.css       # Echo documents and depth effects; @imports styles_echo/
                           # (each module kept under ~700 lines)
    styles_echo/            # Per-view-mode echo-document effects and the outline symbol
                           # panel component — modules imported by styles_echo.css
    styles_ui.css         # Dock, overlays, cheatsheet; @imports styles_14/ and styles/lenses.css
    styles_14/             # View-mode effect CSS (fold/fracture, geometric, legacy effects) — no lenses
    styles/lenses.css      # The only lens stylesheet: one rule set per effect *kind*
    shaders/
      simple.vert         # Basic fullscreen vertex shader
      water.frag          # Front rain fragment shader
      water-back.frag     # Back rain fragment shader
    vendor/
      raindrops.js        # Original raindrop simulation (main-thread fallback)
      create-canvas.js
      image-loader.js
      random.js
      times.js
    rain/                 # Off-main-thread water-map (WaterMapSim, worker, wasm) + WeatherSystem;
                          # RainScene.js = the AppClock `rain` task (sim, layers, cabinet upload)
    audio/                # Optional ambient audio (WeatherAudio rain bed)
    workspace/            # Session persist/restore, local project, export/import
  crates/
    rain-sim/             # Rust wasm32 droplet sim → src/rain/wasm/rain_sim.wasm
  docs/
    workspace-session.md  # Session schema, StorageAPI sync, local project mode
    depth-interactions.md # Depth/reveal/lens gesture families and which src/interactions/ class owns each
  public/img/             # Local texture assets (drop-alpha, drop-color, textures, backgrounds)
  tests/                  # Focused Node tests for extracted domain modules
  Kimi_Agent/             # Agent workspace: patches and alternate file versions (not part of main build)
  .github/copilot-instructions.md  # Copilot guidance; references this file as primary architecture doc
```

### Module relationships

- `main.js` is the build entry point and only calls `createApp()` (`src/boot/createApp.js`). `createApp` is the one explicit construction graph: DOM refs → managers (published with `setAppContext(...)`) → workspace session → `RainScene` + effects → listeners, dock, editor effects, app keyboard bindings → echo interactions + depth gestures → `inputManager` start → AppClock tasks → `clock.start()`. Add new wiring there (or in a `src/boot/` / `src/effects/` module it calls), never as an import side effect.
- **Shared state:** managers/DOM roots/rain layers live in `src/appContext.js` (import a named live binding, or pass `import * as appContext` as a `ctx` dependency). Mutable interaction flags live in `src/interactions/interactionState.js`. `window.tabManager` is the **only** window global the app installs — a documented debug alias. `tests/architecture.test.js` fails on any other `window.*` / `globalThis.*` assignment.
- **Frame clock:** `src/runtime/AppClock.js` exports the single main-thread clock `appClock`. Per-frame work registers `appClock.register({ id, update?(dt, t), render?(dt, t), active?(), priority? })`; one-shot "next frame" work uses `appClock.nextFrame(cb)`. Each tick runs every active task's `update`, then every `render`, in registration order. The clock pauses while `document.hidden`, and drops to low LOD on sustained slow frames or a discharging battery under 20% (`?lod=auto|low|high`, `localStorage['rain-edit:lod']`): `priority: "decorative"` tasks (fog, matrix, dust, minimap) are skipped and rain DPR caps at 1. `requestAnimationFrame` may only appear in `AppClock.js` and worker files (`src/rain/rainSimWorker.js` keeps its own RAF on the worker thread) — enforced by `tests/architecture.test.js`. Inspect at runtime via `appContext.clock.getDiagnostics()`.
- New or extracted interactions belong in `src/interactions/` as named classes/functions with explicit DOM or manager dependencies (`ctx`/`state` options, not `window`), an `init()`/`destroy()` lifecycle, and focused tests. Echo-document keyboard/mouse interactions live in `interactions/EchoDocumentInteractions.js`; the depth/reveal/lens gesture classes are documented in `docs/depth-interactions.md`. The legacy `main_vars_*` / `main_init_*` shards are gone and may not return.
- `TabManager` owns the list of open files, switches active models in Monaco, manages per-file depth (0/1/2), and the active view mode (`viewMode`, one string). Background echoes in `#echo-layer` are rendered by `EchoLayer` — see **View modes & echo layouts** below.
- `ReferenceManager` owns `#reference-layer` and `#reference-overlay`. It parses markdown into floating cards and handles lantern/spotlight/frost interactions, drag-and-drop, and rain-shield clearing.
- `ConnectionManager` draws on the radar canvas (`#radar-canvas`) using 2D canvas. It receives reference card data from `ReferenceManager` and echo targets from the DOM.
- `StorageAPI` is a thin REST client. It is consumed by `Cabinet3D`, `VPSFileBrowser`, and `main.js`.
- `Cabinet3D` dispatches a custom `fileCubeClicked` event on `window`; `boot/fileActions.js` handles it to open files and adjust depth focus.
- `createGLContext` is the single context factory. Rain prefers WebGL2, falls back to WebGL1, and uses non-antialiased, non-preserved drawing buffers. Cabinet rendering is synchronized immediately before cross-context texture upload, so its drawing buffer is also non-preserved by default. See `docs/rendering-contexts.md` before changing this frame order.
- `RainLayer` caches texture sources and uniform values, idles the AppClock `rain` task on context loss, rebuilds GPU resources on restoration, and resumes only after both rain contexts are healthy. The cabinet has no loop of its own: the `rain` task renders it and uploads its canvas in the same tick, and a fallback `cabinet` task renders it only when rain can't.
- `window.tabManager` is intentionally exposed on the global object for manual/debug automation. Smoke tests read everything else from the live `/src/appContext.js` module (`await import("/src/appContext.js")` in the page).
- Water-map simulation lives behind `src/rain/WaterMapSim.js`. It prefers an off-main-thread worker (`js` OffscreenCanvas or `wasm` Rust pixel sim in `crates/rain-sim`), and falls back to `src/vendor/raindrops.js` on the main thread. Toggle with the dock **Rain Sim** control, `?rainSim=wasm|js|main|auto`, or `localStorage['rain-edit:rainSimBackend']`. Rebuild the wasm artifact with `npm run build:wasm` (Vite imports `src/rain/wasm/rain_sim.wasm` via `?url` — no public/ copy).
- `src/rain/WeatherSystem.js` is the control surface for rain "feel": it drives `raindrops.options.{rainChance,dropletsRate,maxDrops,trailRate,globalTimeScale}` and the `RainLayer` refraction uniforms from a damped editor-activity signal (typing/cursor/focus) plus a `drizzle`/`steady`/`storm`/`clearing` weather-mode state machine (`src/rain/weatherModes.js`). Switch modes from the dock's **Weather** select, `?weather=`, or `localStorage['rain-edit:weatherMode']`. It is the single owner of those options — do not write `raindrops.options.rainChance`/`dropletsRate` elsewhere; use `setManualIntensity()`/`setSceneMultiplier()` instead. `src/audio/WeatherAudio.js` is an optional muted-by-default ambient rain bed that follows the mode. See `docs/water-map-sim.md` for the full API.
- Workspace sessions live in `src/workspace/` (`WorkspaceSession`, `LocalProject`). Refresh restores tabs (content + depth), view mode, and reference layouts from IndexedDB (localStorage fallback). Dirty tabs show `*`; `beforeunload` confirms. Optional remote sync writes note `__rain_workspace_session__.json` via StorageAPI. See `docs/workspace-session.md`.

---

## Build & Dev Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build -> dist/
npm run build

# Rebuild Rust water-map wasm into src/rain/wasm/ (optional; artifact is checked in)
npm run build:wasm

# Focused Node tests
npm test

# Parse all JavaScript sources
npm run check

# Canonical browser smoke (one-time: npx playwright install chromium)
npm run test:smoke

# Complete local CI gate
npm run ci

# Preview production build locally
npm run preview
```

The Vite dev server is configured to allow file-system access to the parent directory (`'..'`) so the project can reuse image assets from a sibling repo (`../ra1n`). If you prefer to avoid this, copy texture assets into `public/img/`.

---

## Code Style & Conventions

- **No framework**: no React, Vue, or Svelte. Everything is hand-written class-based ES modules.
- **Manager pattern**: most complex UI behavior lives in a `*Manager.js` or `*Layer.js` class. Typical shape:
  ```js
  export class SomeManager {
    constructor(domEl, ...) { /* cache refs, init state, attach listeners */ }
    update(...) { /* recompute state */ }
    render(...) { /* write to DOM / canvas / WebGL */ }
  }
  ```
- **Custom events** are used for cross-module communication when direct references would create awkward circular imports (e.g. `fileCubeClicked`, `echo-peek`, `document-splash`).
- **CSS variables** drive many runtime visual effects (mouse coordinates, depth offsets, parallax, transforms, etc.). The JS frequently reads/writes inline styles and CSS custom properties.
- **Shaders** are imported with a `?glslify` suffix, handled by a small custom Vite plugin in `vite.config.js`.
- **No linting or formatting config** is present. Follow the existing 2-space indentation and keep lines reasonably short.
- When adding new DOM elements from JS, create them with `document.createElement`, set classes/styles explicitly, and append. No JSX or template system is used.

---

## Testing

Focused unit tests use the built-in Node test runner and live in `tests/*.test.js`; run them with `npm test`. `npm run check` parses every `src/**/*.js` file with esbuild. The canonical browser check is `npm run test:smoke`; it starts Vite and uses Playwright to verify Monaco and both rain canvases. Install its browser once with `npx playwright install chromium`. Run `npm run ci` for the complete local gate — this is the only path a change needs to satisfy; there are no other verification scripts in the tree.

---

## TypeScript adoption (incremental, JSDoc-first)

This project stays vanilla ES modules; there is **no big-bang TS conversion**. Types
are added incrementally at stable seams and enforced by `npm run typecheck`
(`tsc --noEmit -p jsconfig.json`), which is part of `npm run ci` **and** runs as its
own step in the `syntax` job of `.github/workflows/ci.yml`, so a seam that stops
typechecking fails CI, not just a local run.

How it works:

- **`jsconfig.json`** is strict with `checkJs: false`: a `.js` file is
  type-checked only when it starts with `// @ts-check` (every `.js` in
  `include` must; `tests/architecture.test.js` enforces it). This lets a typed
  seam such as `createApp.js` import untyped modules without pulling their
  bodies into the strict program — their types are still inferred. The
  `include` list is curated: only files that are fully annotated and pass
  today. Typed seams today: `src/StorageAPI.js` (response shapes in
  `src/types/storage.d.ts`), `src/rendering/createGLContext.js`,
  `src/interactions/InputManager.js` + `InputRegistry.js`, the water-map sim
  seam `src/rain/WaterMapSim.js` + `optionsCodec.js` + `resolveBackend.js`, the
  frame clock `src/runtime/AppClock.js`, the boot seam
  `src/boot/createApp.js` + `domRefs.js`, the echo seam
  `src/tabManager/EchoLayer.js` + `layouts/*.js` + `viewModes.js` +
  `constants.js`, and `src/dom/sanitize.js`. Do not put `// @ts-check` on a file
  that doesn't pass — it is checked as soon as a typed seam imports it.
- **Untyped manager bodies** (`TabManager`, the mixin-composed `Cabinet3D`) and the WebGL-heavy
  `RainLayer` have **authored sibling `.d.ts` files** (`TabManager.d.ts`,
  `Cabinet3D.d.ts`, `RainLayer.d.ts`) describing their trusted public APIs.
  TypeScript resolves imports of `./TabManager.js` to the `.d.ts` for types, so
  agents get a reliable surface without type-checking the class bodies
  (TabManager's `toggleXView`/`isXView` members are generated from the
  view-mode registry, which TS cannot see). Keep these
  declarations in sync when you change a public method. The same trick covers a
  plain untyped dependency: `src/vendor/raindrops.js` (the legacy prototype-based
  main-thread sim) has a `raindrops.d.ts` sibling describing only the handful of
  members `WaterMapSim` actually uses, so its untyped body never enters the
  type-checked program.
- **Ambient shims** live in `src/types/globals.d.ts` (`*?glslify` shader imports,
  Vite's `*?worker` constructor imports, `import.meta.env`).

### Promoting a new file into `include`

1. Add JSDoc types and a `// @ts-check` first line (required — `checkJs` is
   off, so without it the file is not checked) to the `.js` file, reusing shapes from `src/types/*.d.ts` or
   `@typedef`s colocated in the file/module being typed.
2. Add the file's path to the `include` array in `jsconfig.json`, then run
   `npm run typecheck`.
3. **Any imported module that carries `// @ts-check` is type-checked too**, even
   if it's not itself listed in `include`; imports without the pragma only
   contribute inferred types. When a typed seam needs precise types from an
   untyped dependency, resolve it with the lightest fix that keeps the
   dependency's own body out of the checked set where practical:
   - A small, stable dependency: add minimal JSDoc directly to it (see
     `optionsCodec.js`/`resolveBackend.js`) and list it in `include` alongside the
     seam that needs it.
   - A larger or intentionally-untyped implementation (vendor code, a
     mixin-composed manager): author a sibling `<name>.d.ts` declaring only the
     members the typed seam actually calls, instead of annotating the
     implementation. TypeScript resolves the relative import to the `.d.ts` and
     never type-checks the `.js` body. Do **not** add the `.js` file itself to
     `include` in this case.
   - A Vite-specific import suffix (`?worker`, `?glslify`, `?url`, …) needs a
     `declare module "*?suffix"` ambient shim in `src/types/globals.d.ts` if one
     doesn't already exist for it.
4. Run `npm run typecheck` again and iterate until clean, then run `npm run ci`
   to confirm the rest of the gate (tests, build, smoke) still passes.

Optionally, a fully-typed seam can later be renamed to `.ts` (Vite compiles it
transparently); prefer this only once its JSDoc types are stable. Interaction
one-offs stay untyped JS until they move into managers. Non-goals: rewriting
shaders in TS, introducing a UI framework.

## Deployment

Production builds are emitted to `dist/` via `npm run build`. Deploy them through the storage service with a token supplied only through the process environment:

```bash
export DEPLOY_TOKEN='<token from the project secret manager>'
python deploy.py
```

`deploy.py` fails before making network requests if `DEPLOY_TOKEN` is missing. Never commit the token or put it in a tracked configuration file. `.env` is gitignored, but the script does not load it automatically.

---

## Security Considerations

- **`vite.config.js` allows FS access to `'..'`**. This is intentional for local development asset sharing but should be reviewed if the dev server is ever exposed.
- The app fetches remote content from `https://storage.noahcohn.com` (configurable via `VITE_STORAGE_BASE_URL`). File names (remote, VPS, cabinet) and file/note content are **untrusted**. Render them with `textContent`; when markup is unavoidable use `src/dom/sanitize.js`: `escapeHtml()` for strings, `setColorizedHtml()` for Monaco `colorize()` output, `setSanitizedHtml(el, html, MARKDOWN_POLICY)` for ReferenceManager markdown. Both rebuild DOM from a strict tag/attribute/class allowlist after inert `DOMParser` parsing. `tests/architecture.test.js` fails on any `innerHTML`/`outerHTML` assignment that is not an empty or static literal, and on `insertAdjacentHTML`/`document.write`. If a future feature needs general HTML (not the two fixed shapes), add `dompurify` rather than widening the allowlists.
- `DEPLOY_TOKEN` is required for production deployment and must be supplied through the process environment. Store it in the project secret manager, rotate it immediately after any suspected exposure, and never commit it.
- `deploy_old.py` is a legacy SFTP helper. It must prompt interactively for its password; never replace the prompt with a source-code literal.
- A deploy token was previously committed. Removing it from the current tree does not remove it from Git history; coordinate a `git filter-repo` or BFG rewrite before force-pushing if the repository is or was public.

---

## Key Integration Points

### Adding a new file tab

```js
const id = tabManager.addFile("name.js", "// code", "javascript");
tabManager.setActive(id);
```

### Fetching remote content

```js
import { StorageAPI } from "./src/StorageAPI.js";
const api = new StorageAPI(); // uses default base URL
const { content, language } = await api.getFileContent(id, type);
```

### Dispatching a file-open from the 3D cabinet

`Cabinet3D` fires:

```js
window.dispatchEvent(
  new CustomEvent("fileCubeClicked", {
    detail: { id, type: "shaders", name: "foo.wgsl", fileData, catIndex },
  }),
);
```

`boot/fileActions.js` (`openCabinetFile`) handles it, including the depth focus logic.

### Shader imports

```js
import fragSrc from "./shaders/my.frag?glslify";
```

The custom glslify plugin will compile the shader at build time and export it as a string.

### Depth system

Files/tabs exist at three depth levels:

- **0 (Deep)** — behind all rain layers (`z-index: 0`)
- **1 (Middle)** — between rain layers (`z-index: 5`)
- **2 (Front)** — above all rain (`z-index: 15`)

Opening a file from the 3D cabinet pushes existing tabs to depth 1 and pulls the new tab to depth 2.

### Depth & Spatial Interactions

The Alt/Shift/Ctrl gestures that manipulate echo documents in depth space
(peel, fanning, wormhole, x-ray, magnetic/proximity repulsion, lens
targeting, orbit/solar/helix rotation, siphon, …) live as focused classes
under `src/interactions/`, built on the shared `InputManager` +
`InputRegistry` and a small `depthState.js` helper module for common
echo/mouse math. See **`docs/depth-interactions.md`** for the full gesture
list and which class owns each one, and `initDepthGestures.js` for where a
new gesture gets wired up.

### Lenses (frozen catalog)

Lenses are hold-to-activate echo filters in the exclusive `"lens"` group.
They are defined **only** as rows in `src/interactions/lenses/catalog.js`
(`{ id, combo, description, effect: { kind, ...params } }`) and styled
**only** by `src/styles/lenses.css`, which implements each `kind` via
`body[data-lens-kind="…"]` plus CSS variables (`--lens-x/y`, `--lens-radius`,
`--lens-amount`, `--lens-blur`, `--lens-tint`, `--lens-filter`).

- **Do not add a new named CSS lens.** No new `*-lens(es).css` /
  `extra-lenses-*` files, no `body.<name>-lens-active` classes, no
  `lensBindings/` group files. Tune an existing row's params, extend a
  `kind` in `lenses.css`, or build a weather/view-mode instead.
- The catalog is capped at 14 rows. `npm run audit:lenses` (part of
  `npm run check`) prints the inventory and fails on duplicate ids, duplicate
  combos (within the catalog or against any other `combo:` in `src/`), the
  cap, or a reappearing per-lens stylesheet.
- `InputManager.register` throws on a duplicate **combo** as well as a
  duplicate id. Only bindings that both pass `sharedCombo: true` (bare
  modifier holds, `Escape`) may share one.
- If a remaining effect needs real distortion (refraction, ripple), it goes in
  a single fullscreen post pass owned by RainLayer/AppClock — not stacked
  `backdrop-filter`s.

### View modes & echo layouts

- **Registry:** `src/tabManager/viewModes.js` `VIEW_MODES` is the only list of
  view modes. Each row's `value` is the `#view-mode-select` option and session
  key; `toggle${name}View()` / read-only `is${name}View` are generated on
  `TabManager.prototype`; the body class is `${value}-active` unless
  `bodyClass` overrides; `hover` / `semanticGravity` / `tint` tune echo
  behavior. `sessionSchema.VIEW_MODE_TOGGLES` is derived from it. State is the
  single `tabManager.viewMode` string (`setViewMode(value)`,
  `toggleViewMode(value)`, `_deactivateAllViews()`).
- **Layouts:** each mode's echo positions are a pure function in
  `src/tabManager/layouts/` (`LayoutInput { index, count, viewport, seed,
  random, scroll, file } → Placement { tx, ty, tz, rotX, rotY, rotZ, stackZ?,
  opacity?, transform?, vars? }`), registered in `layouts/index.js` `LAYOUTS`.
  No DOM, `window`, or `Math.random()` (use `input.random`, seeded per file)
  — enforced by `tests/architecture.test.js`; `tests/echo-layouts.test.js`
  checks every layout is deterministic and finite for 1–40 documents. Modes
  without an entry (aurora, card-spread, dna-helix, outline) use the default
  `parallax` stack. Do not move layout math to WASM: the cost is node count
  and style recalc, not trig.
- **Virtualization:** `EchoLayer` renders at most `ECHO_POOL_SIZE` (12)
  `.echo-document` cards, colorizes only the nearest `ECHO_RICH_COUNT` (8)
  (cached per model version, rendered as DOM tokens), and draws up to
  `ECHO_STUB_LIMIT` (48) transform-only `.echo-stub` placeholders beyond that.
  Cards are recycled: listeners are bound once and read `card.file` at event
  time; each sync resets the card's classes/inline style like a fresh node.
  `tabManager.relayoutEchoes()` re-places without rebinding (archway scroll).
  Inspect with `tabManager.echoLayer.getDiagnostics()`.
- **Adding a view mode:** one `VIEW_MODES` row + one pure layout + its CSS +
  an `<option>` in `index.html` (the test suite checks every option is wired).

---

## Notes for Agents

- The `Kimi_Agent/` directory contains patches and alternate file versions. It is **not part of the main build** and should not be edited unless you are specifically working on agent-side patches.
- If you change any of the above architectural patterns (build tool, module wiring, backend base URL handling, or depth/view-mode systems), update this file to keep it accurate.

---

## Cursor Cloud specific instructions

- **Runtime**: Node 22 (`package.json` requires `>=22.0.0`). Dependencies install with plain `npm install`; the startup update script already runs this, so you normally do not need to reinstall.
- **Run the app (dev)**: `npm run dev` (Vite dev server, default port `5173`). Standard commands live in the `Build & Dev Commands` section above and in `package.json` — don't duplicate them. `dev.log` in the repo shows a past run using `--host 0.0.0.0 --port 3000`; that host/port is arbitrary, the app works on the default `5173`.
- **Lint/tests**: no linter is configured. Use `npm test` for focused Node tests, `npm run check` for the JavaScript parse gate, `npm run test:smoke` for the canonical browser smoke, and `npm run ci` for the complete local gate.
- **`src/` is split into many hand-maintained module files** (`boot/*.js`, `tabManager/*.js`, `cabinet3d/*.js`, `styles_*.css`, etc.). Vite fails hard on any single syntax error in these: `npm run dev` shows a blank page with a `Failed to scan for dependencies` / `Pre-transform error` in the Vite terminal, and `npm run build` aborts with `invalid JS syntax`. If the app renders blank, first check the Vite terminal (or run `node_modules/.bin/esbuild <file> --outfile=/dev/null` on suspect files) to locate the offending fragment before debugging anything else.
- **Backend**: `StorageAPI.js` calls the remote FastAPI backend at `https://storage.noahcohn.com` (override with `VITE_STORAGE_BASE_URL`). There is no local backend to run — File Cabinet / VPS Files features depend on that remote host being reachable. The editor, rain effects, tabs, and view modes all work fully offline without it.
