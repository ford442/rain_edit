import { defineConfig } from "vite";

// Shaders are imported with Vite's built-in `?raw` (src/shaders/index.js):
// GLSL ES 3.00 for WebGL2 plus ES 1.00 copies for the WebGL1 fallback, no
// preprocessing. Do not reintroduce glslify unless a shader genuinely needs
// shared #pragma includes.
export default defineConfig({
  base: "./",
  // Keep .wasm in the module graph so rain-sim imports resolve without a
  // manual public/ copy (see src/rain/wasmEngine.js `?url` import).
  assetsInclude: ["**/*.wasm"],
  worker: {
    format: "es",
  },
  server: {
    fs: {
      // allow access to parent folder so we can reuse images from the original repo
      allow: [".."],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("monaco-editor")) {
            return "monaco";
          }
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});
