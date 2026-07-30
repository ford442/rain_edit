const fs = require('fs');
const content = fs.readFileSync('src/styles_1.css', 'utf8');
if (content.includes('Sleek iOS-style Glowing Pill Toggles')) {
  console.log('CSS updated successfully');
} else {
  console.error('Failed to update CSS');
  process.exit(1);
}
