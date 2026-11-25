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

test("controls remain reachable in a short viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 594 });
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.tabManager));
  await page.evaluate(() => {
    for (let i = 0; i < 12; i++) {
      window.tabManager.addFile(`file-${i}.js`, "", "javascript");
    }
  });

  for (const selector of ["#btn-depth-forward", "#btn-depth-back", "#view-mode-select"]) {
    const control = page.locator(selector);
    await expect(control).toBeInViewport({ ratio: 1 });
  }
  expect(await page.locator(".tabs-list").evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);

  const dock = page.locator("#dock");
  const dockBounds = await dock.boundingBox();
  await page.mouse.move(dockBounds.x + dockBounds.width / 2, dockBounds.y + dockBounds.height / 2);
  await expect(page.locator("#storm-intensity")).toBeInViewport({ ratio: 1 });
  expect(await dock.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => dock.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

  await page.locator("#theme-select").selectOption("journal");
  await expect(page.locator("body")).toHaveClass(/theme-journal/);
  await page.locator("#btn-workspace-export").scrollIntoViewIfNeeded();
  await expect(page.locator("#btn-workspace-export")).toBeInViewport({ ratio: 1 });
  await page.locator("#toggle-back").uncheck();
  await expect(page.locator("#toggle-back")).not.toBeChecked();
  await page.locator("#btn-explode-view").scrollIntoViewIfNeeded();
  await expect(page.locator("#btn-explode-view")).toBeInViewport({ ratio: 1 });

  await page.mouse.move(10, 300);
  await dock.focus();
  await expect(page.locator("#storm-intensity")).toBeVisible();
});

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

test("echo layer virtualizes 40 documents and every view mode lays out", async ({
  page,
}) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await exposeAppContext(page);
  await page.waitForFunction(() => Boolean(__appCtx.workspaceSession && window.tabManager));

  const counts = await page.evaluate(() => {
    const tm = window.tabManager;
    while (tm.files.length) tm.removeFile(tm.files[0].id);
    const ids = [];
    for (let i = 0; i < 40; i++) {
      ids.push(tm.addFile(`doc-${i}.js`, `export function f${i}() {\n  return ${i};\n}\n`, "javascript"));
    }
    tm.setActive(ids[0]);
    const layer = document.getElementById("echo-layer");
    return {
      cards: layer.querySelectorAll(".echo-document").length,
      stubs: layer.querySelectorAll(".echo-stub").length,
      diag: tm.echoLayer.getDiagnostics(),
    };
  });
  expect(counts.cards).toBeLessThanOrEqual(12);
  expect(counts.cards).toBe(12);
  expect(counts.stubs).toBe(27);
  expect(counts.diag.richCards).toBeLessThanOrEqual(8);

  // Colorization lands as DOM tokens on the nearest cards only.
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll("#echo-layer .echo-document code")].map(
          (code) => code.querySelector("span[class^='mtk']") !== null,
        ),
      ),
    )
    .toEqual([...Array(8).fill(true), ...Array(4).fill(false)]);

  // Cycle every registered view mode: no exceptions, cards stay pooled and
  // placed, body class + flag follow the registry.
  const results = await page.evaluate(async () => {
    const { VIEW_MODES, bodyClassFor, flagFor, toggleMethodFor } = await import(
      "/src/tabManager/viewModes.js"
    );
    const tm = window.tabManager;
    const layer = document.getElementById("echo-layer");
    const bad = [];
    for (const mode of VIEW_MODES) {
      tm[toggleMethodFor(mode)]();
      const cards = layer.querySelectorAll(".echo-document");
      const placed = [...cards].every((c) => c.style.getPropertyValue("--explode-x") !== "");
      if (
        tm.viewMode !== mode.value ||
        !tm[flagFor(mode)] ||
        !document.body.classList.contains(bodyClassFor(mode)) ||
        cards.length > 12 ||
        !placed
      ) {
        bad.push(mode.value);
      }
    }
    const last = VIEW_MODES[VIEW_MODES.length - 1];
    tm[toggleMethodFor(last)](); // toggling the active mode returns to default
    return { bad, viewMode: tm.viewMode, total: VIEW_MODES.length };
  });
  expect(results.bad).toEqual([]);
  expect(results.viewMode).toBe("");
  expect(results.total).toBeGreaterThan(70);
  expect(pageErrors).toEqual([]);
});

test("untrusted file names and content cannot inject HTML", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await exposeAppContext(page);
  await page.waitForFunction(() => Boolean(window.tabManager));

  const result = await page.evaluate(async () => {
    const { escapeHtml, sanitizeToFragment, MONACO_TOKENS_POLICY, MARKDOWN_POLICY } =
      await import("/src/dom/sanitize.js");
    window.__pwned = 0;
    const payload = `<img src=x onerror="window.__pwned++">`;

    const probe = document.createElement("div");
    probe.innerHTML = escapeHtml(payload);
    const escapedSurvives = probe.querySelector("img") !== null;
    const escapedText = probe.textContent;

    const tokens = document.createElement("div");
    tokens.append(
      sanitizeToFragment(
        `<span class="mtk1" onclick="x()">a</span>${payload}<script>window.__pwned++</script>`,
        MONACO_TOKENS_POLICY,
      ),
    );
    const md = document.createElement("div");
    md.append(sanitizeToFragment(`<b>ok</b><a href="javascript:x">l</a>${payload}`, MARKDOWN_POLICY));

    const tm = window.tabManager;
    const evil = tm.addFile(`${payload}.js`, `// </code>${payload}\nconst x = 1;\n`, "javascript");
    const other = tm.addFile("safe.js", "const y = 2;\n", "javascript");
    tm.setActive(other);
    await new Promise((r) => setTimeout(r, 1500)); // let colorize + any onerror run

    const card = document.querySelector(`#echo-layer .echo-document[data-id="${evil}"]`);
    const cardName = card?.querySelector(".echo-file-name")?.textContent;
    const cardCode = card?.querySelector("code")?.textContent ?? "";
    tm.setActive(evil); // active tab title + tab strip (the card is recycled)
    return {
      escapedSurvives,
      escapedText,
      tokenHtml: tokens.innerHTML,
      mdHtml: md.innerHTML,
      cardName,
      cardCodeHasPayload: cardCode.includes("onerror"),
      imgsInEchoes: document.querySelectorAll("#echo-layer img").length,
      imgsInTabs: document.querySelectorAll(".tabs-list img").length,
      pwned: window.__pwned,
    };
  });

  expect(result.escapedSurvives).toBe(false);
  expect(result.escapedText).toBe(`<img src=x onerror="window.__pwned++">`);
  expect(result.tokenHtml).toBe('<span class="mtk1">a</span>');
  expect(result.mdHtml).toBe("<b>ok</b>l");
  expect(result.cardName).toBe(`<img src=x onerror="window.__pwned++">.js`);
  expect(result.cardCodeHasPayload).toBe(true); // rendered as text, not markup
  expect(result.imgsInEchoes).toBe(0);
  expect(result.imgsInTabs).toBe(0);
  expect(result.pwned).toBe(0);
  expect(pageErrors).toEqual([]);
});
