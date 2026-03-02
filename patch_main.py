import re

with open('src/main.js', 'r') as f:
    content = f.read()

content = content.replace("const tabManager = new TabManager(editor, monaco, editorEl, tabsContainerEl);", "const imageViewerEl = document.getElementById('image-viewer');\nconst tabManager = new TabManager(editor, monaco, editorEl, tabsContainerEl, imageViewerEl);")

# Update focus visuals to handle both editor and image-viewer
focus_visuals_replacement = """    // Editor and Image Viewer
    const targetOpacity = Math.max(0.02, targetEditorOpacity);
    const filter = `blur(${focusDepth * 8}px)`;
    const transform = `scale(${editorScale}) translateZ(0)`;

    editorEl.style.opacity = targetOpacity;
    editorEl.style.filter = filter;
    editorEl.style.transform = transform;

    if (document.getElementById('image-viewer')) {
        document.getElementById('image-viewer').style.opacity = targetOpacity;
        document.getElementById('image-viewer').style.filter = filter;
        document.getElementById('image-viewer').style.transform = transform;
    }"""

content = re.sub(
    r"    // Editor\n    editorEl\.style\.opacity = Math\.max\(0\.02, targetEditorOpacity\);\n    editorEl\.style\.filter = `blur\(\$\{focusDepth \* 8\}px\)`;\n    editorEl\.style\.transform = `scale\(\$\{editorScale\}\) translateZ\(0\)`;",
    focus_visuals_replacement,
    content,
    flags=re.DOTALL
)

pointer_events_replacement = """    // Pointer Events
    if (focusDepth > 0.6) {
        editorEl.style.pointerEvents = 'none';
        if (document.getElementById('image-viewer')) document.getElementById('image-viewer').style.pointerEvents = 'none';
    } else {
        editorEl.style.pointerEvents = 'auto';
        if (document.getElementById('image-viewer')) document.getElementById('image-viewer').style.pointerEvents = 'auto';
    }"""

content = re.sub(
    r"    // Pointer Events\n    if \(focusDepth > 0\.6\) \{\n        editorEl\.style\.pointerEvents = 'none';\n    \} else \{\n        editorEl\.style\.pointerEvents = 'auto';\n    \}",
    pointer_events_replacement,
    content,
    flags=re.DOTALL
)

with open('src/main.js', 'w') as f:
    f.write(content)
