import re

with open('src/TabManager.js', 'r') as f:
    content = f.read()

constructor_replacement = """  constructor(editor, monacoApi, editorEl, tabsEl, imageViewerEl = null) {
    this.editor = editor;
    this.monaco = monacoApi;
    this.editorEl = editorEl;
    this.tabsEl = tabsEl;
    this.imageViewerEl = imageViewerEl || document.getElementById('image-viewer');
    this.files = [];
    this.activeId = null;
    this._nextId = 1;
  }"""

content = re.sub(
    r"  constructor\(editor, monacoApi, editorEl, tabsEl\) \{.*?\._nextId = 1;\n  \}",
    constructor_replacement,
    content,
    flags=re.DOTALL
)

add_file_replacement = """  addFile(name, content = '', language = 'javascript') {
    const id = this._nextId++;
    const isImage = language === 'image';

    let model = null;
    if (!isImage) {
      model = this.monaco.editor.createModel(content, language);
    }

    this.files.push({ id, name, model, depth: 1, isImage, url: isImage ? content : null });
    this._renderTabs();
    return id;
  }"""

content = re.sub(
    r"  addFile\(name, content = '', language = 'javascript'\) \{.*?return id;\n  \}",
    add_file_replacement,
    content,
    flags=re.DOTALL
)

set_active_replacement = """  setActive(id) {
    const file = this.files.find(f => f.id === id);
    if (!file) return;
    this.activeId = id;

    if (file.isImage) {
      this.editorEl.style.display = 'none';
      if (this.imageViewerEl) {
        this.imageViewerEl.style.display = 'flex';
        this.imageViewerEl.innerHTML = `<img src="${file.url}" alt="${file.name}" />`;
      }
    } else {
      if (this.imageViewerEl) {
        this.imageViewerEl.style.display = 'none';
      }
      this.editorEl.style.display = 'block';
      this.editor.setModel(file.model);
      this.editor.focus();
    }

    this.applyDepth(file.depth);
    this._renderTabs();
  }"""

content = re.sub(
    r"  setActive\(id\) \{.*?this\.editor\.focus\(\);\n  \}",
    set_active_replacement,
    content,
    flags=re.DOTALL
)

apply_depth_replacement = """  applyDepth(depthLevel) {
    const zIndex = DEPTH_Z_INDEX[depthLevel] ?? DEPTH_Z_INDEX[1];
    this.editorEl.style.zIndex = zIndex;
    if (this.imageViewerEl) {
      this.imageViewerEl.style.zIndex = zIndex;
    }
  }"""

content = re.sub(
    r"  applyDepth\(depthLevel\) \{.*?\n  \}",
    apply_depth_replacement,
    content,
    flags=re.DOTALL
)

with open('src/TabManager.js', 'w') as f:
    f.write(content)
