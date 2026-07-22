/**
 * IndexedDB session blob store with localStorage fallback.
 */

import { SESSION_STORAGE_KEY } from "./sessionSchema.js";

const DB_NAME = "rain-edit-workspace";
const DB_VERSION = 1;
const STORE = "kv";

/**
 * @param {string} name
 * @param {number} version
 * @returns {Promise<IDBDatabase>}
 */
function openDb(name = DB_NAME, version = DB_VERSION) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("indexedDB open failed"));
  });
}

/**
 * @param {string} key
 * @param {unknown} value
 */
export async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * @param {string} key
 * @returns {Promise<unknown>}
 */
export async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

/**
 * @param {string} key
 */
export async function idbDelete(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Persist a session object. Prefers IndexedDB; mirrors a compact meta copy
 * to localStorage for quick boot probes.
 * @param {object} session
 * @param {Storage | null} [local]
 */
export async function persistSession(session, local = globalThis.localStorage) {
  const json = JSON.stringify(session);
  try {
    await idbSet(SESSION_STORAGE_KEY, session);
  } catch (err) {
    console.warn("[workspace] IndexedDB persist failed; trying localStorage", err);
    try {
      local?.setItem(SESSION_STORAGE_KEY, json);
    } catch (lsErr) {
      console.error("[workspace] localStorage persist failed", lsErr);
      throw lsErr;
    }
    return "localStorage";
  }

  try {
    // Compact mirror for legacy readers / quick existence checks.
    local?.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        version: session.version,
        savedAt: session.savedAt,
        activeId: session.activeId,
        viewMode: session.viewMode,
        tabCount: session.tabs?.length ?? 0,
        idb: true,
      }),
    );
  } catch {
    // ignore quota on mirror
  }
  return "indexedDB";
}

/**
 * @param {Storage | null} [local]
 * @returns {Promise<object | null>}
 */
export async function loadPersistedSession(local = globalThis.localStorage) {
  try {
    const fromIdb = await idbGet(SESSION_STORAGE_KEY);
    if (fromIdb && typeof fromIdb === "object") return fromIdb;
  } catch {
    // fall through
  }

  try {
    const raw = local?.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Skip compact mirror stubs that only point at idb.
    if (parsed?.idb && !Array.isArray(parsed.tabs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPersistedSession(local = globalThis.localStorage) {
  try {
    await idbDelete(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    local?.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
