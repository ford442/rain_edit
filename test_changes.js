const fs = require('fs');

const styles1 = fs.readFileSync('src/styles_1.css', 'utf8');
if (!styles1.includes('Sleek iOS-style Glowing Pill Toggles')) {
  console.error('styles_1.css missing toggle styling');
  process.exit(1);
}

const styles14 = fs.readFileSync('src/styles_14.css', 'utf8');
if (!styles14.includes('blacklight-reveal-active') || !styles14.includes('geometric-shatter-active')) {
  console.error('styles_14.css missing new lenses styling');
  process.exit(1);
}

const lensBindings = fs.readFileSync('src/interactions/lensBindings.js', 'utf8');
if (!lensBindings.includes('blacklight-reveal') || !lensBindings.includes('geometric-shatter')) {
  console.error('lensBindings.js missing new lenses');
  process.exit(1);
}

console.log('All changes verified successfully!');
