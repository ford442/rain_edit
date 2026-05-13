import re

with open('src/main.js', 'r') as f:
    content = f.read()

# Add Alt+Shift+S for Depth Spotlight and Alt+Shift+H for Hologram Preview
new_shortcuts = """
// --- Depth Spotlight (Alt+Shift+S) & Hologram Preview (Alt+Shift+H) ---
document.addEventListener("keydown", (e) => {
  if (e.altKey && e.shiftKey && e.code === "KeyS") {
    e.preventDefault();
    document.body.classList.toggle("depth-spotlight-active");
  }
  if (e.altKey && e.shiftKey && e.code === "KeyH") {
    e.preventDefault();
    document.body.classList.toggle("hologram-preview-active");
  }
});
"""

# Append to the end of main.js
with open('src/main.js', 'a') as f:
    f.write(new_shortcuts)

print("Patch applied.")
