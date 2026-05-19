# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Install & run dev server:**

```bash
npm install
npm run dev
# Open http://localhost:5173
```

**Build for production:**

```bash
npm run build
# Output in dist/
```

**Preview production build locally:**

```bash
npm run preview
```

## Project Overview

**rain-2** is a single-page web application: a Monaco code editor layered with WebGL rain effects, holographic UI, 3D file browser, and a connection graph overlay. It's vanilla JS (ES modules), no framework.

**Read AGENTS.md first** — it contains comprehensive architecture documentation, module relationships, deployment notes, and security considerations that are referenced here.

## Key Dev Commands

| Command            | Purpose                                                     |
| ------------------ | ----------------------------------------------------------- |
| `npm run dev`      | Start Vite dev server with hot reload (port 5173)           |
| `npm run build`    | Production build to `dist/` with code splitting             |
| `npm run preview`  | Serve the built `dist/` locally to test production build    |
| `python deploy.py` | SFTP upload `dist/` to remote server (requires built dist/) |

## Architecture Highlights

- **Manager pattern**: Most complex behavior lives in class-based managers (`TabManager`, `ReferenceManager`, `ConnectionManager`, `RainLayer`, etc.). Each typically has `constructor()`, `update()`, and `render()` methods.
- **Cross-module events**: Use `CustomEvent` for loose coupling (e.g. `fileCubeClicked`, `echo-peek`). See `main.js` for wiring.
- **CSS-driven effects**: CSS variables store runtime state (mouse coordinates, depth offsets, parallax). JS reads/writes `element.style.setProperty()` and `getComputedStyle()`.
- **Single large stylesheet**: `src/styles.css` (~3200 lines) uses CSS variables for theming and animation.

## Shader Development

Shaders are in `src/shaders/` (GLSL). Import them with a `?glslify` suffix:

```js
import fragSrc from "./shaders/water.frag?glslify";
```

The custom Vite plugin in `vite.config.js` processes them with the `glslify` library (macro system, imports, etc.). Changes to shader files trigger hot reload.

## Adding Features

### Adding a new manager

Create a new class in `src/ManagerName.js`. Wire it in `main.js`:

```js
import { ManagerName } from './src/ManagerName.js';
const manager = new ManagerName(domElement, ...);
```

### Adding a new DOM element

Use `document.createElement()` and explicit class/style setting. No templates:

```js
const el = document.createElement("div");
el.className = "my-element";
el.style.color = "#fff";
parent.appendChild(el);
```

### Communicating between modules

Prefer custom events over direct imports to avoid circular dependencies:

```js
// Dispatch
window.dispatchEvent(new CustomEvent("myEvent", { detail: { data } }));

// Listen
window.addEventListener("myEvent", (e) => {
  console.log(e.detail);
});
```

## Monaco Editor

Monaco workers are explicitly imported in `main.js` (not auto-discovered) because Vite needs to know about them. If upgrading monaco-editor, check that worker imports still match the new version.

## Backend Integration

`StorageAPI.js` is the HTTP client for the FastAPI backend. It talks to `https://storage.noahcohn.com` by default (configurable via `VITE_STORAGE_BASE_URL` env var). Used by `Cabinet3D` (file listing), `VPSFileBrowser` (remote file ops), and main.js for note categories.

## Common Patterns

- **File tabs**: `TabManager` owns the tab list and active Monaco model. Call `tabManager.addFile(name, content, language)` and `setActive(id)`.
- **View modes**: `TabManager.setViewMode(name)` switches between 20+ 3D layouts (waterfall, cascade, orbit, etc.).
- **Reference cards**: `ReferenceManager` parses markdown and renders floating cards with effects. Wired via `main.js`.
- **Depth sorting**: Files can be behind, between, or in front of rain layers. Controlled by CSS `z-index` and depth offsets.

## No Tests

This project has no test framework. If adding significant logic, consider a lightweight runner like Vitest.

## Style & Conventions

- **2-space indentation**, short lines.
- **No linting config**. Follow existing style.
- **No TypeScript** — plain ES modules.
- **DOM created in JS**, not HTML templates.
- **Comments only when WHY is non-obvious** (hidden constraints, subtle invariants, workarounds). Code should be self-documenting.

## Gotchas

- `vite.config.js` allows FS access to `..` so the dev server can reach sibling repos for assets. This is intentional but should be reviewed if the dev server is exposed.
- `deploy.py` contains hardcoded SFTP credentials. Do not commit changes that expose them.
- The app fetches remote content. Be mindful of XSS when rendering file contents from the backend.

## More Details

For deep dives into module relationships, integration points, backend API shape, and security notes, see **AGENTS.md**.
