/**
 * Cabinet3D — A 3D "Cube of Cubes" file cabinet visualizer.
 *
 * Renders a Three.js scene as a full-screen overlay modal.
 * Supports:
 *  - Level 1: Category cubes (one per STORAGE_CATEGORIES entry)
 *  - Level 2: File cubes (populated dynamically from the StorageAPI)
 *  - OrbitControls for basic rotation
 *  - Raycasting: click a category cube to zoom in; click a file cube to open it
 *    in the Monaco editor via TabManager.addFile()
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STORAGE_CATEGORIES } from "./StorageAPI.js";

// ─── Visual constants ────────────────────────────────────────────────────────

/** Colour tint for each category slot (cycles when more than palette length). */
export const CATEGORY_COLORS = [
  0x00aaff, // songs   — blue
  0x00ffaa, // patterns — teal
  0xff6600, // banks    — orange
  0xffaa00, // samples  — amber
  0xaa00ff, // shaders  — purple
  0x00ff66, // music    — green
  0xff0066, // images   — pink/red
  0xffff00, // notes    — yellow
];

export const CAT_CUBE_SIZE = 1.4; // side-length of each category cube
export const FILE_CUBE_SIZE = 0.25; // side-length of each file cube
export const GRID_GAP = 0.35; // gap between category cubes in the Rubik's grid
export const FILE_ORBIT_R = 1.0; // radius of the file-cube shell around its parent

// Camera animation duration in ms
export const CAM_ANIM_MS = 800;

// Preview panel config
export const LABEL_TRUNCATE_LEN = 16;
export const PREVIEW_DEBOUNCE_MS = 500;
export const PREVIEW_MAX_CHARS = 400;
export const PREVIEW_HIDE_GRACE_MS = 220; // ms to wait before hiding (lets mouse reach panel)

// Label LOD fade distances (world units)
export const LOD_NEAR = 2.5; // full opacity at this distance or closer
export const LOD_FAR = 8.0; // invisible at this distance or farther

// ─── Utility helpers ─────────────────────────────────────────────────────────

/** Linear interpolation */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Ease-out cubic */
export function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

/** Pick an icon character for a file based on its name and category. */
export function _fileTypeIcon(name, catName) {
  if (catName === "images") return "🖼";
  if (catName === "notes") return "📝";
  if (catName === "shaders") return "✨";
  if (catName === "songs" || catName === "music") return "🎵";
  if (catName === "patterns" || catName === "banks" || catName === "samples")
    return "🎛";
  const n = (name || "").toLowerCase();
  if (n.match(/\.(js|ts|jsx|tsx)$/)) return "⚡";
  if (n.endsWith(".json")) return "{}";
  if (n.endsWith(".py")) return "🐍";
  if (n.match(/\.(glsl|frag|vert|wgsl)$/)) return "🔮";
  if (n.match(/\.(md|txt)$/)) return "📝";
  if (n.match(/\.(html|css)$/)) return "🌐";
  return "📄";
}

/** True when the file should render as a thumbnail image rather than a text snippet. */
export function _isImageFile(name, catName) {
  if (catName === "images") return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(name || "");
}

/** Human-readable file size string. */
export function _formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ─── Main class ──────────────────────────────────────────────────────────────

export class Cabinet3D {
  /**
   * @param {import('./StorageAPI.js').StorageAPI} storageAPI
   * @param {import('./TabManager.js').TabManager}  tabManager
   */
  constructor(storageAPI, tabManager, monacoApi = null) {
    this.storageAPI = storageAPI;
    this.tabManager = tabManager;
    this._monacoApi = monacoApi;
    this.visible = false;

    // Overlay DOM element
    this._overlay = null;
    // Three.js core
    this._renderer = null;
    this._scene = null;
    this._camera = null;
    this._controls = null;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    // Reusable vector for hover raycasting (separate from click raycaster)
    this._hoverMouse = new THREE.Vector2();
    this._hoveredMesh = null;

    // File hover + preview state
    this._hoveredFileMesh = null;
    this._prevHoveredFileMesh = null;
    this._previewFetchTimer = null;
    this._previewHideTimer = null;
    this._previewCache = new Map(); // cacheKey → text snippet
    this._previewCacheHtml = new Map(); // cacheKey → syntax-highlighted HTML
    this._previewPanel = null;
    this._previewTargetMesh = null;
    this._pinnedFileMesh = null;
    this._isPinned = false;
    this._lodFrameCounter = 0;

    // Scene objects
    this._catMeshes = []; // { mesh, catIndex, catName }
    this._fileMeshes = []; // { mesh, catIndex, fileData }

    // Camera animation state
    this._camAnim = null;

    // Currently focused category (-1 = none)
    this._focusedCat = -1;

    // Track which categories have had files loaded
    this._loadedCats = new Set();

    this._rafId = null;

    this._build();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Show the cabinet overlay. */


  /** Hide the cabinet overlay. */


  /** Expose the Three.js renderer canvas so the rain shader can read it as a texture. */


  /**
   * Return the screen-space position (CSS px) of the currently hovered or pinned file
   * cube, or null when nothing is active.  Used by the main animate loop for continuous
   * frame-driven rain clearing — mousemove events alone stop firing when the cursor is
   * stationary, so this lets the clearing persist.
   * @returns {{ x: number, y: number, r: number } | null}
   */


  /** Toggle visibility. */


  // ─── Internals ──────────────────────────────────────────────────────────────



  /** Create the full-screen transparent HTML overlay (controls only, no background). */


  /** Initialise the Three.js renderer, scene and camera. */


  /** Place one category cube per STORAGE_CATEGORIES entry in a grid. */


  /**
   * Build a canvas-based text sprite for a label.
   * @param {string} text
   * @returns {THREE.Sprite}
   */


  /**
   * Build a small canvas-texture sprite label for a file cube.
   * Shown at reduced opacity by default; boosts to full on hover.
   * @param {string} filename
   * @returns {THREE.Sprite}
   */


  /** Build the HTML file-preview panel and attach it to the document body. */


  /** Populate and show the preview panel for a file mesh (metadata only; content lazy). */


  /** Hide and reset the preview panel, cancelling any pending fetch or hide timer. */


  /** Sync the 📌 pin button visual to `_isPinned` state. */


  /**
   * Fetch a content snippet for a file cube (called after debounce).
   * Text and highlighted HTML are cached independently; repeated hovers are instant.
   */


  /** Write text or HTML into the content <pre> element. */


  /** Reposition the preview panel to follow the hovered file cube each frame. */


  /**
   * Fade label sprite opacity based on camera-to-cube world distance (LOD).
   * Throttled to every 8 frames; hover-animated meshes are skipped.
   */


  /**
   * Lerp file cube scale and emissive intensity toward hover/rest targets.
   * Only touches the actively hovered cube and the previously hovered one.
   */


  /**
   * Add a visual badge indicator to mark remote VPS files.
   * Creates a small canvas texture with a cloud icon.
   * @param {THREE.Mesh} fileMesh
   */


  /**
   * Fetch files from both local storage and remote VPS for a category.
   * Merges local and remote files, marking remote files with isRemote flag.
   * @param {string} catName
   * @returns {Promise<Array>}
   */


  /**
   * Populate file cubes around a category cube after the API responds.
   * For shaders with coordinates, positions are mapped from coordinate (0-1000) to 3D space.
   * @param {number} catIndex
   * @param {Array}  files
   */


  /** Bind window events. */


  /**
   * Project a Three.js world position to CSS pixel coordinates on screen.
   * @param {THREE.Vector3} worldPos
   * @returns {{ x: number, y: number }}
   */


  /**
   * Handle mousemove: raycast to find hovered cube and dispatch rain-clear event
   * so the main loop can wipe droplets off the glass in front of the hovered item.
   */


  /** Handle window resize. */


  /** Handle click on the Three.js canvas. */


  /**
   * Focus camera on a category cube and load its files.
   * @param {number} catIndex
   * @param {string} catName
   */


  /**
   * Open a file in the Monaco editor via TabManager.
   * Dispatches 'fileCubeClicked' event for main.js to handle with depth focus logic.
   * @param {number} catIndex
   * @param {object} fileData - Metadata object from the API.
   */


  /**
   * Infer a Monaco language identifier from the category or file data.
   * @param {string} catName
   * @param {object} data
   * @returns {string}
   */


  /**
   * Smooth camera animation to a new position/target.
   * @param {THREE.Vector3} toPos
   * @param {THREE.Vector3} toTarget
   */


  /** Update camera animation each frame. */


  /** Gentle idle rotation for category cubes. */


  /** Main render loop. */





}

// --- Mixins ---
import { Cabinet3DMixin0 } from './Cabinet3D_0.js';
Object.assign(Cabinet3D.prototype, Cabinet3DMixin0);
import { Cabinet3DMixin1 } from './Cabinet3D_1.js';
Object.assign(Cabinet3D.prototype, Cabinet3DMixin1);

// --- Mixins ---


// --- Mixins ---


// --- Mixins ---


// --- Mixins ---
