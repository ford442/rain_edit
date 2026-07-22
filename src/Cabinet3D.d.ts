// Public type surface for the Three.js 3D file cabinet. Authored declaration:
// the runtime class is composed from Cabinet3D_0..1 mixins at load time.

import type { StorageAPI } from "./StorageAPI.js";
import type { TabManager } from "./TabManager.js";
import type * as monaco from "monaco-editor";

export interface Cabinet3DOptions {
  preserveDrawingBuffer?: boolean;
}

/**
 * Detail payload of the `fileCubeClicked` CustomEvent dispatched on `window`
 * when a file cube is selected. main.js listens for it to open the file.
 */
export interface FileCubeClickedDetail {
  id: string | number;
  type: string;
  name: string;
  fileData: unknown;
  catIndex: number;
}

export class Cabinet3D {
  constructor(
    storageAPI: StorageAPI,
    tabManager: TabManager,
    monacoApi?: typeof monaco | null,
    options?: Cabinet3DOptions,
  );

  readonly storageAPI: StorageAPI;
  readonly tabManager: TabManager;
  visible: boolean;

  /** Open the cabinet overlay (lazy-initializes Three.js on first call). */
  show(): void;
  /** Hide the cabinet overlay. */
  hide(): void;
  /** Toggle overlay visibility. */
  toggle(): void;
}

export const CATEGORY_COLORS: readonly number[];
export function lerp(a: number, b: number, t: number): number;
export function easeOut(t: number): number;

declare global {
  interface WindowEventMap {
    fileCubeClicked: CustomEvent<FileCubeClickedDetail>;
  }
}
