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

The toolchain is pinned in `crates/rain-sim/rust-toolchain.toml` (rustup picks
it up because cargo runs inside the crate; install it once with
`rustup toolchain install 1.95.0 --profile minimal --target wasm32-unknown-unknown`).
Pinned, the build is byte-for-byte reproducible from any checkout path, so it
can be checked in CI:

- `npm run build:wasm` also writes `src/rain/wasm/rain_sim.manifest.json`:
  the sha256 of every crate input (`Cargo.toml`, `Cargo.lock`,
  `rust-toolchain.toml`, `src/**/*.rs`), the wasm's sha256 and size, and the
  `rustc --version` that built it.
- `tests/rain-wasm.test.js` (part of `npm test`, no Rust needed) fails when the
  crate changed without a rebuild, when the wasm was replaced without the build
  script, when it was built with a different toolchain, or when
  `wasmEngine.js` calls an export the wasm lacks.
- `.github/workflows/wasm.yml` runs when `crates/**`, the artifact, or the
  build scripts change: it installs the pinned toolchain, rebuilds, and fails
  if `src/rain/wasm/` differs from what is committed.

Commit a crate change, the rebuilt wasm, and its manifest together. To bump
Rust, change the channel, rebuild, and commit all three.

### Environment exports (optional)

The crate also exports `rain_sim_set_wind(ptr, vx, vy)` (moving drops drift by
`wind × fall momentum × 0.25`) and `rain_sim_set_shield(ptr, x, y, r)` — a
circular SDF in the same CSS-pixel space as `clear_droplets` that falling
drops are pushed out of and deflected around, and that rain/droplets never
spawn inside (`r <= 0` removes it). `wasmEngine.js` feature-detects both, so
an older artifact still runs. The worker reports them in its `ready` message
and `raindrops.getDiagnostics().features` (`{ wind, shield }`, false on the
`js`/`main` backends, which stay the parity reference and ignore wind).
`WaterMapSim.setWind()` / `setShield()` remember the last values and re-send
them after a backend switch; only `WeatherSystem` calls them.

Native work stays in this Rust crate (feature-detected, with JS worker parity).
Do not add a C++/Emscripten port of the same integrator; the next GPU step is
WGSL compute, after the shared compositing pass
(`docs/rendering-contexts.md`).

## Diagnostics

`raindrops.getDiagnostics()` reports the active backend,
`lastMainThreadSimMs`, `features`, and the last `environment` (wind/shield). Worker backends should keep that near 0 on desktop;
`main` includes the full CPU canvas sim cost.

## Weather system

`src/rain/WeatherSystem.js` is the control surface that makes the rain feel
alive. It owns `raindrops.options.{rainChance,dropletsRate,maxDrops,
trailRate,globalTimeScale}` and the front/back `RainLayer` refraction
uniforms (`u_alphaMultiply`, `u_alphaSubtract`, `u_minRefraction`,
`u_refractionDelta`) — no new shader uniforms were introduced. It is created
once in `src/boot/createApp.js` (shared as `appContext.weatherSystem`) and
`attach()`ed to `raindrops`/`bgLayer`/`fgLayer` once `RainScene.init()`
finishes building them (see `src/rain/RainScene.js`);
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
from the AppClock `rain` task in `src/rain/RainScene.js`; it measures elapsed time via
`performance.now()` internally. Tests call `update(dtMs)` with an explicit
step for deterministic timing (see `tests/weather-system.test.js`).

### Other inputs

- `setManualIntensity(sliderValue)` — the dock's **Storm Intensity** slider
  (0–100, default 30 == 1×), scales `rainChance` and `dropletsRate`.
- `setSceneMultiplier(factor)` — scales `rainChance` only; used to calm the
  rain while the 3D file cabinet is open (replaces the old one-off
  `raindrops.options.rainChance = …` assignment).

### Editor shield and wind

- `setShieldSource(() => rect | null)` — `createApp` passes the editor's
  bounding rect. While the editor is focused the shield strength ramps to 1
  (~400 ms) and back to 0 on blur. At full strength it posts ~30 small,
  centre-biased `clearDroplets` calls per second inside the rect
  (`sampleShieldClear`) on every backend, and hands `shieldCircle(rect,
  strength)` to `raindrops.setShield` so the wasm backend also deflects
  falling drops around the editor. Only changes are posted.
- Each mode has `wind: { calm, active }`; the damped value goes to
  `raindrops.setWind(vx, 0)` when it changes by ≥ 0.01.

### Atmosphere (lightning, hue, vignette)

`src/rain/Atmosphere.js` is the AppClock `atmosphere` task (no
`setInterval`/`setTimeout`). It owns the `--dynamic-hue` breathing (Monaco
markers + typing charge), heat shimmer, reference-card storm intensity, rain
streaks, the hyper-focus vignette, and lightning. Its `registerTyping(n)` is
the editor's single typing entry point and forwards to
`WeatherSystem.registerTyping`. Ambient strikes are spaced by the mode's
`lightning: { minGapMs, maxGapMs }` (`null` in drizzle/clearing → none),
plus a 20%/s chance of a close "surge" strike while typing hard. Every strike
notifies `onStrike()` listeners — `createApp` routes them to
`weatherAudio.thunder()`. A hidden tab pauses the clock, so lightning stops
with it; `setMuted(true)` (dock **Mute World**) stops strikes and adds
`.lightning-muted`; `prefers-reduced-motion` keeps strikes (thunder) but
never flashes.

### Time of day

`src/rain/DayCycle.js` is the AppClock `day-cycle` task: a 0..1 phase
(0 midnight, 0.25 dawn, 0.5 noon, 0.75 dusk) that ramps at 0.08/s toward the
target, the short way round. It writes `--sky-0` / `--sky-1` (page gradient),
`--glass-tint` (dock glass, an `r, g, b` triplet), `--day-phase`, and
`u_brightness` on both rain layers. Choose from the dock **Time** select,
`?time=clock|dawn|day|dusk|night`, or `localStorage['rain-edit:timeOfDay']`;
`clock` follows local time. `night` (the default) is the original look
exactly. Around noon the keyframes ask for the `sun` texture set
(`public/img/texture-sun-*.png`): it is only fetched once a non-night mode is
chosen, and `RainScene.setStaticTextures()` swaps it in only after both
images finish loading, so the swap never stalls a frame.

### Ambient audio

`src/audio/WeatherAudio.js` is optional weather audio. It never touches
`AudioContext` until `enable()` runs from a user gesture (the dock's
**Ambient Audio** checkbox — starts unchecked/muted), and has no loop of its
own: `WeatherSystem.update()` calls `audio.update(dt, activity)` each frame.
One graph feeds a `StereoPannerNode` and a master gain:

- **Bed** — looping filtered noise; the mode's `audio: { gain,
  filterFrequency, filterQ }` profile and the activity signal set its level.
- **Thunder** — `thunder({ distance, intensity })` schedules
  `public/audio/thunder.opus` (10 KB; a synthesized rumble stands in until it
  decodes, or if opus is unsupported) on the audio clock, 0.3–3 s after the
  flash and darker with distance.
- **Droplet ticks** — tiny noise bursts at ~0.4/s at rest up to ~2.5/s while
  typing; skipped under `prefers-reduced-motion`.
- **Spatial** — `setPan(x)` from the pointer's normalized X (±0.6 pan) and
  `setDepth(0|1|2)` from the active tab's depth (the `weather-listener`
  clock task): deeper tabs hear the rain muffled and quieter.

The master gain is 0 and the context is suspended whenever audio is disabled,
the world is muted (`setWorldMuted`, dock **Mute World**), or the tab is
hidden (`visibilitychange`).

### Diagnostics

`weatherSystem.getDiagnostics()` returns `{ mode, activity, focused,
manualMultiplier, sceneMultiplier, shieldStrength, wind, audioEnabled,
current }`, where `current` is the live damped value of every parameter above.
`appContext.atmosphere`, `appContext.dayCycle` and `appContext.weatherAudio`
each have a `getDiagnostics()` too — useful from the console
or a future on-screen diagnostics readout.
