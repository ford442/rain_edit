const { sync_playwright } = require('playwright');
(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000); // wait for load

  // Add some fake tabs using the global tabManager
  await page.evaluate(() => {
    window.tabManager.addFile('app.js', 'console.log("app");', 'javascript');
    window.tabManager.addFile('style.css', 'body { color: red; }', 'css');
    window.tabManager.addFile('index.html', '<div>Hello</div>', 'html');
    window.tabManager.addFile('utils.js', 'export const pi = 3.14;', 'javascript');
    window.tabManager.addFile('data.json', '{"key": "value"}', 'json');
  });

  await page.waitForTimeout(1000);
  await page.selectOption('#view-mode-select', 'rolodex');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot_rolodex_tabs.png' });
  await browser.close();
})();
