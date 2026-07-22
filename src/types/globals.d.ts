// Ambient declarations shared across the type-checked seams.

// glslify-compiled shader imports resolve to their compiled source string.
declare module "*?glslify" {
  const source: string;
  export default source;
}

// Vite injects typed build-time env. Only the vars this app reads are declared;
// extend as needed.
interface ImportMetaEnv {
  readonly VITE_STORAGE_BASE_URL?: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
