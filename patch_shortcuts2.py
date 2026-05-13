import re

with open('src/main.js', 'r') as f:
    content = f.read()

# Replace Alt+Shift+S with Ctrl+Shift+S or Meta+Shift+S
content = content.replace('if (e.altKey && e.shiftKey && e.code === "KeyS")', 'if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyS")')

with open('src/main.js', 'w') as f:
    f.write(content)

print("Fixed shortcut.")
