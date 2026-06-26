const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);

  // Create some echo documents so we can see the stack deck
  await page.evaluate(() => {
    for (let i = 0; i < 5; i++) {
        window.tabManager.addFile('file' + i + '.js', '// file' + i, 'javascript');
    }

    // Switch to the stackdeck view
    window.tabManager.toggleStackDeckView();
  });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_stackdeck.png' });

  await browser.close();
})();
