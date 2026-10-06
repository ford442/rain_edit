with open('src/interactions/lensBindings/groupC.js', 'r') as f:
    content = f.read()

new_lens = """  manager.register({
    id: "singularity-core-lens",
    category: "lens",
    description: "Singularity Core Lens (Alt+0)",
    combo: { alt: true, code: "Digit0" },
    type: "hold",
    group: "lens",
    onDown: () => {
      body.classList.add("loupe-active", "singularity-core-active");
      const echoLayer = (typeof doc !== "undefined" && doc.getElementById) ? doc.getElementById("echo-layer") : document.getElementById("echo-layer");
      if (echoLayer) {
        echoLayer.querySelectorAll(".echo-document").forEach((echoDoc, idx) => {
          echoDoc.style.setProperty("--item-index", idx);
        });
      }
    },
    onUp: () => body.classList.remove("loupe-active", "singularity-core-active"),
  });

"""

content = content.replace("export function registerLensGroupC_extensions(manager, doc, body) {", "export function registerLensGroupC_extensions(manager, doc, body) {\n" + new_lens)

with open('src/interactions/lensBindings/groupC.js', 'w') as f:
    f.write(content)
