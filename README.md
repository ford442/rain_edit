rain-2 — Monaco + dual rain layers

Quick start

1. Install dependencies: `npm install`
2. Run dev server: `npm run dev`
3. Open http://localhost:5173

Notes

- This project uses `vite` and `vite-plugin-monaco-editor` to bundle Monaco and its workers.
- Shaders are handled via `rollup-plugin-glslify` so the same `glslify` style imports should work.
- This demo reuses the original raindrops simulation from `../ra1n/src/raindrops.js` to drive the dynamic water map. The Vite dev server is configured to allow access to the parent folder (so assets can be referenced from the original project). If you prefer to copy images locally, put them under `public/img/`.

Deployment

1. Build the production bundle: `npm run build`
2. Obtain the current deploy token from the project secret manager. Never commit it or place it in a tracked file.
3. Export it for the current shell: `export DEPLOY_TOKEN='<token>'`
4. Run `python deploy.py`

The deploy script exits before making network requests when `DEPLOY_TOKEN` is missing. Local `.env` files are ignored by Git, but `deploy.py` reads only the process environment and does not load `.env` automatically.
