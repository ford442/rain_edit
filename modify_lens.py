import re

with open("src/interactions/lensBindings.js", "r") as f:
    content = f.read()

# Find the location to insert the new registrations, which is before the `if (typeof doc.addEventListener === "function") {` block

new_bindings = """
  manager.register({
    id: "neon-matrix-wireframe",
    category: "lens",
    description: "Neon Matrix Wireframe Lens (Alt+Shift+1)",
    combo: { alt: true, shift: true, code: "Digit1" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "neon-matrix-wireframe-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "neon-matrix-wireframe-active"),
  });

  manager.register({
    id: "fractal-dimension",
    category: "lens",
    description: "Fractal Dimension Lens (Alt+Shift+2)",
    combo: { alt: true, shift: true, code: "Digit2" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "fractal-dimension-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "fractal-dimension-active"),
  });

  manager.register({
    id: "astral-projection",
    category: "lens",
    description: "Astral Projection Lens (Alt+Shift+3)",
    combo: { alt: true, shift: true, code: "Digit3" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "astral-projection-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "astral-projection-active"),
  });
"""

content = content.replace('  if (typeof doc.addEventListener === "function") {', new_bindings + '\n  if (typeof doc.addEventListener === "function") {')

with open("src/interactions/lensBindings.js", "w") as f:
    f.write(content)
