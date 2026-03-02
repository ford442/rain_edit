import re

with open('src/Cabinet3D.js', 'r') as f:
    content = f.read()

colors_replacement = """const CATEGORY_COLORS = [
  0x00aaff, // songs   — blue
  0x00ffaa, // patterns — teal
  0xff6600, // banks    — orange
  0xffaa00, // samples  — amber
  0xaa00ff, // shaders  — purple
  0x00ff66, // music    — green
  0xff0066, // images   — pink/red
];"""

content = re.sub(
    r"const CATEGORY_COLORS = \[\n.*?\];",
    colors_replacement,
    content,
    flags=re.DOTALL
)

with open('src/Cabinet3D.js', 'w') as f:
    f.write(content)
