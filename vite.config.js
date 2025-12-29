import { defineConfig } from 'vite';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';
import glslify from 'rollup-plugin-glslify';

export default defineConfig({
  plugins: [
    monacoEditorPlugin(),
    glslify()
  ],
  server: {
    fs: {
      // allow access to parent folder so we can reuse images from the original repo
      allow: ['..']
    }
  }
});