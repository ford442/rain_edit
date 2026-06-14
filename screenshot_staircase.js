const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Go to app
  await page.goto('http://localhost:5173/');

  // Wait for load
  await page.waitForTimeout(1000);

  // Select staircase view
  await page.selectOption('#view-mode-select', 'staircase');

  // Wait for transition
  await page.waitForTimeout(1000);

  // Capture screenshot
  await page.screenshot({ path: 'screenshot_staircase.png' });

  await browser.close();
})();
