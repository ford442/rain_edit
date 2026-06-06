const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to the local dev server
  await page.goto('http://localhost:5173/');

  // Wait for the app to initialize
  await page.waitForTimeout(2000);

  // Take screenshot
  const screenshotPath = path.resolve(__dirname, 'verification_screenshot.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to', screenshotPath);

  await browser.close();
})();
