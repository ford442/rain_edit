// Ambient declarations shared across the type-checked seams.

// Vite's built-in `?raw` suffix imports a file's text verbatim (shaders).
declare module "*?raw" {
  const source: string;
  export default source;
}

// Vite's `?worker` suffix imports a Worker constructor for the target module.
declare module "*?worker" {
  export default class extends Worker {
    constructor();
  }
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
