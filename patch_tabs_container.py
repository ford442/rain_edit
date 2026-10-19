import re

with open("src/styles_base/tabs-container.css", "r") as f:
    content = f.read()

# Replace .tab-item.active
content = re.sub(
    r"\.tab-item\.active \{[\s\S]*?\}",
    ".tab-item.active {\n  background: rgba(45, 60, 90, 0.95);\n  border-color: rgba(0, 229, 255, 0.9);\n  border-bottom: 2px solid transparent;\n  background-clip: padding-box;\n  color: #ffffff;\n  box-shadow:\n    0 12px 40px rgba(0, 0, 0, 0.98),\n    inset 0 1px 10px rgba(255, 255, 255, 0.8),\n    0 0 60px rgba(0, 229, 255, 0.9);\n  transform: translateY(-4px) scale(1.08);\n  text-shadow:\n    0 0 20px #fff,\n    0 0 50px rgba(0, 229, 255, 1);\n  position: relative;\n  overflow: visible;\n  animation: text-pulse 2s infinite alternate;\n}",
    content
)

content = re.sub(
    r"\.tab-item\.active::after \{[\s\S]*?\}",
    ".tab-item.active::after {\n  content: \"\";\n  position: absolute;\n  bottom: -2px;\n  left: 0;\n  right: 0;\n  height: 2px;\n  background: linear-gradient(90deg, rgba(0, 229, 255, 1), rgba(255, 0, 128, 1), rgba(0, 229, 255, 1), rgba(0, 255, 128, 1), rgba(0, 229, 255, 1));\n  background-size: 300% 100%;\n  animation: tab-scan-border 3s linear infinite;\n  border-radius: 0 0 var(--ui-radius-sm) var(--ui-radius-sm);\n}",
    content
)

with open("src/styles_base/tabs-container.css", "w") as f:
    f.write(content)
