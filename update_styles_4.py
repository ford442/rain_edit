import re

with open("src/styles_4.css", "r") as f:
    content = f.read()

# Enhance the .echo-document box-shadow
old_shadow = """  box-shadow:
    0 45px 100px rgba(0, 0, 0, 0.8),
    inset 0 2px 5px rgba(255, 255, 255, 0.2),
    inset 0 0 15px hsla(var(--echo-tint, 0deg), 100%, 60%, 0.1),
    0 0 15px rgba(0, 229, 255, 0.1); /* Subtle outer glow to emphasize edges */"""

new_shadow = """  box-shadow:
    0 50px 110px rgba(0, 0, 0, 0.85),
    inset 0 2px 5px rgba(255, 255, 255, 0.3),
    inset 0 0 25px hsla(var(--echo-tint, 0deg), 100%, 60%, 0.15),
    0 0 20px rgba(0, 229, 255, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.08); /* Enhanced premium glassmorphism outer glow & subtle border */"""

content = content.replace(old_shadow, new_shadow)

# Increase background base opacity slightly for .echo-document
old_background = """  background: rgba(10, 15, 25, 0.45);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%); /* Slightly higher base opacity */"""

new_background = """  background: rgba(12, 18, 30, 0.55);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%); /* Enhanced frosted glass effect */"""

content = content.replace(old_background, new_background)

with open("src/styles_4.css", "w") as f:
    f.write(content)
