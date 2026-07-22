// Response shapes for the FastAPI storage backend. Defining these keeps the
// StorageAPI surface free of `any`/loose `object` leakage (acceptance criterion).

/** One item returned by a category listing (`/api/songs`, `/api/shaders`). */
export interface CategoryItem {
  id: string | number;
  name: string;
  date?: string;
  [key: string]: unknown;
}

/** A category file normalized for the 3D Cabinet. */
export interface CabinetFile {
  id: string;
  name: string;
  date?: string;
}

/** Content + Monaco language for an opened file. */
export interface FileContent {
  content: string;
  language: string;
}

/** A directory entry from `/api/vps/browse`. */
export interface VpsEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  modified: string;
  mime?: string;
}

/** Result of a VPS write/upload/mkdir operation. */
export interface VpsWriteResult {
  success: boolean;
  path?: string;
  size?: number;
}

/** Metadata for a named note (`/api/notes/list`). */
export interface NoteMeta {
  name: string;
  updated_at: string;
  size: number;
}

/** A named note's content (`/api/notes/read`). */
export interface NoteContent {
  name: string;
  content: string;
  updated_at: string;
}

/** Result of saving a named note (`/api/notes/write`). */
export interface NoteSaveResult {
  success: boolean;
  name: string;
  size: number;
  updated_at: string;
}
