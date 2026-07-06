const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:5173/');

  // Wait for things to load
  await page.waitForTimeout(2000);

  // Create a bunch of background documents so we can test the spread
  await page.evaluate(() => {
    // We can simulate opening files
    for (let i = 0; i < 15; i++) {
        const id = window.tabManager.addFile(`test_file_${i}.js`, `// Code for test file ${i}`, 'javascript');
        window.tabManager.setActive(id);
    }
  });

  await page.waitForTimeout(1000);

  // Trigger Alt + Shift + D
  await page.keyboard.down('Alt');
  await page.keyboard.down('Shift');
  await page.keyboard.press('D');

  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'card_shuffle_screenshot.png' });

  // Release keys
  await page.keyboard.up('Shift');
  await page.keyboard.up('Alt');

  await page.waitForTimeout(1000);

  await browser.close();
  console.log('Screenshot saved to card_shuffle_screenshot.png');
})();
