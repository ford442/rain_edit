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

  expect(pageErrors).toEqual([]);
});
