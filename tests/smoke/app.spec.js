import { expect, test } from "playwright/test";

test("initializes Monaco and both rain canvases", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.locator("#editor .monaco-editor")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.editor));

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
      window.raindrops &&
      typeof window.raindrops.getDiagnostics === "function" &&
      window.raindrops.getDiagnostics().ready,
  );

  const diagnostics = await page.evaluate(() => {
    const rain = window.raindrops;
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
  await page.waitForFunction(() => Boolean(window.workspaceSession));

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
    await window.workspaceSession.persistNow();
  });

  await page.reload();
  await page.waitForFunction(
    () =>
      window.workspaceSession &&
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
  await page.waitForFunction(
    () => window.raindrops?.getDiagnostics?.().ready === true,
  );

  const jsBackend = await page.evaluate(() => window.raindrops.backend);
  expect(["js", "main"]).toContain(jsBackend);

  await page.selectOption("#rain-sim-backend", "wasm");
  await page.waitForFunction(
    () =>
      window.raindrops?.backend === "wasm" ||
      window.raindrops?.backend === "main",
  );

  const after = await page.evaluate(() => window.raindrops.getDiagnostics());
  expect(["wasm", "main"]).toContain(after.backend);
});
