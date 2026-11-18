import { expect, test } from "playwright/test";

/**
 * Rendering-seam smoke: shader variant per API, the ?shaderDebug=1 overlay,
 * and context-loss recovery. See docs/rendering-contexts.md.
 */

async function waitForRainLayers(page) {
  await page.evaluate(async () => {
    globalThis.__appCtx = await import("/src/appContext.js");
  });
  await page.waitForFunction(() => __appCtx.bgLayer && __appCtx.fgLayer, null, { timeout: 60_000 });
}

function layerSummary(page) {
  return page.evaluate(() =>
    [__appCtx.bgLayer, __appCtx.fgLayer].map((layer) => {
      const d = layer.getDiagnostics();
      return {
        api: d.api,
        running: d.running,
        status: d.shaderLog?.status,
        error: d.error,
        vertex: `${d.shaderLog?.vertex?.name} ${d.shaderLog?.vertex?.version}`,
        fragment: `${d.shaderLog?.fragment?.name} ${d.shaderLog?.fragment?.version}`,
        builds: d.shaderBuilds,
        preserveDrawingBuffer: d.attributes?.preserveDrawingBuffer,
        antialias: d.attributes?.antialias,
      };
    }),
  );
}

/** Render the back layer and read pixels in the same task (no preserved buffer needed). */
function backLayerPixels(page) {
  return page.evaluate(() => {
    const layer = __appCtx.bgLayer;
    layer.render();
    const gl = layer.gl;
    const { width, height } = layer.canvas;
    const samples = [];
    for (const [fx, fy] of [[0.25, 0.25], [0.5, 0.5], [0.75, 0.6], [0.4, 0.8]]) {
      const px = new Uint8Array(4);
      gl.readPixels(Math.floor(width * fx), Math.floor(height * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      samples.push([...px]);
    }
    return samples;
  });
}

test("rain compiles the authored GLSL ES 3.00 shaders on WebGL2", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await waitForRainLayers(page);

  const common = { api: "webgl2", running: true, status: "ok", error: null, builds: 1, preserveDrawingBuffer: false, antialias: false };
  expect(await layerSummary(page)).toEqual([
    { ...common, vertex: "simple.vert 300 es", fragment: "water-back.frag 300 es" },
    { ...common, vertex: "simple.vert 300 es", fragment: "water.frag 300 es" },
  ]);

  // The back pass is opaque: every sample is drawn with alpha 255.
  const pixels = await backLayerPixels(page);
  expect(pixels.every((p) => p[3] === 255)).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("?rainGL=webgl1 compiles the GLSL ES 1.00 copies, no rewrite", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/?rainGL=webgl1");
  await waitForRainLayers(page);

  const common = { api: "webgl1", running: true, status: "ok", error: null, builds: 1, preserveDrawingBuffer: false, antialias: false };
  expect(await layerSummary(page)).toEqual([
    { ...common, vertex: "simple.vert 100", fragment: "water-back.frag 100" },
    { ...common, vertex: "simple.vert 100", fragment: "water.frag 100" },
  ]);
  const pixels = await backLayerPixels(page);
  expect(pixels.every((p) => p[3] === 255)).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("?shaderDebug=1 overlay reports API, attributes, shader log, and texImage2D cost", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/?shaderDebug=1&desync2d=1");
  const overlay = page.locator("#shader-debug");
  await expect(overlay).toBeVisible();

  await expect
    .poll(() => overlay.textContent(), { timeout: 60_000 })
    .toContain("rain-front: webgl2 · running");
  const text = await overlay.textContent();
  expect(text).toContain("rain-back: webgl2 · running");
  expect(text).toContain("attrs alpha premultipliedAlpha !antialias !preserveDrawingBuffer");
  expect(text).toContain("fragment water.frag GLSL 300 es: ok");
  expect(text).toContain("fragment water-back.frag GLSL 300 es: ok");
  expect(text).toMatch(/texImage2D last: u_\w+ \d+\.\d\d ms/);
  expect(text).toMatch(/u_waterMap: last \d+\.\d\d ms avg/);
  expect(text).toContain("compositing: idle (requested shared) · cross-context uploads/frame 0");
  expect(text).toContain("cabinet webgl2 · preserveDrawingBuffer=false");
  // desync2d=1 opts matrix + dust in; fog/radar keep the default.
  expect(text).toMatch(/matrix: alpha true desynchronized true→/);
  expect(text).toMatch(/dust: alpha true desynchronized true→/);
  expect(text).toMatch(/fog: alpha true desynchronized false→/);
  expect(pageErrors).toEqual([]);
});

test("context loss rebuilds the program and re-uploads cached textures", async ({ page }) => {
  await page.goto("/");
  await waitForRainLayers(page);

  const before = await page.evaluate(() => {
    const d = __appCtx.fgLayer.getDiagnostics();
    return { builds: d.shaderBuilds, fgUploads: d.uploads.u_textureFg?.count ?? 0 };
  });
  expect(before.builds).toBe(1);
  expect(before.fgUploads).toBeGreaterThan(0);

  await page.evaluate(() => {
    globalThis.__loseExt = __appCtx.fgLayer.gl.getExtension("WEBGL_lose_context");
    __loseExt.loseContext();
  });
  await page.waitForFunction(() => __appCtx.fgLayer.contextLost && __appCtx.rainScene.contextPaused);
  await page.evaluate(() => __loseExt.restoreContext());
  await page.waitForFunction(() => __appCtx.fgLayer.running && !__appCtx.rainScene.contextPaused, null, {
    timeout: 30_000,
  });

  const after = await page.evaluate(() => {
    const d = __appCtx.fgLayer.getDiagnostics();
    return {
      builds: d.shaderBuilds,
      status: d.shaderLog.status,
      fgUploads: d.uploads.u_textureFg?.count ?? 0,
      contextLost: d.contextLost,
    };
  });
  expect(after.builds).toBe(2);
  expect(after.status).toBe("ok");
  expect(after.contextLost).toBe(false);
  // The static foreground texture is only bound once at init; restoration
  // must re-upload it from the cached source.
  expect(after.fgUploads).toBe(before.fgUploads + 1);
});

function crossContextCounts(page) {
  return page.evaluate(() => {
    const count = (layer, name) => layer.getDiagnostics().uploads[name]?.count ?? 0;
    return {
      bgTextureBg: count(__appCtx.bgLayer, "u_textureBg"),
      fgTextureBg: count(__appCtx.fgLayer, "u_textureBg"),
      fgTextureFg: count(__appCtx.fgLayer, "u_textureFg"),
      cabinetUploads: __appCtx.cabinet3D.getCompositingDiagnostics().samples,
    };
  });
}

test("open cabinet composites rain inside its own context: no cross-context upload", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await waitForRainLayers(page);
  await page.waitForFunction(() => __appCtx.rainScene?.ready);

  await page.evaluate(() => __appCtx.cabinet3D.show());
  await page.waitForFunction(
    () => {
      const d = __appCtx.rainScene.getCompositingDiagnostics();
      return d.mode === "shared-context-pass" && (d.shared?.frames ?? 0) >= 3;
    },
    null,
    { timeout: 30_000 },
  );

  // Several composited frames later, nothing was uploaded across contexts.
  const before = await crossContextCounts(page);
  const startFrames = await page.evaluate(() => __appCtx.rainScene.getCompositingDiagnostics().shared.frames);
  await page.waitForFunction(
    (n) => __appCtx.rainScene.getCompositingDiagnostics().shared.frames >= n + 5,
    startFrames,
    { timeout: 30_000 },
  );
  expect(await crossContextCounts(page)).toEqual(before);
  expect(before.cabinetUploads).toBe(0);

  const diag = await page.evaluate(() => {
    const d = __appCtx.rainScene.getCompositingDiagnostics();
    const pass = d.shared.pass;
    return {
      mode: d.mode,
      frontSuspended: d.frontSuspended,
      crossContextUploadsPerFrame: d.crossContextUploadsPerFrame,
      cabinetApi: d.cabinet.context.api,
      cabinetPreserve: d.cabinet.context.attributes.preserveDrawingBuffer,
      passApi: pass.api,
      passOwnsContext: pass.ownsContext,
      passComposite: pass.composite,
      passShaders: `${pass.shaderLog.status} ${pass.shaderLog.fragment.name} ${pass.shaderLog.fragment.version}`,
      copyKind: pass.uploads.u_textureFg?.kind,
      frontVisibility: document.getElementById("rain-front").style.visibility,
    };
  });
  expect(diag).toEqual({
    mode: "shared-context-pass",
    frontSuspended: true,
    crossContextUploadsPerFrame: 0,
    cabinetApi: "webgl2",
    cabinetPreserve: false,
    passApi: "webgl2",
    passOwnsContext: false,
    passComposite: "over",
    passShaders: "ok water.frag 300 es",
    copyKind: "copy",
    frontVisibility: "hidden",
  });

  // Pixel proof in one task (drawing buffer not preserved): Three's frame,
  // then the same framebuffer after the rain pass composites over it.
  const px = await page.evaluate(() => {
    const cab = __appCtx.cabinet3D;
    const scene = __appCtx.rainScene;
    const gl = cab.getGLContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const read = () => {
      const buf = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      return buf;
    };
    cab.renderFrame();
    cab.resetGLState();
    const a = read();
    scene._compositor.composite({ waterMap: scene.raindrops.canvas, uniforms: scene.fgLayer.uniformValues });
    const b = read();
    let changed = 0;
    let alphaLost = 0;
    let covered = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) changed++;
      if (b[i + 3] + 1 < a[i + 3]) alphaLost++;
      if (b[i + 3] >= 230) covered++;
    }
    return { total: a.length / 4, changed, alphaLost, covered };
  });
  expect(px.alphaLost).toBe(0); // "over" never removes cabinet coverage
  expect(px.covered / px.total).toBeGreaterThan(0.9); // the cabinet frame is still there…
  expect(px.changed).toBeGreaterThan(0); // …the drops refract it…
  expect(px.changed / px.total).toBeLessThan(0.9); // …and it shows between them.

  await page.evaluate(() => __appCtx.cabinet3D.hide());
  await page.waitForFunction(
    () =>
      __appCtx.rainScene.getCompositingDiagnostics().mode === "idle" &&
      document.getElementById("rain-front").style.visibility === "",
  );
  expect(pageErrors).toEqual([]);
});

test("?cabinetCompositing=upload keeps the legacy cross-context path", async ({ page }) => {
  await page.goto("/?cabinetCompositing=upload");
  await waitForRainLayers(page);
  await page.waitForFunction(() => __appCtx.rainScene?.ready);
  await page.evaluate(() => __appCtx.cabinet3D.show());
  await page.waitForFunction(
    () => {
      const d = __appCtx.rainScene.getCompositingDiagnostics();
      return d.mode === "cross-context-upload" && d.cabinet.samples >= 3;
    },
    null,
    { timeout: 30_000 },
  );
  const d = await page.evaluate(() => __appCtx.rainScene.getCompositingDiagnostics());
  expect(d.requested).toBe("upload");
  expect(d.frontSuspended).toBe(false);
  expect(d.crossContextUploadsPerFrame).toBe(3);
  expect(d.shared).toBeNull();
  expect(d.cabinet.preserveDrawingBuffer).toBe(false);
});

test("cabinet context loss pauses the shared pass and restores it intact", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await waitForRainLayers(page);
  await page.waitForFunction(() => __appCtx.rainScene?.ready);
  await page.evaluate(() => __appCtx.cabinet3D.show());
  await page.waitForFunction(() => __appCtx.rainScene.getCompositingDiagnostics().mode === "shared-context-pass");

  await page.evaluate(() => {
    globalThis.__cabLose = __appCtx.cabinet3D.getGLContext().getExtension("WEBGL_lose_context");
    __cabLose.loseContext();
  });
  await page.waitForFunction(() => __appCtx.rainScene.getCompositingDiagnostics().mode === "cabinet-only");
  const lost = await page.evaluate(() => __appCtx.rainScene.getCompositingDiagnostics());
  expect(lost.frontSuspended).toBe(false); // front rain is back while the cabinet is down
  expect(lost.cabinet.samples).toBe(0); // and nothing tried to upload the lost canvas

  await page.evaluate(() => __cabLose.restoreContext());
  await page.waitForFunction(
    () => {
      const d = __appCtx.rainScene.getCompositingDiagnostics();
      return d.mode === "shared-context-pass" && d.shared.pass.shaderBuilds === 2;
    },
    null,
    { timeout: 30_000 },
  );
  const restored = await page.evaluate(() => ({
    status: __appCtx.rainScene.getCompositingDiagnostics().shared.pass.shaderLog.status,
    clearAlpha: __appCtx.cabinet3D._renderer.getClearAlpha(),
  }));
  expect(restored).toEqual({ status: "ok", clearAlpha: 0.92 });
  expect(pageErrors).toEqual([]);
});
