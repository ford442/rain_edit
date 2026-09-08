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

## Weather system

`src/rain/WeatherSystem.js` is the control surface that makes the rain feel
alive. It owns `raindrops.options.{rainChance,dropletsRate,maxDrops,
trailRate,globalTimeScale}` and the front/back `RainLayer` refraction
uniforms (`u_alphaMultiply`, `u_alphaSubtract`, `u_minRefraction`,
`u_refractionDelta`) — no new shader uniforms were introduced. It is created
once (`window.weatherSystem`) and `attach()`ed to `raindrops`/`bgLayer`/
`fgLayer` once `initLayers()` finishes building them (see `main_vars_0.js`);
the dock's Weather select and Storm Intensity slider work immediately since
they only touch `WeatherSystem`'s own state.

### Weather modes

Defined in `src/rain/weatherModes.js` as `WEATHER_MODES`: `drizzle`,
`steady` (default — matches the original hard-coded rain look byte-for-byte
at zero activity), `storm`, `clearing`. Each mode has a `calm` and `active`
parameter set; `computeWeatherTargets(mode, activity)` linearly interpolates
between them. Switching modes (`weatherSystem.setMode(id)`) never tears down
a GL context — it just changes what the per-frame damping loop converges
toward, so the transition is smooth. Selectable from the dock's **Weather**
control, `?weather=drizzle|steady|storm|clearing`, or
`localStorage['rain-edit:weatherMode']` (same priority order as the rain-sim
backend override).

### Activity signal

`WeatherSystem` tracks a damped 0..1 "activity" value from editor signals:

- `registerTyping(charCount)` — called from `editor.onDidChangeModelContent`.
- `registerCursorMove()` — called from `editor.onDidChangeCursorPosition`.
- `registerFocus(hasFocus)` — called from `onDidFocusEditorText` /
  `onDidBlurEditorText`; rain settles back to calm when the editor loses
  focus.

Each call adds a "kick" that decays with a ~900 ms time constant; the kicks
feed an instantaneous activity target that is itself smoothed with a ~200 ms
time constant, and the resulting per-parameter targets are damped again with
a ~240 ms time constant before being applied. In practice this means typing
visibly changes the rain within roughly 200–400 ms, without snapping.

`weatherSystem.update()` (no arguments) is called once per animation frame
from the rain RAF loop in `main_vars_0.js`; it measures elapsed time via
`performance.now()` internally. Tests call `update(dtMs)` with an explicit
step for deterministic timing (see `tests/weather-system.test.js`).

### Other inputs

- `setManualIntensity(sliderValue)` — the dock's **Storm Intensity** slider
  (0–100, default 30 == 1×), scales `rainChance` and `dropletsRate`.
- `setSceneMultiplier(factor)` — scales `rainChance` only; used to calm the
  rain while the 3D file cabinet is open (replaces the old one-off
  `raindrops.options.rainChance = …` assignment).

### Ambient audio

`src/audio/WeatherAudio.js` is an optional filtered-noise rain bed. It never
touches `AudioContext` until `enable()` runs from a user gesture (the dock's
**Ambient Audio** checkbox — starts unchecked/muted). `WeatherSystem` pushes
the active mode's `audio: { gain, filterFrequency, filterQ }` profile into it
on `attach()` and on every `setMode()`, and feeds the activity signal into
`setIntensity()` each frame so the bed swells slightly while typing.

### Diagnostics

`weatherSystem.getDiagnostics()` returns `{ mode, activity, focused,
manualMultiplier, sceneMultiplier, audioEnabled, current }`, where `current`
is the live damped value of every parameter above — useful from the console
or a future on-screen diagnostics readout.
