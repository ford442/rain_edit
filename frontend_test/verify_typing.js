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
  console.log("Setting view mode to stackdeck");
  await page.selectOption('#view-mode-select', 'stackdeck');

  await page.waitForTimeout(1000);
  console.log("Typing 'A' in the search to trigger ripple on echoes");
  await page.fill('#global-search', 'A');

  const screenshotPath = path.join(__dirname, 'typing_ripple.png');
  await page.screenshot({ path: screenshotPath });
  console.log("Screenshot saved at:", screenshotPath);

  await browser.close();
})();
