# Rendering contexts

`src/rendering/createGLContext.js` is the sole context factory for the raw rain
renderer and the Three.js cabinet renderer. Keep context attributes here instead
of calling `canvas.getContext()` directly in feature code.

## Context policy

Rain contexts request WebGL2 first and fall back to WebGL1. Their defaults are:

| Attribute | Rain value | Reason |
| --- | --- | --- |
| `alpha` | `true` | Both canvases composite with DOM layers. |
| `premultipliedAlpha` | `true` | Matches the browser's normal canvas compositing path. |
| `antialias` | `false` | Fullscreen post-processing does not benefit from MSAA. |
| `powerPreference` | `high-performance` | Prefer the discrete/high-performance adapter when available. |
| `failIfMajorPerformanceCaveat` | `false` | Preserve a software/fallback path instead of failing startup. |
| `preserveDrawingBuffer` | `false` | Rain never performs drawing-buffer readback. |

The WebGL1 fallback probes `OES_texture_float`,
`OES_texture_float_linear`, and `OES_standard_derivatives`. None is required by
the current unsigned-byte, 2D-canvas water map. Add an extension to
`requiredExtensions` only when a renderer genuinely cannot run without it.

The existing GLSL ES 1.00 rain shaders are translated to GLSL ES 3.00 when a
WebGL2 context is selected. This keeps WebGL1 compatibility without maintaining
two shader copies.

## Context loss

`RainLayer` owns `webglcontextlost` and `webglcontextrestored` listeners. Loss
prevents the browser's default permanent teardown, pauses the shared rain RAF,
and marks both uploads and draws inactive. Restoration rebuilds the program,
vertex buffer, uniform locations, texture objects, cached texture sources, and
cached uniform values before the RAF resumes. Call `destroy()` to remove the
listeners and GPU resources.

Use `RainLayer#getDiagnostics()` to inspect the selected API, actual attributes,
loss state, and display/backing-buffer dimensions.

## Device-pixel sizing

Canvas CSS dimensions are container dimensions in CSS pixels. Backing dimensions
are `round(cssSize * devicePixelRatio)`. `resizeCanvasToDisplaySize()` owns that
conversion for both rain layers and the related full-container 2D effects.
Sizing against `#editor` is incorrect because view CSS may transform or collapse
the editor independently of the rain canvases.

## Cabinet-to-rain compositing

The cabinet remains a separate Three.js WebGL2 context. A true shared context or
single render-target pipeline would require moving the rain passes and cabinet
scene into one renderer, which is outside this incremental change.

The former separate cabinet RAF meant rain could sample the canvas after browser
compositing had discarded its drawing buffer, forcing
`preserveDrawingBuffer: true`. The main rain RAF now calls
`cabinet3D.renderFrame()` and immediately uploads that canvas into the two rain
contexts in the same callback. Therefore the cabinet defaults to
`preserveDrawingBuffer: false`. Use `?cabinetPreserveBuffer=1` only as a temporary
diagnostic fallback.

`cabinet3D.getCompositingDiagnostics()` reports the mode, actual context
attributes, and aggregate upload time. Chromium/SwiftShader smoke measurements
on 2026-07-21 were:

| Viewport | Rain buffers | Preserve | Mean three-texture upload | Max |
| --- | --- | --- | ---: | ---: |
| 960x540, DPR 1 | 960x540 each | `false` | 0.275 ms | 0.600 ms |
| 390x844, DPR 2 | 780x1688 each | `false` | 0.625 ms | 1.900 ms |

These are four-sample software-renderer smoke measurements, not hardware GPU
benchmarks. They establish that the synchronized non-preserved path produces
visible cabinet-plus-rain output and provide a repeatable diagnostic hook. They
do not estimate the compositor cost that `preserveDrawingBuffer: true` adds.

## Browser smoke gate

Before changing context attributes or frame ordering:

1. Run `npm test` and `npm run build`.
2. Capture Chromium desktop and mobile-emulated screenshots with the cabinet open.
3. Force `WEBGL_lose_context` on each rain canvas and verify that diagnostics
   return to `running: true` with a rebuilt program.
4. Run the same visual smoke on physical Mobile Safari or Safari responsive
   device mode. Linux Chromium/WebKit emulation is not a substitute for the
   device compositor and GPU driver.
