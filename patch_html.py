with open('index.html', 'r') as f:
    content = f.read()

content = content.replace('<div id="editor"></div>', '<div id="editor"></div>\n        <div id="image-viewer"></div>')

with open('index.html', 'w') as f:
    f.write(content)
