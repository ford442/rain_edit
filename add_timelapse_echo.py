import re

with open("src/interactions/lensBindings.js", "r") as f:
    content = f.read()

time_lapse_code = """  manager.register({
    id: "time-lapse-echo",
    category: "lens",
    description: "Time-Lapse Echo Lens (Alt+Shift+B)",
    combo: { alt: true, shift: true, code: "KeyB" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("magnifier-active", "time-lapse-echo-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("magnifier-active", "time-lapse-echo-active"),
  });

  if (typeof doc.addEventListener === "function") {"""

content = content.replace('  if (typeof doc.addEventListener === "function") {', time_lapse_code)

with open("src/interactions/lensBindings.js", "w") as f:
    f.write(content)
