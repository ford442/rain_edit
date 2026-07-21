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
- Tab manager: supports 25+ 3D view modes (waterfall, cascade, orbit, scattered, isometric, stack, timeline, tunnel, grid, helix, pinboard, vortex, constellation, prism, coverflow, sphere, wave, black hole, rolodex, cylinder, galaxy, data-hive, origami, matrix-rain, crystal, fractal).
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
| Styling        | Sequential `src/styles_1.css`–`styles_14.css` shards, heavy use of CSS variables             |
| Backend client | `StorageAPI.js` talks to a FastAPI backend at `https://storage.noahcohn.com`                  |
| Dev server     | Vite (port 5173); configured to allow FS access to parent directory (`'..'`)                  |

---

## Project Structure

```
root/
  index.html              # SPA shell: many layered divs/canvases for effects
  package.json            # npm scripts: dev, test, build, preview
  vite.config.js          # Vite config + custom glslify plugin
  git.sh                  # Simple helper: git add/commit/push
  src/
    main.js               # Thin entry point; loads Monaco setup, state shards, then init shards
    main_vars_0.js - main_vars_2.js # Transitional global state/function shards
    main_init_0.js - main_init_4.js # Transitional side-effect initialization shards
    editor/
      setupMonaco.js      # Sole Monaco language/worker registration point
    interactions/
      InputRegistry.js    # Listener lifecycle/disposal helper
      MagnifierLens.js    # Alt+M obscured-layer magnifier
      MagneticRepulsion.js # Alt+Shift+M magnetic separation
    TabManager.js         # File tabs/depth shell composed with TabManager_0.js - TabManager_7.js mixins
    ConnectionManager.js  # Radar/minimap canvas drawing (echo blips + reference cards)
    ReferenceManager.js   # Markdown note cards + visual effects (lantern, spotlight, frost, drag)
    FogManager.js         # Canvas fog that regenerates and is cleared by mouse
    HoloManager.js        # Scans editor for // TODO/FIXME/etc. and renders badges
    RainLayer.js          # WebGL helper: compiles shaders, binds textures, draws fullscreen quad
    StorageAPI.js         # HTTP client for categories, notes, and VPS file operations
    Cabinet3D.js          # Three.js modal file browser (split into Cabinet3D_0.js - Cabinet3D_1.js mixins)
    VPSFileBrowser.js     # Slide-in panel to browse/open/save VPS remote files
    UploadProgressUI.js   # Small toast UI for drag-and-drop uploads
    styles_1.css - styles_14.css # Split CSS files imported in index.html (~600 lines each)
    shaders/
      simple.vert         # Basic fullscreen vertex shader
      water.frag          # Front rain fragment shader
      water-back.frag     # Back rain fragment shader
    vendor/
      raindrops.js        # Original raindrop simulation (drives water map)
      create-canvas.js
      image-loader.js
      random.js
      times.js
  public/img/             # Local texture assets (drop-alpha, drop-color, textures, backgrounds)
  tests/                  # Focused Node tests for extracted domain modules
  Kimi_Agent/             # Agent workspace: patches and alternate file versions (not part of main build)
  .github/copilot-instructions.md  # Copilot guidance; references this file as primary architecture doc
```

### Module relationships

- `main.js` is the build entry point. It loads `editor/setupMonaco.js` once, then the transitional `main_vars_*` state shards followed by `main_init_*` initialization shards. Do not recreate deleted `main_0.js`–`main_6.js` files or add another full Monaco import block.
- New or extracted interactions belong in `src/interactions/` as named classes/functions with explicit DOM or manager dependencies, an `init()`/`destroy()` lifecycle, and focused tests. Do not add new `window.*` globals.
- `main_vars_*` and `main_init_*` remain legacy migration surfaces. When touching a self-contained feature there, prefer extracting it into a domain module rather than appending another listener block.
- `TabManager` owns the list of open files, switches active models in Monaco, manages per-file depth (0/1/2), and renders background echoes in `#echo-layer`. It implements 25+ CSS-driven 3D view modes.
- `ReferenceManager` owns `#reference-layer` and `#reference-overlay`. It parses markdown into floating cards and handles lantern/spotlight/frost interactions, drag-and-drop, and rain-shield clearing.
- `ConnectionManager` draws on the radar canvas (`#radar-canvas`) using 2D canvas. It receives reference card data from `ReferenceManager` and echo targets from the DOM.
- `StorageAPI` is a thin REST client. It is consumed by `Cabinet3D`, `VPSFileBrowser`, and `main.js`.
- `Cabinet3D` dispatches a custom `fileCubeClicked` event on `window`; `main.js` listens for it to open files and adjust depth focus.
- `window.tabManager` is intentionally exposed on the global object for manual/debug automation.

---

## Build & Dev Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build -> dist/
npm run build

# Focused Node tests
npm test

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

Focused unit tests use the built-in Node test runner and live in `tests/*.test.js`; run them with `npm test`. The build workflow runs both `npm test` and `npm run build`. Browser-only verification scripts under `verification/` are not part of the Node unit-test glob and may require Chromium permissions.

---

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
- The app fetches remote content from `https://storage.noahcohn.com` (configurable via `VITE_STORAGE_BASE_URL`). Be mindful of XSS when rendering remote file contents; the existing code does basic HTML escaping in some places but not all.
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

`main.js` listens and handles depth focus logic.

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

---

## Notes for Agents

- The `Kimi_Agent/` directory contains patches and alternate file versions. It is **not part of the main build** and should not be edited unless you are specifically working on agent-side patches.
- If you change any of the above architectural patterns (build tool, module wiring, backend base URL handling, or depth/view-mode systems), update this file to keep it accurate.

---

## Cursor Cloud specific instructions

- **Runtime**: Node 22 (`package.json` requires `>=22.0.0`). Dependencies install with plain `npm install`; the startup update script already runs this, so you normally do not need to reinstall.
- **Run the app (dev)**: `npm run dev` (Vite dev server, default port `5173`). Standard commands live in the `Build & Dev Commands` section above and in `package.json` — don't duplicate them. `dev.log` in the repo shows a past run using `--host 0.0.0.0 --port 3000`; that host/port is arbitrary, the app works on the default `5173`.
- **Lint/tests**: none exist (no linter config, no test framework/tests). See the `Testing` section above. "Passing lint/tests" is not applicable in this repo.
- **`src/` is split into many hand-maintained fragment files** (`main_*.js`, `TabManager_*.js`, `Cabinet3D_*.js`, `styles_*.css`, etc.). Vite fails hard on any single syntax error in these: `npm run dev` shows a blank page with a `Failed to scan for dependencies` / `Pre-transform error` in the Vite terminal, and `npm run build` aborts with `invalid JS syntax`. If the app renders blank, first check the Vite terminal (or run `node_modules/.bin/esbuild <file> --outfile=/dev/null` on suspect files) to locate the offending fragment before debugging anything else.
- **Backend**: `StorageAPI.js` calls the remote FastAPI backend at `https://storage.noahcohn.com` (override with `VITE_STORAGE_BASE_URL`). There is no local backend to run — File Cabinet / VPS Files features depend on that remote host being reachable. The editor, rain effects, tabs, and view modes all work fully offline without it.
