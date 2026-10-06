with open('src/styles_ui.css', 'r') as f:
    content = f.read()

content = content.replace('@import "./styles_14/extra-lenses-l.css";', '@import "./styles_14/extra-lenses-l.css";\n@import "./styles_14/extra-lenses-m.css";')

with open('src/styles_ui.css', 'w') as f:
    f.write(content)
