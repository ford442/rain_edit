# rain-2 — Agent Context

This document contains project-specific context for AI coding agents. If you are modifying code here, read this first.

---

## Project Overview

**rain-2** is a single-page frontend application that combines a Monaco code editor with immersive WebGL rain effects, holographic UI overlays, and a 3D file cabinet browser. It is a vanilla-JavaScript ES-module project built with Vite. The visual metaphor is "code editing inside a storm": documents exist at different z-depths (behind rain, between rain layers, or in front), and inactive files are rendered as blurred "echo" documents in the background.

Key product features:
- Monaco editor with transparent cyberpunk theme.
- Dual WebGL rain layers (front and back) driven by a dynamic water-map simulation.
- Reference layer: floating markdown note cards with lantern, spotlight, frost, and rain-shield effects.
- Connection manager: draws animated canvas lines between editor focus words, reference cards, and echo documents.
- Tab manager: supports 20+ 3D view modes (waterfall, cascade, orbit, scattered, isometric, tunnel, grid, helix, vortex, constellation, prism, coverflow, sphere, wave, black hole, rolodex, cylinder, etc.).
- 3D File Cabinet (Three.js): a "cube of cubes" browser that fetches categorized files from a remote FastAPI backend.
- VPS File Browser: browse, open, and save files to a remote VPS path via the same backend.
- Holographic comment parser: turns `// TODO:`, `// FIXME:`, etc. into floating UI badges.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Build tool | Vite 5 |
| Language | Vanilla ES modules (JavaScript), no TypeScript |
| Editor | `monaco-editor` (workers imported explicitly in `main.js`) |
| 3D graphics | `three` (used only in `Cabinet3D.js`) |
| Shaders | Custom WebGL in `RainLayer.js`; GLSL source files compiled via `glslify` |
| Styling | Single large `src/styles.css` (~3200 lines), heavy use of CSS variables |
| Backend client | `StorageAPI.js` talks to a FastAPI backend |
| Deployment | Python script (`deploy.py`) using `paramiko` for SFTP upload |

---

## Project Structure

```
root/
  index.html              # SPA shell: many layered divs/canvases for effects
  package.json            # npm scripts: dev, build, preview
  vite.config.js          # Vite config + custom glslify plugin
  deploy.py               # SFTP deployment script
  src/
    main.js               # Entry point: bootstrap Monaco, init all managers, animation loop
    TabManager.js         # File tabs, depth switching, echo rendering, view modes
    ConnectionManager.js  # Canvas overlay drawing semantic links
    ReferenceManager.js   # Markdown note cards + visual effects
    FogManager.js         # Canvas fog that regenerates and is cleared by mouse
    HoloManager.js        # Scans editor for // TODO/FIXME/etc. and renders badges
    RainLayer.js          # WebGL helper: compiles shaders, binds textures, draws fullscreen quad
    StorageAPI.js         # HTTP client for categories, notes, and VPS file operations
    Cabinet3D.js          # Three.js modal file browser (category cubes -> file cubes)
    VPSFileBrowser.js     # Slide-in panel to browse/open/save VPS remote files
    UploadProgressUI.js   # Small toast UI for drag-and-drop uploads
    styles.css            # All application styles, themes, animations
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
  public/img/             # Optional local texture assets
```

### Module relationships
- `main.js` is the orchestrator. It imports all other managers and wires them together.
- `TabManager` owns the list of open files, switches active models in Monaco, and renders background echoes in `#echo-layer`.
- `ReferenceManager` owns `#reference-layer` and `#reference-overlay`. It parses markdown into floating cards and handles lantern/spotlight/frost interactions.
- `ConnectionManager` draws on `#connections-layer` using 2D canvas. It receives focus data from `ReferenceManager` and echo targets from `TabManager` (indirectly via main.js).
- `StorageAPI` is a thin REST client. It is consumed by `Cabinet3D`, `VPSFileBrowser`, and `main.js`.
- `Cabinet3D` dispatches a custom `fileCubeClicked` event on `window`; `main.js` listens for it to open files and adjust depth focus.

---

## Build & Dev Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Production build -> dist/
npm run build

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
- **CSS variables** drive many runtime visual effects (mouse coordinates, depth offsets, parallax, etc.). The JS frequently reads/writes inline styles and CSS custom properties.
- **Shaders** are imported with a `?glslify` suffix, handled by a small custom Vite plugin in `vite.config.js`.
- **No linting or formatting config** is present. Follow the existing 2-space indentation and keep lines reasonably short.
- When adding new DOM elements from JS, create them with `document.createElement`, set classes/styles explicitly, and append. No JSX or template system is used.

---

## Testing

There is **no test framework** and **no tests** in this project. If you add significant logic, consider adding a lightweight test runner (e.g. Vitest) and placing tests next to source files or in a `tests/` directory.

---

## Deployment

Deployment is handled by `deploy.py`:

1. Run `npm run build` to produce the `dist/` directory.
2. Run `python deploy.py` to SFTP-upload `dist/` to the remote server.

The script uses hardcoded credentials. If you modify deployment behavior, be careful not to break the existing flow for the project's owner.

---

## Security Considerations

- **`deploy.py` contains a hardcoded password** (`GoogleBez12!`) and SFTP credentials. Do not expose this file in public repositories.
- **`vite.config.js` allows FS access to `'..'`**. This is intentional for local development asset sharing but should be reviewed if the dev server is ever exposed.
- The app fetches remote content from `https://storage.noahcohn.com` (configurable via `VITE_STORAGE_BASE_URL`). Be mindful of XSS when rendering remote file contents; the existing code does basic HTML escaping in some places but not all.

---

## Key Integration Points

### Adding a new file tab
```js
const id = tabManager.addFile('name.js', '// code', 'javascript');
tabManager.setActive(id);
```

### Fetching remote content
```js
import { StorageAPI } from './src/StorageAPI.js';
const api = new StorageAPI(); // uses default base URL
const { content, language } = await api.getFileContent(id, type);
```

### Dispatching a file-open from the 3D cabinet
`Cabinet3D` fires:
```js
window.dispatchEvent(new CustomEvent('fileCubeClicked', {
  detail: { id, type: 'shaders', name: 'foo.wgsl', fileData, catIndex }
}));
```
`main.js` listens and handles depth focus logic.

### Shader imports
```js
import fragSrc from './shaders/my.frag?glslify';
```
The glslify plugin will compile the shader at build time and export it as a string.

---

If you change any of the above architectural patterns (build tool, module wiring, deployment method, or backend base URL handling), update this file to keep it accurate.
