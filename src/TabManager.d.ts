// Public type surface for the tab/depth manager. Authored declaration: the
// runtime class is composed from TabManager_0..7 mixins at load time, which
// TypeScript cannot infer, so the trusted public API is declared here.

import type * as monaco from "monaco-editor";

/** An open document tracked by the TabManager. */
export interface TabFile {
  id: number;
  name: string;
  language: string;
  depth: 0 | 1 | 2;
  model?: monaco.editor.ITextModel;
  isImage?: boolean;
  noteName?: string;
  cabinetType?: string;
  cabinetId?: string;
  vpsPath?: string;
  [key: string]: unknown;
}

export class TabManager {
  constructor(
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoApi: typeof monaco,
    editorEl: HTMLElement,
    tabsEl: HTMLElement,
    imageViewerEl?: HTMLElement | null,
    echoLayerEl?: HTMLElement | null,
  );

  editor: monaco.editor.IStandaloneCodeEditor;
  monaco: typeof monaco;
  editorEl: HTMLElement;
  tabsEl: HTMLElement;
  echoLayerEl: HTMLElement | null;
  imageViewerEl: HTMLElement | null;
  files: TabFile[];
  activeId: number | null;

  /** Add a new document; returns its id. */
  addFile(name: string, content?: string, language?: string): number;
  /** Switch the active document and apply its saved depth. */
  setActive(id: number): void;
  /** Increment/decrement the active document's depth, clamped to [0, 2]. */
  adjustDepth(delta: number): void;
  /** Apply a depth level to the editor element (z-index only). */
  applyDepth(depthLevel: 0 | 1 | 2, oldDepthLevel?: number | null): void;
  /** Cycle a document's depth with wrap-around. */
  cycleDepth(delta: number, id?: number): void;
  /** Move the active tab to the next/previous open file. */
  cycleActiveTab(direction: number): void;
  /** Remove a document/tab by id. */
  removeFile(id: number): void;
  /** Deactivate every 3D view mode. */
  _deactivateAllViews(): void;
  /** Show a transient status toast. */
  _showToast(message: string, isError?: boolean): void;

  /**
   * 25+ CSS-driven 3D view-mode toggles (waterfall, cascade, orbit, helix,
   * vortex, coverflow, sphere, galaxy, outline, blackHole, …). All share the
   * same nullary signature.
   */
  [method: `toggle${string}View`]: () => void;

  /** Per-view boolean state flags (isCascadeView, isOrbitView, …). */
  [flag: `is${string}View`]: boolean;
}

/** Shared singleton created in TabManager.js. */
export const storageAPI: import("./StorageAPI.js").StorageAPI;
export const TOAST_DISPLAY_DURATION: number;
export const DEPTH_Z_INDEX: readonly number[];
export const DEPTH_ICONS: readonly string[];
export const DEPTH_TITLES: readonly string[];

export function _extractSymbols(
  source: string,
): { name: string; kind: string; line: number }[];
export function _symbolKindIcon(kind: string): string;
