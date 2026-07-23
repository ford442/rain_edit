const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000/');

    // Wait for the main app to load
    await page.waitForSelector('#app');

    // Wait a brief moment for the layout transition
    await page.waitForTimeout(1000);

    // Switch to X-Ray Flashlight
    await page.keyboard.down('Alt');
    await page.keyboard.down('n');
    await page.keyboard.down('N');

    await page.mouse.move(500, 500); // Move to middle of screen

    // Wait a brief moment for mask update
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'verification/xray_flashlight.png' });
    console.log('X-Ray Flashlight screenshot saved.');

    await page.keyboard.up('N');
    await page.keyboard.up('n');
    await page.keyboard.up('Alt');

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await browser.close();
  }
})();
