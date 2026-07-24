const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to http://0.0.0.0:3000...");
  try {
    await page.goto('http://0.0.0.0:3000', { waitUntil: 'networkidle', timeout: 10000 });
  } catch(e) {
    console.error("Navigation error:", e);
    await browser.close();
    process.exit(1);
  }

  await page.waitForTimeout(2000);
  console.log("Setting view mode to shattered-glass");
  await page.selectOption('#view-mode-select', 'shattered-glass');

  await page.waitForTimeout(1000);

  const screenshotPath = path.join(__dirname, 'shattered_glass.png');
  await page.screenshot({ path: screenshotPath });
  console.log("Screenshot saved at:", screenshotPath);

  await browser.close();
})();
