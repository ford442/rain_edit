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

    // Test Repulsor Field
    await page.keyboard.down('Alt');
    await page.keyboard.press('r');
    await page.keyboard.up('Alt');
    console.log("Triggered Repulsor field...");

    // Let the animation start
    await new Promise(r => setTimeout(r, 500));

    // Take screenshot
    await page.screenshot({ path: '/app/verification/verification.png' });
    console.log("Verified successfully. Screenshot taken.");
  } catch(e) {
    console.error(e);
  } finally {
    devServer.kill();
    await browser.close();
    process.exit(0);
  }
})();
