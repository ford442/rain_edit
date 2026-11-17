// Public type surface for the Three.js 3D file cabinet. Authored declaration:
// the runtime class is composed from cabinet3d/methods.js mixin at load time.

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
  /**
   * Render one frame (no-op while hidden). Driven by the AppClock: the rain
   * task calls it right before uploading the canvas as a rain texture; the
   * `cabinet` fallback task calls it when rain isn't running.
   */
  renderFrame(): void;
  /** The Three.js canvas, for cross-context texture upload. */
  getRendererCanvas(): HTMLCanvasElement;
  /** Screen-space position/radius of the hovered or pinned file cube. */
  getHoverScreenPos(): { x: number; y: number; r: number } | null;
  /** Record one rain-texture upload duration for compositing diagnostics. */
  recordRainTextureUpload(durationMs: number): void;
}

export const CATEGORY_COLORS: readonly number[];
export function lerp(a: number, b: number, t: number): number;
export function easeOut(t: number): number;

declare global {
  interface WindowEventMap {
    fileCubeClicked: CustomEvent<FileCubeClickedDetail>;
  }
}
