const fs = require('fs');

let content = fs.readFileSync('src/TabManager.js', 'utf8');

// 1. Add this.isQuantumView to constructor
content = content.replace(
  /this\.isCyberCortexView = false;/g,
  'this.isCyberCortexView = false;\n    this.isQuantumSuperpositionView = false;'
);

// 2. Add class removal to _deactivateAllViews
content = content.replace(
  /document\.body\.classList\.remove\("cyber-cortex-active"\);/g,
  'document.body.classList.remove("cyber-cortex-active");\n    document.body.classList.remove("quantum-superposition-active");'
);

// 3. Add toggle method
const toggleMethod = `
  toggleQuantumSuperpositionView() {
    this._deactivateAllViews();
    if (!document.body.classList.contains("quantum-superposition-active")) {
      this.isQuantumSuperpositionView = true;
      document.body.classList.add("quantum-superposition-active");
    }
    this._renderEchoes();
  }
`;

content = content.replace(
  /toggleCyberCortexView\(\) \{[\s\S]*?this\._renderEchoes\(\);\n  \}/,
  match => match + '\n' + toggleMethod
);

// 4. In _renderEchoes, handle layout logic for isQuantumSuperpositionView
const quantumLogic = `
    } else if (this.isQuantumSuperpositionView) {
      // Quantum Superposition: Scatter in 3D cloud
      const maxDist = 800;
      const tX = (Math.random() - 0.5) * maxDist * 2;
      const tY = (Math.random() - 0.5) * maxDist * 2;
      const tZ = -(Math.random() * 2000 + 200); // Back into screen

      const rX = (Math.random() - 0.5) * 60; // -30 to 30 deg
      const rY = (Math.random() - 0.5) * 60;
      const rZ = (Math.random() - 0.5) * 60;

      el.style.setProperty("--tx", \`\${tX}px\`);
      el.style.setProperty("--ty", \`\${tY}px\`);
      el.style.setProperty("--tz", \`\${tZ}px\`);
      el.style.setProperty("--rot-x", \`\${rX}deg\`);
      el.style.setProperty("--rot-y", \`\${rY}deg\`);
      el.style.setProperty("--rot-z", \`\${rZ}deg\`);
`;

content = content.replace(
  /\} else if \(this\.isCyberCortexView\) \{/,
  quantumLogic + '\n    } else if (this.isCyberCortexView) {'
);

fs.writeFileSync('src/TabManager.js', content, 'utf8');
