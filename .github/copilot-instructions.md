# Copilot Instructions

Read `AGENTS.md` before making architectural changes. It is the most complete repo-specific context file; `CLAUDE.md` is a shorter summary.

## Build, test, and lint commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

- There is no lint command configured in `package.json`.
- There is no formal automated test suite or single-test command in this repo.
- The only in-repo test artifact is an ad hoc visual smoke script: `python ui_test.py`. It expects the app to already be served at `http://localhost:4173` (for example via `npm run preview`) and requires Python Playwright to be installed.

## High-level architecture

- This is a single-page Vite app with one layered scene declared in `index.html`: Monaco editor, dual rain canvases, connection/matrix/fog/dust canvases, floating reference cards, echo documents, and holographic overlays all share the same viewport.
- `src/main.js` is the orchestrator. It imports Monaco workers explicitly, creates the editor, instantiates all managers, initializes the rain layers, bridges cross-module events, and runs the main animation loop.
- The rain effect is a pipeline: `src/vendor/raindrops.js` updates a water-map canvas, and `src/RainLayer.js` renders the back and front WebGL rain layers from that canvas plus shader textures.
- File editing state lives in `src/TabManager.js`. It owns Monaco models, the active tab, per-file depth, background echo rendering, and the many 3D echo layouts.
- Reference notes and semantic overlays are split across managers: `ReferenceManager` owns floating markdown cards and note interactions, `ConnectionManager` draws canvas links between editor focus words / cards / echoes, and `HoloManager` scans code comments like `// TODO:` into overlay badges.
- Remote content goes through `src/StorageAPI.js`, which is used by `Cabinet3D`, `VPSFileBrowser`, and `main.js`. `Cabinet3D` dispatches `fileCubeClicked`; `main.js` handles the event, fetches content, opens the tab, and adjusts depth focus.

## Key conventions

- This codebase uses plain ES modules and class-based manager objects, not React/Vue/Svelte. New UI is usually created directly in JS with `document.createElement(...)` and appended to existing layers.
- Prefer `CustomEvent` bridges for cross-module coordination when direct imports would couple subsystems too tightly. Existing events include `fileCubeClicked`, `echo-peek`, and `document-splash`.
- Visual behavior is controlled heavily through CSS custom properties and body classes. `TabManager` computes per-echo values such as `--tx`, `--ty`, `--tz`, and `--rot-*`; view modes work by toggling body classes and rerendering echoes instead of relying on isolated component state.
- Depth is shared application state, not just styling. Tabs/files move between depth levels 0/1/2, and opening a file from the 3D cabinet pushes existing tabs back to depth 1 while pulling the new tab to depth 2.
- Shader files must be imported with a `?glslify` suffix. The custom plugin in `vite.config.js` compiles those imports at build time.
- Monaco workers are imported manually in `main.js`. If you touch editor language support or upgrade Monaco, keep that worker wiring in sync.
- `StorageAPI` contains important backend normalization rules: the UI category `shaders` maps to backend type `shader`, notes are loaded separately and open as Markdown, and VPS file operations live under `/api/vps/*`.
- The Vite dev server intentionally allows file-system access to `..` so the app can reuse assets from a sibling `../ra1n` checkout. If those shared assets are unavailable locally, use `public/img/` copies instead.
- `window.tabManager` is intentionally exposed for manual/debug automation and is used by `ui_test.py`.
