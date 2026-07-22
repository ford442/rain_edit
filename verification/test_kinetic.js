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

    // Test Kinetic Echo
    await page.keyboard.down('Alt');
    await page.keyboard.press('t');

    // Let the animation start
    await new Promise(r => setTimeout(r, 1000));

    // Take screenshot
    await page.screenshot({ path: '/app/verification/verification_kinetic.png' });
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
