import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import glslify from 'glslify';

// Simple Vite plugin to compile shader files via glslify when imported with `?glslify`
function glslifyPlugin() {
  return {
    name: 'glslify-transform',
    transform(code, id) {
      if (!id.endsWith('?glslify')) return null;
      const filePath = id.replace(/\?glslify$/, '');
      const src = readFileSync(filePath, 'utf8');
      // glslify can process a file path using glslify.file or compile a source string
      // Try file-based first, fallback to compile.
      try {
        const processed = glslify.file ? glslify.file(filePath).toString() : glslify(src);
        return `export default ${JSON.stringify(processed)};`;
      } catch (err) {
        this.error('glslify processing failed for ' + filePath + ': ' + err.message);
      }
    }
  };
}

export default defineConfig({
  plugins: [
    glslifyPlugin()
  ],
  server: {
    fs: {
      // allow access to parent folder so we can reuse images from the original repo
      allow: ['..']
    }
  }
});