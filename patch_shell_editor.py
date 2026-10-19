import re

with open("src/styles_base/shell-and-editor.css", "r") as f:
    content = f.read()

# Replace scrollbar styles
content = re.sub(
    r"::-webkit-scrollbar \{[\s\S]*?\}",
    "::-webkit-scrollbar {\n  width: 10px;\n  height: 10px;\n}",
    content
)

content = re.sub(
    r"::-webkit-scrollbar-track \{[\s\S]*?\}",
    "::-webkit-scrollbar-track {\n  background: rgba(0, 0, 0, 0.15);\n  border-radius: 5px;\n}",
    content
)

content = re.sub(
    r"@keyframes scrollbar-pulse \{[\s\S]*?\}",
    "@keyframes scrollbar-pulse {\n  0% { box-shadow: inset 0 0 12px rgba(0, 229, 255, 0.7), 0 0 8px rgba(0, 229, 255, 0.4); }\n  50% { box-shadow: inset 0 0 20px rgba(0, 229, 255, 1), 0 0 24px rgba(0, 229, 255, 0.7); }\n  100% { box-shadow: inset 0 0 12px rgba(0, 229, 255, 0.7), 0 0 8px rgba(0, 229, 255, 0.4); }\n}",
    content
)

content = re.sub(
    r"::-webkit-scrollbar-thumb \{[\s\S]*?\}",
    "::-webkit-scrollbar-thumb {\n  background: rgba(0, 229, 255, 0.7);\n  background-image: linear-gradient(180deg, rgba(255,255,255,0.3), rgba(0, 229, 255, 0.15) 50%, transparent);\n  border-radius: 5px;\n  border: 1px solid rgba(0, 229, 255, 1);\n  box-shadow: inset 0 0 12px rgba(0, 229, 255, 0.7);\n  transition: background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;\n  animation: scrollbar-pulse 2.5s infinite ease-in-out;\n}",
    content
)

content = re.sub(
    r"::-webkit-scrollbar-thumb:hover \{[\s\S]*?\}",
    "::-webkit-scrollbar-thumb:hover {\n  background: rgba(0, 229, 255, 1);\n  background-image: linear-gradient(180deg, rgba(255,255,255,0.5), rgba(0, 229, 255, 0.3) 50%, transparent);\n  box-shadow: 0 0 45px rgba(0, 229, 255, 1), inset 0 0 20px rgba(255, 255, 255, 1);\n  border-color: #ffffff;\n  animation: none;\n}",
    content
)

# Replace #editor block
editor_match = re.search(r"#editor \{[\s\S]*?backdrop-filter: var\(--glass-blur-lg\) var\(--glass-sat\);\n  -webkit-backdrop-filter: var\(--glass-blur-lg\) var\(--glass-sat\);\n\n  /\* Cyber Grid Background \*/", content)
if editor_match:
    old_editor = editor_match.group(0)
    new_editor = """#editor {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5; /* default: depth 1 — middle between rain layers; JS will update dynamically */
  box-shadow:
    0 32px 80px rgba(0, 0, 0, 0.98), 0 0 120px rgba(0, 229, 255, 0.2),
    inset 0 2px 20px rgba(255, 255, 255, 0.3),
    0 0 60px rgba(0, 229, 255, 0.3),
    inset 0 0 30px rgba(0, 229, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: var(--ui-radius-lg);
  backdrop-filter: var(--glass-blur-lg) var(--glass-sat);
  -webkit-backdrop-filter: var(--glass-blur-lg) var(--glass-sat);

  /* Cyber Grid Background */"""
    content = content.replace(old_editor, new_editor)

with open("src/styles_base/shell-and-editor.css", "w") as f:
    f.write(content)
