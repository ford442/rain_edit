const { chromium } = require('playwright');

(async () => {
  console.log("Starting browser...");
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to dev server...");
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  console.log("Waiting for app to initialize...");
  await page.waitForTimeout(1000);

  console.log("Adding dummy documents...");
  await page.evaluate(() => {
    // Add multiple tabs to ensure we have enough layers for the house of cards stack
    for(let i=1; i<=15; i++) {
       window.tabManager.addFile(`card_${i}.js`, `// Content for card ${i}\nconsole.log("Card ${i}");`);
    }
  });

  await page.waitForTimeout(500);

  console.log("Switching to House of Cards View...");
  await page.evaluate(() => {
    const select = document.getElementById('view-mode-select');
    select.value = 'house-of-cards';
    select.dispatchEvent(new Event('change'));
  });

  console.log("Waiting for transition...");
  await page.waitForTimeout(1500); // Wait for animations to settle

  console.log("Taking screenshot...");
  await page.screenshot({ path: 'screenshot_house_of_cards.png' });

  await browser.close();
  console.log("Done.");
})();
