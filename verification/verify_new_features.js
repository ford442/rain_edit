const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:5173');

  // Trigger "Focus Torch (Semantic Ray)"
  await page.keyboard.down('Alt');
  await page.keyboard.down('Shift');
  await page.keyboard.press('f');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Alt');

  // Move mouse to edge to trigger "Parallax Edge Fanning"
  await page.mouse.move(0, 0);

  // Wait for transitions
  await page.waitForTimeout(500);

  await page.screenshot({ path: '/home/jules/verification/focus_torch_and_edge_fanning.png' });

  await browser.close();
})();
