/**
 * StorageAPI — thin client for the FastAPI storage backend.
 *
 * Base URL resolves from the VITE_STORAGE_BASE_URL env var at build-time
 * (populated via import.meta.env) or falls back to a configurable constant.
 */

const DEFAULT_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_STORAGE_BASE_URL
    ? import.meta.env.VITE_STORAGE_BASE_URL
    : 'https://storage.noahcohn.com';

/**
 * Categories tracked in the remote storage.
 */
export const STORAGE_CATEGORIES = ['songs', 'patterns', 'banks', 'samples', 'shaders', 'music', 'images', 'notes'];

export class StorageAPI {
  /**
   * @param {string} [baseUrl] - Optional override for the backend base URL.
   */
  constructor(baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Generic fetch wrapper with error handling.
   * @param {string} endpoint - API endpoint (without base URL).
   * @returns {Promise<object>}
   */
  async _fetch(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`StorageAPI Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Fetch the list of items for a given category.
   * Hits `GET /api/songs?type={type}`.
   * @param {string} type - One of the STORAGE_CATEGORIES values.
   * @returns {Promise<Array>}
   */
  async fetchCategory(type) {
    const url = `${this.baseUrl}/api/songs?type=${encodeURIComponent(type)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`StorageAPI fetchCategory(${type}) failed: ${res.status}`);
    return res.json();
  }

  /**
   * Fetch category files with sorting support for the 3D Cabinet.
   * For shaders: uses coordinate sorting to map positions in 3D space.
   * @param {string} type - Category type ('shader' for shaders, or standard categories).
   * @returns {Promise<Array>}
   */
  async getCategoryFiles(type) {
    // Map 'shaders' category to 'shader' type for API
    const apiType = type === 'shaders' ? 'shader' : type;
    
    if (apiType === 'shader') {
      // Shader endpoint supports coordinate sorting
      return this._fetch('/api/shaders?sort_by=coordinate');
    } else {
      // Standard JSON endpoints
      return this._fetch(`/api/songs?type=${encodeURIComponent(apiType)}&sort_by=date`);
    }
  }

  /**
   * Fetch the full content / code for a specific file.
   * For shaders: hits `GET /api/shaders/{id}/code`.
   * For everything else: hits `GET /api/songs/{id}`.
   * @param {string|number} id
   * @param {string} type - Category type, used to route to the correct endpoint.
   * @returns {Promise<object>}
   */
  async fetchFileContent(id, type) {
    let url;
    // Handle both 'shader' and 'shaders' type names
    if (type === 'shaders' || type === 'shader') {
      url = `${this.baseUrl}/api/shaders/${encodeURIComponent(id)}/code`;
    } else {
      url = `${this.baseUrl}/api/songs/${encodeURIComponent(id)}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`StorageAPI fetchFileContent(${id}, ${type}) failed: ${res.status}`);
    return res.json();
  }

  /**
   * Fetch file content with language detection for Monaco editor.
   * Returns standardized format with content and language.
   * @param {string|number} id
   * @param {string} type - Category type.
   * @returns {Promise<{content: string, language: string}>}
   */
  async getFileContent(id, type) {
    const apiType = type === 'shaders' ? 'shader' : type;
    
    if (apiType === 'shader') {
      // Shader endpoint returns { id, code, name }
      const data = await this._fetch(`/api/shaders/${encodeURIComponent(id)}/code`);
      return {
        content: data.code,
        language: 'wgsl' // Monaco language format for WebGPU shaders
      };
    } else if (apiType === 'brainfuck') {
      const data = await this._fetch(`/api/songs/${encodeURIComponent(id)}?type=${encodeURIComponent(apiType)}`);
      return {
        content: data.code || JSON.stringify(data, null, 2),
        language: 'brainfuck'
      };
    } else {
      // Standard JSON endpoints
      const data = await this._fetch(`/api/songs/${encodeURIComponent(id)}?type=${encodeURIComponent(apiType)}`);
      return {
        content: JSON.stringify(data, null, 2),
        language: 'json'
      };
    }
  }

  /**
   * Record play count when a user opens a file.
   * @param {string|number} id
   * @param {string} type - Category type.
   */
  async recordPlay(id, type) {
    const apiType = type === 'shaders' ? 'shader' : type;
    
    if (apiType === 'shader') {
      // Fire and forget - don't await, don't throw
      fetch(`${this.baseUrl}/api/shaders/${encodeURIComponent(id)}/play`, { 
        method: 'POST' 
      }).catch(console.error);
    }
  }

  // ── VPS File Browser ──────────────────────────────────────────────────────

  /**
   * List the contents of a directory on the Contabo VPS.
   * @param {string} path - Relative path under files_dir (e.g. 'audio/flac')
   * @returns {Promise<Array<{name,path,type,size,modified,mime}>>}
   */
  async browseVPS(path = '') {
    const url = `${this.baseUrl}/api/vps/browse?path=${encodeURIComponent(path)}`;
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`Browse failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[StorageAPI] browseVPS error:', err);
      return [];
    }
  }

  /**
   * Fetch the text content of a file on the VPS.
   * @param {string} path - Relative file path (e.g. 'sequencer/songs/foo.json')
   * @returns {Promise<string>} file text content
   */
  async getVPSFile(path) {
    const url = `${this.baseUrl}/api/vps/file?path=${encodeURIComponent(path)}`;
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`Get file failed: ${res.status}`);
      return await res.text();
    } catch (err) {
      console.error('[StorageAPI] getVPSFile error:', err);
      return null;
    }
  }

  /**
   * Get the URL to stream/download a file from the VPS.
   * @param {string} path - Relative file path
   * @returns {string} full URL
   */
  getVPSFileURL(path) {
    return `${this.baseUrl}/api/vps/file?path=${encodeURIComponent(path)}`;
  }

  /**
   * Upload a File object to a directory on the VPS.
   * @param {File} file - The File to upload
   * @param {string} dirPath - Target directory relative path
   * @param {Function} [onProgress] - Optional progress callback (0-100)
   * @returns {Promise<{success,path,size}|null>}
   */
  async uploadVPSFile(file, dirPath = '', onProgress = null) {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', dirPath);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/api/vps/upload`);

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { resolve({ success: true }); }
        } else {
          console.error('[StorageAPI] uploadVPSFile failed:', xhr.status, xhr.responseText);
          resolve(null);
        }
      };

      xhr.onerror = () => {
        console.error('[StorageAPI] uploadVPSFile network error');
        resolve(null);
      };

      xhr.send(formData);
    });
  }

  /**
   * Overwrite a text file on the VPS with new content (save edits).
   * Hits `POST /api/vps/save`.
   * @param {string} path - Relative file path
   * @param {string} content - New text content
   * @returns {Promise<{success,path,size}|null>}
   */
  async saveVPSFile(path, content) {
    const url = `${this.baseUrl}/api/vps/save`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[StorageAPI] saveVPSFile error:', err);
      return null;
    }
  }

  /**
   * Create a directory on the VPS.
   * Hits `POST /api/vps/mkdir`.
   * @param {string} path - Relative directory path to create
   * @returns {Promise<{success,path}|null>}
   */
  async mkdirVPS(path) {
    const url = `${this.baseUrl}/api/vps/mkdir`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      if (!res.ok) throw new Error(`Mkdir failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[StorageAPI] mkdirVPS error:', err);
      return null;
    }
  }

  /**
   * Rename or move a file/directory on the VPS.
   * Hits `POST /api/vps/rename`.
   * @param {string} path - Current relative path
   * @param {string} newPath - New relative path
   * @returns {Promise<{success}|null>}
   */
  async renameVPSFile(path, newPath) {
    const url = `${this.baseUrl}/api/vps/rename`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, new_path: newPath }),
      });
      if (!res.ok) throw new Error(`Rename failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[StorageAPI] renameVPSFile error:', err);
      return null;
    }
  }

  /**
   * Delete a file on the VPS.
   * @param {string} path - Relative file path
   * @returns {Promise<boolean>}
   */
  async deleteVPSFile(path) {
    const url = `${this.baseUrl}/api/vps/file?path=${encodeURIComponent(path)}`;
    try {
      const res = await fetch(url, { method: 'DELETE', mode: 'cors' });
      return res.ok;
    } catch (err) {
      console.error('[StorageAPI] deleteVPSFile error:', err);
      return false;
    }
  }

  // ── Named Notes API ───────────────────────────────────────────────────────────

  /**
   * List all named notes on the backend.
   * @returns {Promise<Array<{name: string, updated_at: string, size: number}>>}
   */
  async listNotes() {
    const url = `${this.baseUrl}/api/notes/list`;
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`listNotes failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[StorageAPI] listNotes error:', err);
      return [];
    }
  }

  /**
   * Load a named note's content from the backend.
   * @param {string} noteName - The note name (no extension)
   * @returns {Promise<{name: string, content: string, updated_at: string}|null>}
   */
  async loadNote(noteName) {
    const url = `${this.baseUrl}/api/notes/read/${encodeURIComponent(noteName)}`;
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`loadNote(${noteName}) failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[StorageAPI] loadNote error:', err);
      return null;
    }
  }

  /**
   * Save (create or overwrite) a named note on the backend.
   * @param {string} noteName - The note name (no extension)
   * @param {string} content - The text content to save
   * @returns {Promise<{success: boolean, name: string, size: number, updated_at: string}|null>}
   */
  async saveNote(noteName, content) {
    const url = `${this.baseUrl}/api/notes/write/${encodeURIComponent(noteName)}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(`saveNote(${noteName}) failed: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[StorageAPI] saveNote error:', err);
      return null;
    }
  }

  /**
   * Delete a named note from the backend.
   * @param {string} noteName - The note name (no extension)
   * @returns {Promise<boolean>}
   */
  async deleteNote(noteName) {
    const url = `${this.baseUrl}/api/notes/delete/${encodeURIComponent(noteName)}`;
    try {
      const res = await fetch(url, { method: 'DELETE', mode: 'cors' });
      return res.ok;
    } catch (err) {
      console.error('[StorageAPI] deleteNote error:', err);
      return false;
    }
  }

  /**
   * Save a note to the notes category.
   * @param {string} name - Note name.
   * @param {string} content - Note content.
   * @returns {Promise<boolean>}
   */
  async saveNote(name, content) {
    try {
      const response = await fetch(`${this.baseUrl}/api/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'notes',
          name: name,
          content: content,
          timestamp: new Date().toISOString()
        })
      });
      return response.ok;
    } catch (err) {
      console.error('Failed to save note:', err);
      return false;
    }
  }
}
