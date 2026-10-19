import re

with open("src/styles_base/shell-and-editor.css", "r") as f:
    content = f.read()

# Fix the duplicate scrollbar-pulse animation definitions
content = re.sub(
    r"@keyframes scrollbar-pulse \{\n  0% \{ box-shadow: inset 0 0 12px rgba\(0, 229, 255, 0.7\), 0 0 8px rgba\(0, 229, 255, 0.4\); \}\n  50% \{ box-shadow: inset 0 0 20px rgba\(0, 229, 255, 1\), 0 0 24px rgba\(0, 229, 255, 0.7\); \}\n  100% \{ box-shadow: inset 0 0 12px rgba\(0, 229, 255, 0.7\), 0 0 8px rgba\(0, 229, 255, 0.4\); \}\n\}\n  50% \{ box-shadow: inset 0 0 16px rgba\(0, 229, 255, 0.9\), 0 0 18px rgba\(0, 229, 255, 0.5\); \}\n  100% \{ box-shadow: inset 0 0 10px rgba\(0, 229, 255, 0.6\), 0 0 6px rgba\(0, 229, 255, 0.3\); \}\n\}",
    "@keyframes scrollbar-pulse {\n  0% { box-shadow: inset 0 0 12px rgba(0, 229, 255, 0.7), 0 0 8px rgba(0, 229, 255, 0.4); }\n  50% { box-shadow: inset 0 0 20px rgba(0, 229, 255, 1), 0 0 24px rgba(0, 229, 255, 0.7); }\n  100% { box-shadow: inset 0 0 12px rgba(0, 229, 255, 0.7), 0 0 8px rgba(0, 229, 255, 0.4); }\n}",
    content
)

with open("src/styles_base/shell-and-editor.css", "w") as f:
    f.write(content)
