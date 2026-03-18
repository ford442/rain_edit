/**
 * StorageAPI — thin client for the FastAPI storage backend.
 *
 * Base URL resolves from the VITE_STORAGE_BASE_URL env var at build-time
 * (populated via import.meta.env) or falls back to a configurable constant.
 */

const DEFAULT_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_STORAGE_BASE_URL
    ? import.meta.env.VITE_STORAGE_BASE_URL
    : 'https://ford442-storage-manager.hf.space';

/**
 * Categories tracked in the remote storage.
 */
export const STORAGE_CATEGORIES = ['songs', 'patterns', 'banks', 'samples', 'shaders', 'music', 'images'];

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
}
