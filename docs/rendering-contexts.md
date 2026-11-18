# Rendering contexts

Two factories own every canvas context in `src/` (enforced by
`tests/architecture.test.js`):

- `src/rendering/createGLContext.js`: WebGL contexts (rain layers, cabinet).
- `src/rendering/create2DContext.js`: 2D contexts (matrix, dust, fog, radar,
  water map, drop atlas, cabinet labels, veil mask, rain worker).

Keep context attributes there instead of calling `canvas.getContext()` in
feature code.

## WebGL context policy

**Do not regress these defaults.**

| Attribute | Rain | Cabinet | Why |
| --- | --- | --- | --- |
| `alpha` / `premultipliedAlpha` | `true` / `true` | `true` / `true` | Canvases composite with DOM layers. |
| `antialias` | `false` | `true` | Fullscreen post-processing vs. 3D geometry. |
| `powerPreference` | `high-performance` | same | Discrete GPU when present. |
| `failIfMajorPerformanceCaveat` | `false` | `false` | Keep a software/fallback path instead of failing startup. |
| `preserveDrawingBuffer` | `false` | `false` (`?cabinetPreserveBuffer=1` diagnostic override) | Nothing reads a drawing buffer after it is presented (see compositing below). |

Rain requests WebGL2 first and falls back to WebGL1. The cabinet requires
WebGL2 (`webgl1Fallback: false`); its context is created first and injected
into `THREE.WebGLRenderer({ canvas, context })`.

The WebGL1 fallback probes `OES_texture_float`, `OES_texture_float_linear`,
and `OES_standard_derivatives`. None is required by the current unsigned-byte,
2D-canvas water map. Add an extension to `requiredExtensions` only when a
renderer genuinely cannot run without it.

## Shaders

Rain shaders are authored as **GLSL ES 3.00** and compiled verbatim on
WebGL2. Each has a **GLSL ES 1.00 copy** compiled only on the WebGL1 fallback.
Nothing is string-rewritten at runtime on either path.

| Stage | WebGL2 (ES 3.00) | WebGL1 (ES 1.00) |
| --- | --- | --- |
| Fullscreen quad | `src/shaders/simple.vert` | `src/shaders/simple.es100.vert` |
| Front pass (drops) | `src/shaders/water.frag` | `src/shaders/water.es100.frag` |
| Back pass | `src/shaders/water-back.frag` | `src/shaders/water-back.es100.frag` |

- `src/shaders/index.js` imports each file with Vite's built-in `?raw` and
  exports `{ name, es300, es100 }` bundles (`RAIN_VERTEX`, `WATER_FRONT`,
  `WATER_BACK`). Because `?raw` is verbatim, compile-log line numbers match
  the files.
- `src/rendering/shaderProgram.js` picks the variant for the context's API
  (`selectShaderSource`), compiles, links, and returns a structured
  `ShaderLog`. It never throws on GLSL errors.
- When you change a shader, change both copies. `tests/shaders.test.js` fails
  if an ES 3.00 file keeps ES 1.00 syntax, or if the two copies disagree on
  their uniform or function sets. The browser smoke compiles both paths.
- There is no shader preprocessor. glslify was removed because no shader used
  `#pragma glslify`. Only `texCoord()` is shared between the two fragment
  shaders, so includes would add a build step for one three-line function.
  Reintroduce a preprocessor only when a real shared module exists.

`?rainGL=webgl1` forces the rain contexts onto WebGL1 so the ES 1.00 copies
can be exercised on any browser. (The cabinet stays WebGL2, so its shared rain
pass still compiles ES 3.00.)

## Diagnostics

`RainLayer#getDiagnostics()` reports:

- `api`, granted context `attributes`, and `extensions`;
- `running`, `contextLost`, and `error` (a one-line build failure summary);
- `shaderLog`: per stage, the file name, the GLSL version actually compiled,
  status, raw driver info log, and parsed messages with the offending source
  line. Also link status and timings;
- `shaderBuilds`: 1, plus one per context restoration;
- `uploads[sampler]`: `{ kind, count, lastMs, averageMs, maxMs }` CPU-side
  cost of each `texImage2D` (or `copy` for in-context framebuffer copies),
  and `lastTexImage2D`;
- `ownsContext`, `composite`, `visible`, and drawing-buffer and CSS sizes.

A shader that fails to compile no longer aborts rain start-up. The layer stays
`running: false`, logs the formatted `ShaderLog` with `console.error`, and
keeps its diagnostics reachable through `appContext.bgLayer` /
`appContext.fgLayer`.

`?shaderDebug=1` adds a fixed text overlay (`#shader-debug`, refreshed every
500 ms by the non-decorative AppClock task `shader-debug`). It shows both rain
layers (API, attributes, shader log with source excerpts, texImage2D timings),
the cabinet compositing mode and shared-pass stats, and the 2D contexts'
requested and granted attributes.

`rainScene.getCompositingDiagnostics()` is the source of truth for how the
cabinet and rain were composited on the last frame.
`cabinet3D.getCompositingDiagnostics()` reports only cabinet-side facts: its
context, `preserveDrawingBuffer`, and fallback-upload stats.

## 2D context policy

| Canvas | `alpha` | `desynchronized` | `willReadFrequently` |
| --- | --- | --- | --- |
| matrix, dust | `true` | `?desync2d=1` experiment | `false` |
| fog, radar | `true` | `false` | `false` |
| water map / droplets / drop sprites (`vendor/raindrops.js`), worker present canvas | `true` | `false` | `false` |
| drop-atlas sprites (`rain/dropAtlas.js`) | `true` | `false` | `true` (`getImageData` per sprite) |
| veil mask (`VeilExcavator`) | `true` | `false` | `true` (`getImageData` hit test) |
| cabinet labels/badges | `true` | `false` | `false` |

Every surface keeps `alpha: true`. Each one either composites over DOM layers
or carries meaning in its alpha channel (the water map's alpha is the drop
mask). `desynchronized` (low-latency, may tear) is off by default.
`?desync2d=1|0` or `localStorage['rain-edit:desync2d'] = "1"` opts matrix and
dust in. `get2DContextInfo(ctx)` (and the overlay) shows what the browser
granted. Chromium 151 grants it. Engines that ignore the hint report `false`.

## Context loss

`RainLayer` owns `webglcontextlost` and `webglcontextrestored` listeners. Loss
prevents the browser's default permanent teardown, idles the AppClock `rain`
task (`src/rain/RainScene.js`), and marks uploads and draws inactive.
Restoration clears the lost flag first, then rebuilds the program, vertex
buffer, uniform locations, texture objects, cached texture sources, and cached
uniform values. The task resumes only once both rain contexts are healthy.

Before 2026-11, the lost flag was cleared after the rebuild, so cached
textures and uniforms were silently skipped. The static foreground and
background images stayed missing after a restore. The smoke test
`context loss rebuilds the program and re-uploads cached textures` covers
this. Call `destroy()` to remove the listeners and GPU resources.

Losing the **cabinet** context while it is open switches compositing to
`cabinet-only`: front rain returns, and nothing uploads the lost canvas. On
restore, Three re-initialises, the shared pass rebuilds in the same context,
and the compositor calls `renderer.resetState()`. Three resets its clear colour
on restore, so the cabinet re-applies `setClearColor(0x020a14, 0.92)` from its
own `webglcontextrestored` listener. Without that, the cabinet background
turned transparent after a restore on both compositing paths.

## Device-pixel sizing

Canvas CSS dimensions are container dimensions in CSS pixels. Backing dimensions
are `round(cssSize * devicePixelRatio)`. `resizeCanvasToDisplaySize()` owns that
conversion for both rain layers and the related full-container 2D effects.
Sizing against `#editor` is incorrect because view CSS may transform or collapse
the editor independently of the rain canvases.

## Cabinet-to-rain compositing

The cabinet has no loop of its own. The AppClock `rain` task renders it, and a
fallback `cabinet` task renders it only when rain can't (still loading, or a
rain context is lost), so the cabinet is never driven twice.

### Default: shared-context pass

While the cabinet is open, the front rain refraction pass runs inside the
cabinet's own WebGL2 context (`src/rendering/Compositor.js`). Per frame, in
one AppClock tick:

1. `cabinet3D.renderFrame()`: Three draws the cabinet to its canvas.
2. `renderer.resetState()`: GL defaults (VAO, blend, framebuffer) before raw
   GL. `RainLayer` also sets its unpack and draw state explicitly, because
   Three leaves `UNPACK_FLIP_Y_WEBGL` set after texture uploads.
3. `copyTexSubImage2D`: GPU copy of that frame into the pass's `u_textureFg`.
4. `texImage2D(waterMap)`: the WASM/JS water map, as for any rain layer.
5. `water.frag` draws the drops **over** the frame (`ONE, ONE_MINUS_SRC_ALPHA`),
   refracting the cabinet copy.
6. `renderer.resetState()`: invalidate Three's state cache.

Nothing crosses a context boundary: zero cabinet-canvas uploads instead of
three. `preserveDrawingBuffer` stays `false` because the copy happens before
the frame is presented. `#rain-front` is suspended (`visibility: hidden`;
the dock's toggle owns `display`) and skips its water-map upload. `#rain-back`
shows its static backdrop rather than a cabinet upload.

Visual parity with the old path:

- The blend equals the browser stacking a premultiplied rain canvas over the
  cabinet canvas.
- One difference: the GPU copy holds premultiplied pixels, while the old
  `texImage2D` un-premultiplied them. Drops over the 92%-opaque background
  sample about 8% darker. The background is near-black (`#020a14`), so this is
  imperceptible.
- While the cabinet is open, `#rain-front`'s view-mode CSS (opacity, filters,
  transforms) no longer applies to the drops, since they are drawn in the
  cabinet canvas.
- The pass runs at the cabinet canvas's resolution (Three's
  `setPixelRatio(devicePixelRatio)`). Low LOD's rain DPR cap of 1 does not
  apply to it, so on high-DPR phones the drop pass shades more pixels than the
  capped `#rain-front` did. If that shows up in device profiling, cap the
  cabinet's pixel ratio under low LOD as well.

With the dock's front-rain toggle off, the cabinet renders alone
(`cabinet-only`).

This keeps the separate rain-back and rain-front contexts. They are separate
DOM canvases with the Monaco editor stacked between them, and one WebGL
context cannot present to two canvases. "One context" therefore means the
cabinet-plus-refraction composite, which is where the cross-context traffic
was.

### Fallback: synchronized cross-context upload

`?cabinetCompositing=upload`, or a shared pass that cannot build, uses the
previous path. It renders the cabinet, then uploads its canvas into
`#rain-back` (`u_textureBg`) and `#rain-front` (`u_textureBg`, `u_textureFg`)
in the same tick. Render and upload must stay adjacent, because the cabinet
drawing buffer is not preserved. `?cabinetPreserveBuffer=1` remains a
diagnostic for this path only.

### Measurements

Chromium 151 with SwiftShader, 1280x720 at DPR 1, cabinet open, 8 s window
after warm-up, 2026-11-18. These are software-renderer numbers, not GPU
benchmarks:

| Path | Cabinet canvas uploads / frame | In-context copy | Water-map `texImage2D` per context |
| --- | --- | --- | --- |
| shared-context pass | 0 | 0.03 ms avg | ≈6–7 ms (back + cabinet pass) |
| cross-context upload | 3 (0.35 ms avg total) | — | ≈6.7–7.5 ms (back + front) |

The water-map upload, not the cabinet, dominates per-context upload cost. It
is the next thing to attack (for example `texSubImage2D` or an
`ImageBitmap`/WGSL path), after this shared pass, as planned.

Older measurements (2026-07-21, cross-context path, four samples): 960x540
mean 0.275 ms / max 0.600 ms; 390x844 at DPR 2 mean 0.625 ms / max 1.900 ms.

## Browser smoke gate

`npm run test:smoke` (Chromium with SwiftShader) covers:

- ES 3.00 compile on WebGL2 and the ES 1.00 copies under `?rainGL=webgl1`,
  each with a back-layer pixel read;
- the `?shaderDebug=1` overlay contents, including the `?desync2d=1` report;
- rain context loss and restore, including re-upload of cached textures;
- the open cabinet's shared pass: no cross-context uploads over several
  frames, the pass in the cabinet context, and a framebuffer read before and
  after the pass. The read shows the cabinet still covering the frame, alpha
  never reduced, and drops changing some pixels but not all;
- the legacy `?cabinetCompositing=upload` path;
- cabinet context loss and restore during the shared pass.

Before changing context attributes or frame ordering, run `npm run ci`, then
check the cabinet open on Chromium desktop and mobile emulation with
`?shaderDebug=1`.

### Safari / Mobile Safari

- **Verified (2026-11-18):** Playwright WebKit 26.5 on Linux (not Safari, and
  not iOS) passed all four shader, overlay, and context-loss tests in
  `tests/smoke/rendering.spec.js` when run serially. It reported `webgl2`, with
  every stage compiling as GLSL ES 3.00. Under `?rainGL=webgl1` the ES 1.00
  copies compiled. With two parallel workers, two WebKit pages were torn down
  mid-test ("Target page … has been closed"). Treat that as a load limit of
  software GL on this host, not a confirmed product bug, until it reproduces
  serially.
- **Not verified:** physical iOS Safari or Safari's responsive device mode.
  WebGL2 has shipped since Safari/iOS 15, so the ES 3.00 path is the expected
  one. The WebGL1 copies remain for older devices and for WebGL2 being
  disabled.
- On a device: open `/?shaderDebug=1`, confirm `webgl2` with
  `GLSL 300 es: ok` for every stage, and open the cabinet to confirm
  `compositing: shared-context-pass` with drops refracting the cubes. Then
  retry with `?rainGL=webgl1` and confirm `GLSL 100: ok`. Force
  `WEBGL_lose_context` on a rain canvas and confirm diagnostics return to
  `running` with `builds 2`. Linux Chromium/WebKit emulation is not a
  substitute for the device compositor and GPU driver. Record the result here.
- WebGL1 can be dropped once device checks confirm no supported target lacks
  WebGL2. Then delete the `*.es100.*` copies and set `webgl1Fallback: false`
  for rain.
