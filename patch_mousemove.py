import re

with open('src/main.js', 'r') as f:
    content = f.read()

# Find the main mousemove listener that tracks mx, my
target_str = "document.body.style.setProperty('--mouse-ny', ny);"

injection = """
  // Update targets for Depth Spotlight and Hologram Preview
  if (document.body.classList.contains("depth-spotlight-active") || document.body.classList.contains("hologram-preview-active")) {
    const echoes = Array.from(document.querySelectorAll(".echo-document"));
    let closestEcho = null;
    let minDistance = Infinity;

    echoes.forEach((echo) => {
      const rect = echo.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(cx - mx, cy - my);

      // Clean up previous classes
      echo.classList.remove("spotlight-target");
      echo.classList.remove("hologram-target");

      if (dist < minDistance) {
        minDistance = dist;
        closestEcho = echo;
      }
    });

    if (closestEcho) {
      if (document.body.classList.contains("depth-spotlight-active")) {
        closestEcho.classList.add("spotlight-target");
      }
      if (document.body.classList.contains("hologram-preview-active")) {
        closestEcho.classList.add("hologram-target");
      }
    }
  }
"""

if target_str in content:
    content = content.replace(target_str, target_str + "\n" + injection)
    with open('src/main.js', 'w') as f:
        f.write(content)
    print("Mousemove patched.")
else:
    print("Could not find target string.")
