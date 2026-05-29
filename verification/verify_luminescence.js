const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:5173');

  // Wait for the select element to be visible
  await page.waitForSelector('#view-mode-select');

  // Select Luminescence View
  await page.selectOption('#view-mode-select', 'luminescence');

  // Wait a moment for animation to start and elements to arrange
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: '/home/jules/verification/luminescence.png' });

  // Now try the magnetic pulse
  await page.keyboard.down('Alt');
  await page.keyboard.press('m');
  await page.keyboard.up('Alt');

  // Wait halfway through the pulse animation
  await page.waitForTimeout(300);

  // Take another screenshot for magnetic pulse
  await page.screenshot({ path: '/home/jules/verification/magnetic-pulse.png' });

  await browser.close();
})();
