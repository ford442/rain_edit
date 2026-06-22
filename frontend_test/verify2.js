const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to the local dev server
  await page.goto('http://localhost:5173/');

  // Wait for the app to initialize
  await page.waitForTimeout(1000);

  // Trigger fold-out gallery
  await page.keyboard.down('Alt');
  await page.keyboard.down('Shift');
  await page.keyboard.press('KeyG');

  await page.waitForTimeout(1000);

  // Take screenshot
  const screenshotPath = path.resolve(__dirname, 'verification_screenshot2.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to', screenshotPath);

  await page.keyboard.up('Shift');
  await page.keyboard.up('Alt');

  // Trigger stepped crater
  await page.keyboard.down('Alt');
  await page.keyboard.down('Shift');
  await page.keyboard.press('KeyC');

  await page.mouse.move(500, 500);

  await page.waitForTimeout(1000);
  const screenshotPath3 = path.resolve(__dirname, 'verification_screenshot3.png');
  await page.screenshot({ path: screenshotPath3 });
  console.log('Screenshot saved to', screenshotPath3);

  await page.keyboard.up('Shift');
  await page.keyboard.up('Alt');

  await browser.close();
})();
