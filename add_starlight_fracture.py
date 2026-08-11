import re

with open("src/interactions/lensBindings.js", "r") as f:
    content = f.read()

starlight_fracture_code = """  manager.register({
    id: "starlight-fracture",
    category: "lens",
    description: "Starlight Fracture Lens (Alt+Shift+S)",
    combo: { alt: true, shift: true, code: "KeyS" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "starlight-fracture-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "starlight-fracture-active"),
  });

  if (typeof doc.addEventListener === "function") {"""

content = content.replace('  if (typeof doc.addEventListener === "function") {', starlight_fracture_code)

with open("src/interactions/lensBindings.js", "w") as f:
    f.write(content)
