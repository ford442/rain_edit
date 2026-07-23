const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000/');

    // Wait for the main app to load
    await page.waitForSelector('#app');

    // Make dock visible to interact with select options if it's hidden
    await page.evaluate(() => {
      document.getElementById('view-mode-select').value = 'domino';
      document.getElementById('view-mode-select').dispatchEvent(new Event('change'));
    });

    // Wait a brief moment for the layout transition
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'verification/domino_view.png' });
    console.log('Domino View screenshot saved.');

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await browser.close();
  }
})();
