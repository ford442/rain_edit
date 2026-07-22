const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // Wait longer, maybe page wasn't fully ready
  await page.goto('http://localhost:5174');
  await page.waitForTimeout(3000);

  // Create dummy tabs to generate documents
  for(let i = 0; i < 9; i++) {
     await page.evaluate(`window.tabManager.addFile('Dummy \${Math.random()}', 'content \${Math.random()}');`);
  }
  await page.waitForTimeout(1000);

  // Select cityscape view
  await page.selectOption('#view-mode-select', 'cityscape');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'screenshot_cityscape.png' });
  await browser.close();
})();
