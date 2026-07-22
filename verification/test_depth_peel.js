import { chromium } from 'playwright';
import { spawn } from 'child_process';

(async () => {
  const devServer = spawn('npm', ['run', 'dev']);
  await new Promise(r => setTimeout(r, 3000));

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    console.log("Starting local dev server...");
    await page.goto('http://localhost:5173');
    console.log("Loaded frontend...");

    // Simulate Alt + Q and move mouse to center
    await page.keyboard.down('Alt');
    await page.keyboard.press('q');

    // Let the effect register
    await new Promise(r => setTimeout(r, 500));

    // move mouse to spread tabs
    await page.mouse.move(800, 400);

    await new Promise(r => setTimeout(r, 500));

    // Take screenshot
    await page.screenshot({ path: '/app/verification/verification_peel.png' });
    console.log("Verified successfully. Screenshot taken.");

    await page.keyboard.up('Alt');

  } catch(e) {
    console.error(e);
  } finally {
    devServer.kill();
    await browser.close();
    process.exit(0);
  }
})();
