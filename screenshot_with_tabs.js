const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(1000);

  // Add some dummy files using a method that exists
  await page.evaluate(() => {
    // If tabManager exists globally
    if (window.tabManager && window.tabManager.addTab) {
      for (let i = 0; i < 15; i++) {
        window.tabManager.addTab(`file_${i}.js`, `// Content for file ${i}\nconsole.log(${i});`, 'javascript');
      }
    }
  });

  await page.waitForTimeout(1000);

  // Select staircase view
  await page.selectOption('#view-mode-select', 'staircase');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_staircase_tabs.png' });

  // Select pyramid view
  await page.selectOption('#view-mode-select', 'pyramid');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_pyramid_tabs.png' });

  await browser.close();
})();
