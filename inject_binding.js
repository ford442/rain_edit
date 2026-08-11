const fs = require('fs');

const path = 'src/interactions/lensBindings.js';
let content = fs.readFileSync(path, 'utf8');

const targetBlock = `
  manager.register({
    id: "ethereal-glitch",
    category: "lens",
    description: "Ethereal Glitch Lens (Alt+Shift+J)",
    combo: { alt: true, shift: true, code: "KeyJ" },
    type: "hold",
    group: "lens",
    onDown: () => body.classList.add("magnifier-active", "ethereal-glitch-active"),
    onUp: () => body.classList.remove("magnifier-active", "ethereal-glitch-active"),
  });
`;

const newBlock = `
  manager.register({
    id: "cyber-grid-hologram",
    category: "lens",
    description: "Cyber-Grid Hologram Lens (Alt+Shift+F)",
    combo: { alt: true, shift: true, code: "KeyF" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "cyber-grid-hologram-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "cyber-grid-hologram-active"),
  });
`;

if (content.includes(targetBlock.trim())) {
    content = content.replace(targetBlock.trim(), targetBlock.trim() + '\n' + newBlock);
    fs.writeFileSync(path, content);
    console.log("Successfully injected cyber-grid-hologram lens binding.");
} else {
    console.error("Could not find target block to inject.");
}
