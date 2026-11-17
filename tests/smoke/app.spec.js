import { expect, test } from "playwright/test";

/**
 * The app installs no boot globals (only `window.tabManager`). Tests read the
 * live `src/appContext.js` module instead: Vite serves it at one URL, so a
 * dynamic import from the page returns the same module instance the app uses.
 */
async function exposeAppContext(page) {
  await page.evaluate(async () => {
    globalThis.__appCtx = await import("/src/appContext.js");
  });
}

test("initializes Monaco and both rain canvases", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.locator("#editor .monaco-editor")).toBeVisible();
  await exposeAppContext(page);
  await page.waitForFunction(() => Boolean(__appCtx.editor));

  for (const selector of ["#rain-back", "#rain-front"]) {
    const canvas = page.locator(selector);
    await expect(canvas).toBeVisible();
    await expect
      .poll(() =>
        canvas.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return (
            element.width > 0 &&
            element.height > 0 &&
            bounds.width > 0 &&
            bounds.height > 0
          );
        }),
      )
      .toBe(true);
  }

  await page.waitForFunction(
    () =>
      __appCtx.raindrops &&
      typeof __appCtx.raindrops.getDiagnostics === "function" &&
      __appCtx.raindrops.getDiagnostics().ready,
  );

  const diagnostics = await page.evaluate(() => {
    const rain = __appCtx.raindrops;
    // Drive a few updates so lastMainThreadSimMs is populated.
    for (let i = 0; i < 5; i++) rain.update();
    return rain.getDiagnostics();
  });

  expect(["wasm", "js", "main"]).toContain(diagnostics.backend);
  if (diagnostics.backend !== "main") {
    expect(diagnostics.lastMainThreadSimMs).toBeLessThan(1);
  }

  expect(pageErrors).toEqual([]);
});

test("workspace session restores tabs, depth, and view mode after reload", async ({
  page,
}) => {
  await page.goto("/");
  await exposeAppContext(page);
  await page.waitForFunction(() => Boolean(__appCtx.workspaceSession));

  await page.evaluate(async () => {
    const tm = window.tabManager;
    // Clear demo tabs
    while (tm.files.length) tm.removeFile(tm.files[0].id);
    const id = tm.addFile("persist-me.js", "// session\n", "javascript");
    const file = tm.files.find((f) => f.id === id);
    file.depth = 2;
    file.dirty = true;
    file.savedContent = "";
    tm.setActive(id);
    tm.toggleOrbitView();
    const sel = document.getElementById("view-mode-select");
    if (sel) sel.value = "orbit";
    await __appCtx.workspaceSession.persistNow();
  });

  await page.reload();
  await exposeAppContext(page);
  await page.waitForFunction(
    () =>
      __appCtx.workspaceSession &&
      window.tabManager?.files?.some((f) => f.name === "persist-me.js"),
  );

  const restored = await page.evaluate(() => {
    const file = window.tabManager.files.find((f) => f.name === "persist-me.js");
    return {
      name: file?.name,
      depth: file?.depth,
      content: file?.model?.getValue?.() ?? null,
      viewMode: document.getElementById("view-mode-select")?.value || "",
      dirtyTab: Boolean(document.querySelector(".tab-item.dirty")),
    };
  });

  expect(restored.name).toBe("persist-me.js");
  expect(restored.depth).toBe(2);
  expect(restored.content).toContain("session");
  expect(restored.viewMode).toBe("orbit");
});

test("rain sim backend toggle can switch js and wasm workers", async ({
  page,
}) => {
  await page.goto("/?rainSim=js");
  await exposeAppContext(page);
  await page.waitForFunction(
    () => __appCtx.raindrops?.getDiagnostics?.().ready === true,
  );

  const jsBackend = await page.evaluate(() => __appCtx.raindrops.backend);
  expect(["js", "main"]).toContain(jsBackend);

  await page.selectOption("#rain-sim-backend", "wasm");
  await page.waitForFunction(
    () =>
      __appCtx.raindrops?.backend === "wasm" ||
      __appCtx.raindrops?.backend === "main",
  );

  const after = await page.evaluate(() => __appCtx.raindrops.getDiagnostics());
  expect(["wasm", "main"]).toContain(after.backend);
});

test("one AppClock drives every main-thread frame and pauses when hidden", async ({
  page,
}) => {
  // Record every distinct callback handed to requestAnimationFrame.
  await page.addInitScript(() => {
    const native = window.requestAnimationFrame.bind(window);
    window.__rafCallbacks = new Set();
    window.requestAnimationFrame = (cb) => {
      window.__rafCallbacks.add(cb);
      return native(cb);
    };
  });
  await page.goto("/");
  await exposeAppContext(page);
  await page.waitForFunction(() => __appCtx.clock?.has("rain"));

  // Only the app-owned boot globals: tabManager stays as the debug alias.
  const globals = await page.evaluate(() => ({
    tabManager: Boolean(window.tabManager),
    leaked: ["editor", "raindrops", "workspaceSession", "cabinet3D", "editorEl", "scanPortals", "updateAtmosphere", "triggerExplodeView"]
      // Named-element access (id="editor" → window.editor) is not a leak.
      .filter((name) => name in window && !(window[name] instanceof Element)),
  }));
  expect(globals).toEqual({ tabManager: true, leaked: [] });

  // Idle for a second: every RAF in that window must be the clock's tick.
  const rootCallbacks = await page.evaluate(async () => {
    window.__rafCallbacks.clear();
    await new Promise((r) => setTimeout(r, 1000));
    return window.__rafCallbacks.size;
  });
  expect(rootCallbacks).toBe(1);

  const diag = await page.evaluate(() => __appCtx.clock.getDiagnostics());
  expect(diag.tasks).toEqual(expect.arrayContaining(["rain", "cabinet", "fog", "matrix", "dust"]));

  // Simulate a hidden tab: the clock stops ticking, then resumes.
  const hidden = await page.evaluate(async () => {
    const clock = __appCtx.clock;
    globalThis.__setHidden = (value) => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => value });
      document.dispatchEvent(new Event("visibilitychange"));
    };
    __setHidden(true);
    const paused = clock.paused;
    const start = clock.frame;
    await new Promise((r) => setTimeout(r, 1000));
    return { paused, start, whileHidden: clock.frame - start };
  });
  expect(hidden.paused).toBe(true);
  expect(hidden.whileHidden).toBe(0);

  await page.evaluate(() => __setHidden(false));
  // Software GL under load can run at ~1 fps; poll rather than sleep.
  await expect
    .poll(() => page.evaluate(() => __appCtx.clock.frame), { timeout: 15_000 })
    .toBeGreaterThan(hidden.start);
});
