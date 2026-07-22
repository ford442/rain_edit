# Water-map simulation backends

The dynamic water map is produced by `src/rain/WaterMapSim.js`, which keeps the
same caller API as the legacy `src/vendor/raindrops.js` simulator
(`update`, `clearDroplets`, `splash`, `options`, `canvas`).

## Backends

| Id | Where it runs | Notes |
| --- | --- | --- |
| `wasm` | Dedicated worker + Rust `crates/rain-sim` | Writes RGBA8 into wasm memory; main thread only uploads textures. |
| `js` | Dedicated worker + OffscreenCanvas | Same algorithm as `vendor/raindrops.js`; visual reference for parity. |
| `main` | Main thread | Legacy fallback when `Worker` / `OffscreenCanvas` are unavailable. |
| `auto` | Prefer `wasm`, else `js`, else `main` | Default preference. |

Selection order: `?rainSim=` URL param → `localStorage['rain-edit:rainSimBackend']`
→ `auto`. The dock **Rain Sim** control hot-swaps backends for visual comparison.

## Vite integration

`src/rain/wasmEngine.js` imports the artifact with:

```js
import wasmUrl from "./wasm/rain_sim.wasm?url";
```

Vite emits the `.wasm` into `dist/assets/` automatically (`assetsInclude: **/*.wasm`).
Do not copy it into `public/`. Regenerate the checked-in binary with:

```bash
npm run build:wasm
```

Requires a Rust toolchain with the `wasm32-unknown-unknown` target.

## Diagnostics

`raindrops.getDiagnostics()` reports the active backend and
`lastMainThreadSimMs`. Worker backends should keep that near 0 on desktop;
`main` includes the full CPU canvas sim cost.
