// Public type surface for the tab/depth manager. Authored declaration: the
// class body stays untyped JS, and its 81 `toggleXView` / `isXView` members
// are generated from the view-mode registry at load time, so the trusted
// public API is declared here. Keep in sync with src/TabManager.js.

import type * as monaco from "monaco-editor";
import type { EchoLayer } from "./tabManager/EchoLayer.js";

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
  localPath?: string;
  opfsPath?: string;
  dirty?: boolean;
  savedContent?: string;
  cursor?: { lineNumber: number; column: number } | null;
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  } | null;
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
  /** Fetch a StorageAPI note and open it as a tab; resolves to its id. */
  openNoteAsTab(noteName: string): Promise<number>;
  /** Serialize open files for workspace session persistence. */
  serializeFiles(): object[];
  /** Persist hooks / workspace session controller (optional). */
  workspaceSession?: {
    schedulePersist(): void;
    restore(opts?: { preferRemote?: boolean }): Promise<boolean>;
    unwatchFile?(id: number): void;
    watchFile?(file: TabFile): void;
    markClean?(id: number): void;
  };
  /** Active view-mode select value ("" = default). Single source of truth. */
  viewMode: string;
  /** Activate a view mode by select value ("" / unknown = default view). */
  setViewMode(value: string): void;
  /** Activate `value`, or return to the default view if it is active. */
  toggleViewMode(value: string): void;
  /** Deactivate every 3D view mode. */
  _deactivateAllViews(): void;
  /** Virtualized background echoes (null when there is no #echo-layer). */
  echoLayer: EchoLayer | null;
  /** Re-bind the echoes to the current inactive files. */
  _renderEchoes(): void;
  /** Recompute echo placements without rebinding (archway scroll, resize). */
  relayoutEchoes(): void;
  /** Show a transient status toast. */
  _showToast(message: string, isError?: boolean): void;

  /**
   * CSS-driven 3D view-mode toggles generated from VIEW_MODES
   * (src/tabManager/viewModes.js): toggleOrbitView, toggleHelixView, …
   */
  [method: `toggle${string}View`]: () => void;

  /** Read-only per-view flags (`viewMode === value`): isCascadeView, … */
  readonly [flag: `is${string}View`]: boolean;
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
