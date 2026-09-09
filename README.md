# rain-2 — Monaco + dual rain layers

## Quick start

1. Install dependencies: `npm install`
2. Run dev server: `npm run dev`
3. Open http://localhost:5173

## Validation

```bash
# Focused Node tests
npm test

# Parse every src/**/*.js file with esbuild
npm run check

# Type-check the annotated seams
npm run typecheck

# Production build
npm run build

# Canonical browser smoke (one-time setup: npx playwright install chromium)
npm run test:smoke

# Complete local CI gate: check, typecheck, test, build, check:secrets, test:smoke
npm run ci
```

The Playwright smoke starts Vite itself and verifies that Monaco initializes and
both rain canvases are visible and sized. `npm run ci` is the whole gate —
there are no other verification scripts in the tree.

## Notes

- Vite bundles Monaco directly. Worker and language registration lives in
  `src/editor/setupMonaco.js`; no Monaco Vite plugin is installed.
- Shader imports ending in `?glslify` are compiled by the custom plugin in
  `vite.config.js`; no Rollup glslify plugin is installed.
- This demo reuses the original raindrops simulation from `../ra1n/src/raindrops.js` to drive the dynamic water map. The Vite dev server is configured to allow access to the parent folder (so assets can be referenced from the original project). If you prefer to copy images locally, put them under `public/img/`.

## Deployment

1. Build the production bundle: `npm run build`
2. Obtain the current deploy token from the project secret manager. Never commit it or place it in a tracked file.
3. Export it for the current shell: `export DEPLOY_TOKEN='<token>'`
4. Run `python deploy.py`

The deploy script exits before making network requests when `DEPLOY_TOKEN` is missing. Local `.env` files are ignored by Git, but `deploy.py` reads only the process environment and does not load `.env` automatically.
