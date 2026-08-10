import re

with open("src/styles_1.css", "r") as f:
    content = f.read()

old_dock_style = """  /* Premium Glassmorphism */
  background: rgba(10, 15, 25, 0.45);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.1);"""

new_dock_style = """  /* Enhanced Premium Glassmorphism */
  background: rgba(15, 20, 35, 0.55);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.1);"""

content = content.replace(old_dock_style, new_dock_style)

with open("src/styles_1.css", "w") as f:
    f.write(content)
