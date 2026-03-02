import re

with open('src/Cabinet3D.js', 'r') as f:
    content = f.read()

# Update _detectLanguage to recognize images
detect_replacement = """  _detectLanguage(catName, data) {
    if (catName === 'shaders') return 'glsl';
    if (catName === 'images') return 'image';
    if (data.language) return data.language;
    const name = (data.filename || data.name || '').toLowerCase();
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || name.endsWith('.webp')) return 'image';
    if (name.endsWith('.js'))   return 'javascript';
    if (name.endsWith('.ts'))   return 'typescript';
    if (name.endsWith('.json')) return 'json';
    if (name.endsWith('.py'))   return 'python';
    if (name.endsWith('.glsl') || name.endsWith('.frag') || name.endsWith('.vert')) return 'glsl';
    if (catName === 'songs' || catName === 'patterns' || catName === 'banks' || catName === 'music') return 'json';
    return 'plaintext';
  }"""

content = re.sub(
    r"  _detectLanguage\(catName, data\) \{.*?\n  \}",
    detect_replacement,
    content,
    flags=re.DOTALL
)

# Update _onFileClick to handle images differently
click_replacement = """  _onFileClick(catIndex, fileData) {
    const catName = STORAGE_CATEGORIES[catIndex];
    const id      = fileData.id || fileData._id || fileData.name || 'unknown';
    const filename = fileData.filename || fileData.name || `${catName}-${id}`;

    // For images, we can construct the direct URL to the backend
    const isImage = catName === 'images' ||
                    filename.toLowerCase().endsWith('.png') ||
                    filename.toLowerCase().endsWith('.jpg') ||
                    filename.toLowerCase().endsWith('.jpeg') ||
                    filename.toLowerCase().endsWith('.gif') ||
                    filename.toLowerCase().endsWith('.webp');

    this._hint.textContent = `Fetching ${id}…`;

    if (isImage) {
      // For images, we just construct the URL and open it directly
      const url = `${this.storageAPI.baseUrl}/api/songs/${encodeURIComponent(id)}`;
      this.tabManager.addFile(filename, url, 'image');
      const newId = this.tabManager.files.length > 0
        ? this.tabManager.files[this.tabManager.files.length - 1].id
        : null;
      if (newId !== null) this.tabManager.setActive(newId);
      this.hide();
      return;
    }

    this.storageAPI
      .fetchFileContent(id, catName)
      .then((data) => {
        const content  = data.code || data.content || data.text || JSON.stringify(data, null, 2);
        const language = this._detectLanguage(catName, data);
        this.tabManager.addFile(filename, content, language);
        const newId = this.tabManager.files.length > 0
          ? this.tabManager.files[this.tabManager.files.length - 1].id
          : null;
        if (newId !== null) this.tabManager.setActive(newId);
        this.hide();
      })
      .catch(() => {
        this._hint.textContent = `Could not fetch file (check backend URL)`;
      });
  }"""

content = re.sub(
    r"  _onFileClick\(catIndex, fileData\) \{.*?\n  \}",
    click_replacement,
    content,
    flags=re.DOTALL
)

with open('src/Cabinet3D.js', 'w') as f:
    f.write(content)
