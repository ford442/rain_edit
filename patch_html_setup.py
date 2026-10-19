import re

# index.html
with open("index.html", "r") as f:
    content = f.read()
if '<option value="zenith-spiral">🌀 Zenith Spiral</option>' not in content:
    content = content.replace(
        '<option value="starlight-mesh">✨ Starlight Mesh</option>',
        '<option value="starlight-mesh">✨ Starlight Mesh</option>\n              <option value="zenith-spiral">🌀 Zenith Spiral</option>'
    )
    with open("index.html", "w") as f:
        f.write(content)

# src/main_init_2.js
with open("src/main_init_2.js", "r") as f:
    content = f.read()
if 'if (view === "zenith-spiral") tabManager.toggleZenithSpiralView();' not in content:
    content = content.replace(
        'if (view === "starlight-mesh") tabManager.toggleStarlightMeshView();',
        'if (view === "starlight-mesh") tabManager.toggleStarlightMeshView();\n    else if (view === "zenith-spiral") tabManager.toggleZenithSpiralView();'
    )
    with open("src/main_init_2.js", "w") as f:
        f.write(content)

# src/workspace/sessionSchema.js
with open("src/workspace/sessionSchema.js", "r") as f:
    content = f.read()
if '"zenith-spiral": "toggleZenithSpiralView",' not in content:
    content = content.replace(
        '"starlight-mesh": "toggleStarlightMeshView",',
        '"starlight-mesh": "toggleStarlightMeshView",\n  "zenith-spiral": "toggleZenithSpiralView",'
    )
    content = content.replace(
        '"starlight-mesh": "starlight-mesh-active",',
        '"starlight-mesh": "starlight-mesh-active",\n  "zenith-spiral": "zenith-spiral-active",'
    )
    with open("src/workspace/sessionSchema.js", "w") as f:
        f.write(content)
