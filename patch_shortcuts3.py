import re

with open('src/main.js', 'r') as f:
    content = f.read()

# Replace Ctrl+Shift+S with Alt+Shift+S
content = content.replace('if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyS")', 'if (e.altKey && e.shiftKey && e.code === "KeyS")')

with open('src/main.js', 'w') as f:
    f.write(content)

print("Fixed shortcut again.")
