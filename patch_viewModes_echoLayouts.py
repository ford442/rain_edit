import re

# src/tabManager/viewModes.js
with open("src/tabManager/viewModes.js", "r") as f:
    content = f.read()

if 'toggleZenithSpiralView' not in content:
    toggle_str = """  toggleZenithSpiralView() {
    const wasActive = this.isZenithSpiralView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isZenithSpiralView = true;
      document.body.classList.add("zenith-spiral-active");
    }
    this._renderEchoes();
  },"""
    content = content.replace('  toggleStarlightMeshView() {', toggle_str + '\n  toggleStarlightMeshView() {')

    deactivate_str = '    this.isZenithSpiralView = false;\n    this.isStarlightMeshView = false;'
    content = content.replace('    this.isStarlightMeshView = false;', deactivate_str)

    deactivate_class_str = '      "zenith-spiral-active",\n      "starlight-mesh-active",'
    content = content.replace('      "starlight-mesh-active",', deactivate_class_str)

    with open("src/tabManager/viewModes.js", "w") as f:
        f.write(content)

# src/tabManager/echoLayouts.js
with open("src/tabManager/echoLayouts.js", "r") as f:
    content = f.read()

if 'isZenithSpiralView' not in content:
    layout_str = """      if (this.isZenithSpiralView) {
        // Zenith Spiral View: A downward spiral curve
        const total = Math.max(1, inactiveFiles.length);
        const radius = 600 + index * 40; // Gradually expand outwards
        const angle = index * (Math.PI / 3); // 60 degrees per item

        const tx = Math.cos(angle) * radius;
        const ty = index * 100 - (total * 50); // Spiraling downwards/upwards
        const tz = -300 - index * 120; // Pushing back in Z-space

        // Tilt facing inward slightly
        const rotY = -(angle * 180 / Math.PI) + 90;
        const rotX = 15; // slight tilt down

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `0deg`);

        const transformString = `translate3d(${tx}px, ${ty}px, ${tz}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(0deg)`;
        el.setAttribute('data-base-transform', transformString);
        return true;
      }
"""
    content = content.replace('      if (this.isStarlightMeshView) {', layout_str + '      if (this.isStarlightMeshView) {')

    with open("src/tabManager/echoLayouts.js", "w") as f:
        f.write(content)
