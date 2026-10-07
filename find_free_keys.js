const fs = require('fs');

const files = [
  'src/interactions/lensBindings/groupA.js',
  'src/interactions/lensBindings/groupB.js',
  'src/interactions/lensBindings/groupC.js',
  'src/interactions/echo/depthPeelGestures.js',
  'src/interactions/echo/lensAndScanEffects.js',
  'src/interactions/echo/revealToggles.js',
  'src/interactions/echo/spatialDispersionEffects.js'
];

let combos = new Set();
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const regex = /combo:\s*\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    let props = match[1];
    let ctrl = /ctrl:\s*true/.test(props);
    let alt = /alt:\s*true/.test(props);
    let shift = /shift:\s*true/.test(props);
    let codeMatch = /code:\s*['"](.*?)['"]/.exec(props);
    let code = codeMatch ? codeMatch[1] : 'Unknown';
    combos.add(`${ctrl ? 'Ctrl+' : ''}${alt ? 'Alt+' : ''}${shift ? 'Shift+' : ''}${code}`);
  }
}

console.log([...combos].sort());

const allKeys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => 'Key' + c);
let available = [];
for (let key of allKeys) {
  let combo = `Alt+${key}`;
  if (!combos.has(combo)) {
    available.push(combo);
  }
}
console.log("\nAvailable Alt+<Key>:");
console.log(available);

let availableCtrlAlt = [];
for (let key of allKeys) {
  let combo = `Ctrl+Alt+${key}`;
  if (!combos.has(combo)) {
    availableCtrlAlt.push(combo);
  }
}
console.log("\nAvailable Ctrl+Alt+<Key>:");
console.log(availableCtrlAlt);
