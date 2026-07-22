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
    for(let i=1; i<=15; i++) {
       window.tabManager.addFile(`file_${i}.js`, `// Content for file ${i}\nconsole.log("File ${i}");`);
    }
  });

  await page.waitForTimeout(500);

  console.log("Activating Scattered View to spread files out...");
  await page.evaluate(() => {
    const select = document.getElementById('view-mode-select');
    select.value = 'scattered';
    select.dispatchEvent(new Event('change'));
  });

  await page.waitForTimeout(1000);

  console.log("Triggering Gravity Well (Alt+G) + mouse movement...");
  const boundingBox = await page.evaluate(() => {
    const el = document.querySelector('.echo-document');
    return el ? el.getBoundingClientRect() : null;
  });

  if (boundingBox) {
    // Hold Alt+G
    await page.keyboard.down('Alt');
    await page.keyboard.down('g');

    // Move mouse near the center of the screen
    await page.mouse.move(800/2, 600/2, { steps: 10 });

    await page.waitForTimeout(500); // Wait for transition
    console.log("Taking screenshot...");
    await page.screenshot({ path: 'screenshot_gravity_well.png' });

    await page.keyboard.up('g');
    await page.keyboard.up('Alt');
  } else {
    console.log("No echo documents found to pull.");
  }

  await browser.close();
  console.log("Done.");
})();
