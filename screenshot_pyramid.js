const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Go to app
  await page.goto('http://localhost:5173/');

  // Wait for load
  await page.waitForTimeout(1000);

  // Select pyramid view
  await page.selectOption('#view-mode-select', 'pyramid');

  // Wait for transition
  await page.waitForTimeout(1000);

  // Capture screenshot
  await page.screenshot({ path: 'screenshot_pyramid.png' });

  await browser.close();
})();
