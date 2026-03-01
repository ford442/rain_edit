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
export const STORAGE_CATEGORIES = ['songs', 'patterns', 'banks', 'samples', 'shaders', 'music'];

export class StorageAPI {
  /**
   * @param {string} [baseUrl] - Optional override for the backend base URL.
   */
  constructor(baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
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
   * Fetch the full content / code for a specific file.
   * For shaders: hits `GET /api/shaders/{id}/code`.
   * For everything else: hits `GET /api/songs/{id}`.
   * @param {string|number} id
   * @param {string} type - Category type, used to route to the correct endpoint.
   * @returns {Promise<object>}
   */
  async fetchFileContent(id, type) {
    let url;
    if (type === 'shaders') {
      url = `${this.baseUrl}/api/shaders/${encodeURIComponent(id)}/code`;
    } else {
      url = `${this.baseUrl}/api/songs/${encodeURIComponent(id)}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`StorageAPI fetchFileContent(${id}, ${type}) failed: ${res.status}`);
    return res.json();
  }
}
