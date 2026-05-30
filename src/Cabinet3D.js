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
const CATEGORY_COLORS = [
  0x00aaff, // songs   — blue
  0x00ffaa, // patterns — teal
  0xff6600, // banks    — orange
  0xffaa00, // samples  — amber
  0xaa00ff, // shaders  — purple
  0x00ff66, // music    — green
  0xff0066, // images   — pink/red
  0xffff00, // notes    — yellow
];

const CAT_CUBE_SIZE = 1.4; // side-length of each category cube
const FILE_CUBE_SIZE = 0.25; // side-length of each file cube
const GRID_GAP = 0.35; // gap between category cubes in the Rubik's grid
const FILE_ORBIT_R = 1.0; // radius of the file-cube shell around its parent

// Camera animation duration in ms
const CAM_ANIM_MS = 800;

// Max characters shown on a file-cube label before truncating with an ellipsis
const LABEL_MAX_CHARS = 16;

// Number of characters fetched for the content snippet in the preview panel
const PREVIEW_SNIPPET_CHARS = 300;

/** File extensions we treat as binary/non-text for preview purposes. */
const BINARY_EXTS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg",
  "mp3", "wav", "flac", "ogg", "m4a", "aac",
  "mp4", "webm", "mov", "zip", "gz", "tar", "wasm", "bin",
]);

// ─── Utility helpers ─────────────────────────────────────────────────────────

/** Linear interpolation */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Ease-out cubic */
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Main class ──────────────────────────────────────────────────────────────

export class Cabinet3D {
  /**
   * @param {import('./StorageAPI.js').StorageAPI} storageAPI
   * @param {import('./TabManager.js').TabManager}  tabManager
   */
  constructor(storageAPI, tabManager) {
    this.storageAPI = storageAPI;
    this.tabManager = tabManager;
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

    // Scene objects
    this._catMeshes = []; // { mesh, catIndex, catName }
    this._fileMeshes = []; // { mesh, catIndex, fileData }

    // Camera animation state
    this._camAnim = null;

    // Currently focused category (-1 = none)
    this._focusedCat = -1;

    // Track which categories have had files loaded
    this._loadedCats = new Set();

    // Hover / selection state
    this._hoveredMesh = null; // file mesh currently under the cursor
    this._selectedMesh = null; // file mesh chosen via keyboard navigation
    this._hoverNeedsUpdate = false; // throttle raycasting to one test per frame
    this._previewFetchToken = 0; // guards against out-of-order snippet fetches
    this._snippetCache = new Map(); // fileData → snippet string (or null sentinel)
    this._searchTerm = ""; // active filter string (lowercased)

    this._rafId = null;

    this._build();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Show the cabinet overlay. */
  show() {
    if (this.visible) return;
    this.visible = true;
    this._overlay.style.display = "flex";
    this._onResize();
    this._startLoop();
  }

  /** Hide the cabinet overlay. */
  hide() {
    if (!this.visible) return;
    this.visible = false;
    this._overlay.style.display = "none";
    this._hidePreview();
    this._hoveredMesh = null;
    this._selectedMesh = null;
    this._stopLoop();
  }

  /** Toggle visibility. */
  toggle() {
    this.visible ? this.hide() : this.show();
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  _build() {
    this._buildOverlay();
    this._buildScene();
    this._buildCategoryCubes();
    this._buildPreviewPanel();
    this._buildSearchBox();
    this._bindEvents();
  }

  /** Create the full-screen transparent HTML overlay. */
  _buildOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "cabinet-overlay";
    overlay.style.cssText = [
      "position: fixed",
      "inset: 0",
      "display: none",
      "align-items: center",
      "justify-content: center",
      "z-index: 50",
      // Slightly translucent so the rain layers stay faintly visible behind
      // the 3D cabinet — the storm never fully disappears.
      "background: rgba(4,8,14,0.62)",
      "backdrop-filter: blur(3px)",
    ].join(";");

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕  Close Cabinet";
    closeBtn.style.cssText = [
      "position: absolute",
      "top: 16px",
      "right: 20px",
      "background: rgba(255,255,255,0.08)",
      "border: 1px solid rgba(255,255,255,0.18)",
      "color: #c0d0e0",
      "font-family: inherit",
      "font-size: 13px",
      "padding: 6px 14px",
      "border-radius: 6px",
      "cursor: pointer",
      "z-index: 51",
    ].join(";");
    closeBtn.addEventListener("click", () => this.hide());
    overlay.appendChild(closeBtn);

    // Status / hint label
    const hint = document.createElement("div");
    hint.id = "cabinet-hint";
    hint.style.cssText = [
      "position: absolute",
      "bottom: 20px",
      "left: 0",
      "right: 0",
      "text-align: center",
      "color: rgba(192,208,224,0.7)",
      "font-size: 12px",
      "pointer-events: none",
    ].join(";");
    hint.textContent =
      "Hover a cube to preview · Click to open · Arrow keys to navigate · Enter to open";
    overlay.appendChild(hint);

    this._hint = hint;

    document.body.appendChild(overlay);
    this._overlay = overlay;
  }

  /** Build the floating HTML preview panel (metadata + content snippet). */
  _buildPreviewPanel() {
    const panel = document.createElement("div");
    panel.id = "cabinet-preview";
    panel.style.cssText = [
      "position: absolute",
      "top: 64px",
      "left: 20px",
      "width: 300px",
      "max-height: 60vh",
      "display: none",
      "flex-direction: column",
      "gap: 8px",
      "padding: 14px 16px",
      "background: rgba(10,16,24,0.82)",
      "border: 1px solid rgba(0,229,255,0.35)",
      "border-radius: 10px",
      "box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(0,229,255,0.12)",
      "backdrop-filter: blur(6px)",
      "color: #c0d0e0",
      "font-family: 'JetBrains Mono', monospace",
      "font-size: 12px",
      "z-index: 52",
      "pointer-events: auto",
    ].join(";");

    const title = document.createElement("div");
    title.className = "cabinet-preview-title";
    title.style.cssText =
      "font-size:14px;font-weight:700;color:#e6f4ff;word-break:break-all;";
    panel.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "cabinet-preview-meta";
    meta.style.cssText =
      "font-size:11px;color:rgba(160,190,220,0.8);display:flex;flex-wrap:wrap;gap:6px;";
    panel.appendChild(meta);

    const snippet = document.createElement("pre");
    snippet.className = "cabinet-preview-snippet";
    snippet.style.cssText = [
      "margin: 0",
      "padding: 8px",
      "background: rgba(0,0,0,0.35)",
      "border-radius: 6px",
      "max-height: 220px",
      "overflow: auto",
      "white-space: pre-wrap",
      "word-break: break-word",
      "font-size: 11px",
      "line-height: 1.4",
      "color: #9fd8e0",
    ].join(";");
    panel.appendChild(snippet);

    const openBtn = document.createElement("button");
    openBtn.textContent = "⏎  Open in editor";
    openBtn.style.cssText = [
      "align-self: flex-start",
      "margin-top: 2px",
      "background: rgba(0,229,255,0.14)",
      "border: 1px solid rgba(0,229,255,0.5)",
      "color: #e6f4ff",
      "font-family: inherit",
      "font-size: 12px",
      "padding: 6px 14px",
      "border-radius: 6px",
      "cursor: pointer",
    ].join(";");
    openBtn.addEventListener("click", () => {
      if (this._previewTarget) {
        this._onFileClick(
          this._previewTarget.catIndex,
          this._previewTarget.fileData,
        );
      }
    });
    panel.appendChild(openBtn);

    this._overlay.appendChild(panel);
    this._previewPanel = panel;
    this._previewEls = { title, meta, snippet, openBtn };
    this._previewTarget = null;
  }

  /** Build the search/filter input that highlights matching file cubes. */
  _buildSearchBox() {
    const input = document.createElement("input");
    input.id = "cabinet-search";
    input.type = "search";
    input.placeholder = "🔍 Filter files…";
    input.style.cssText = [
      "position: absolute",
      "top: 16px",
      "left: 20px",
      "width: 240px",
      "background: rgba(10,16,24,0.8)",
      "border: 1px solid rgba(255,255,255,0.18)",
      "color: #c0d0e0",
      "font-family: 'JetBrains Mono', monospace",
      "font-size: 13px",
      "padding: 7px 12px",
      "border-radius: 6px",
      "z-index: 52",
      "outline: none",
    ].join(";");
    input.addEventListener("input", () => {
      this._searchTerm = input.value.trim().toLowerCase();
      this._applySearchHighlight();
    });
    // Keep keyboard navigation working without the input swallowing arrow keys
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        input.value = "";
        this._searchTerm = "";
        this._applySearchHighlight();
        input.blur();
      }
    });
    this._overlay.appendChild(input);
    this._searchInput = input;
  }

  /** Initialise the Three.js renderer, scene and camera. */
  _buildScene() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;";
    this._overlay.appendChild(renderer.domElement);
    this._renderer = renderer;

    const scene = new THREE.Scene();
    this._scene = scene;

    // Ambient + directional lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 8, 5);
    scene.add(dir);

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    camera.position.set(0, 0, 10);
    this._camera = camera;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;
    controls.minDistance = 3;
    controls.maxDistance = 30;
    this._controls = controls;
  }

  /** Place one category cube per STORAGE_CATEGORIES entry in a grid. */
  _buildCategoryCubes() {
    const n = STORAGE_CATEGORIES.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const step = CAT_CUBE_SIZE + GRID_GAP;

    const offsetX = ((cols - 1) * step) / 2;
    const offsetY = ((rows - 1) * step) / 2;

    STORAGE_CATEGORIES.forEach((name, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const geo = new THREE.BoxGeometry(
        CAT_CUBE_SIZE,
        CAT_CUBE_SIZE,
        CAT_CUBE_SIZE,
      );
      const mat = new THREE.MeshStandardMaterial({
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        transparent: true,
        opacity: 0.85,
        roughness: 0.4,
        metalness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(col * step - offsetX, -(row * step - offsetY), 0);
      mesh.userData = { type: "category", catIndex: i, catName: name };
      this._scene.add(mesh);
      this._catMeshes.push(mesh);

      // Wireframe outline
      const wGeo = new THREE.EdgesGeometry(geo);
      const wMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
      });
      const wMesh = new THREE.LineSegments(wGeo, wMat);
      mesh.add(wMesh);

      // Text sprite label
      const sprite = this._makeTextSprite(name);
      sprite.position.set(0, -(CAT_CUBE_SIZE / 2 + 0.25), 0);
      mesh.add(sprite);
    });
  }

  /**
   * Build a canvas-based text sprite for a label.
   * @param {string} text
   * @returns {THREE.Sprite}
   */
  _makeTextSprite(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#c0d0e0";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(1.2, 0.3, 1);
    return spr;
  }

  /**
   * Build a compact camera-facing label sprite for a file cube.
   * Rendered onto a pill background so small text stays legible over cubes.
   * Starts hidden (opacity 0) — shown on hover/selection/category focus.
   * @param {string} text
   * @returns {THREE.Sprite}
   */
  _makeFileLabelSprite(text) {
    const label =
      text.length > LABEL_MAX_CHARS
        ? text.slice(0, LABEL_MAX_CHARS - 1) + "…"
        : text;

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 48;
    const ctx = canvas.getContext("2d");

    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Rounded pill background sized to the text
    const tw = Math.min(248, ctx.measureText(label).width + 24);
    const x0 = (256 - tw) / 2;
    const r = 12;
    ctx.fillStyle = "rgba(8,14,22,0.78)";
    ctx.beginPath();
    ctx.moveTo(x0 + r, 6);
    ctx.arcTo(x0 + tw, 6, x0 + tw, 42, r);
    ctx.arcTo(x0 + tw, 42, x0, 42, r);
    ctx.arcTo(x0, 42, x0, 6, r);
    ctx.arcTo(x0, 6, x0 + tw, 6, r);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#e6f4ff";
    ctx.fillText(label, 128, 25);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthTest: false, // labels float above the geometry, never z-clipped
      depthWrite: false,
    });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(0.9, 0.17, 1);
    spr.renderOrder = 999;
    return spr;
  }

  /**
   * Add a visual badge indicator to mark remote VPS files.
   * Creates a small canvas texture with a cloud icon.
   * @param {THREE.Mesh} fileMesh
   */
  _addRemoteFileBadge(fileMesh) {
    try {
      // Create a small canvas for the badge
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");

      // Draw badge background (semi-transparent white circle)
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.fill();

      // Draw cloud icon (☁️ representation)
      ctx.fillStyle = "#0066ff";
      ctx.font = "bold 40px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("☁", 32, 32);

      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearFilter;

      // Create a small sprite positioned at the top-right of the file cube
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(0.4, 0.4, 1);
      sprite.position.set(
        FILE_CUBE_SIZE * 0.4,
        FILE_CUBE_SIZE * 0.4,
        FILE_CUBE_SIZE * 0.4,
      );

      fileMesh.add(sprite);
    } catch (err) {
      console.warn("Failed to add remote file badge:", err);
    }
  }

  /**
   * Fetch files from both local storage and remote VPS for a category.
   * Merges local and remote files, marking remote files with isRemote flag.
   * @param {string} catName
   * @returns {Promise<Array>}
   */
  async _fetchCategoryFilesWithRemote(catName) {
    try {
      // Fetch local files from StorageAPI
      let localFiles = [];
      try {
        const localData = await this.storageAPI.getCategoryFiles(catName);
        localFiles = Array.isArray(localData)
          ? localData
          : localData.items || localData.data || [];
        // Mark local files
        localFiles = localFiles.map((f) => ({ ...f, isRemote: false }));
      } catch (err) {
        console.warn(`Could not fetch local files for ${catName}:`, err);
      }

      // Try to fetch remote files from VPS
      let remoteFiles = [];
      try {
        // Try to browse a category-specific path first, then fall back to root
        const paths = [`/${catName}`, "/"];
        for (const path of paths) {
          try {
            const items = await this.storageAPI.browseVPS(path);
            if (items && items.length > 0) {
              // Filter for files only (not directories), limit to 32
              remoteFiles = items
                .filter((item) => item.type === "file")
                .slice(0, 32)
                .map((item) => ({
                  ...item,
                  id: `vps_${item.path}`, // Use path as unique ID for VPS files
                  name: item.name || item.path.split("/").pop(),
                  isRemote: true,
                  vpsPath: item.path,
                }));
              break; // Successfully loaded, don't try other paths
            }
          } catch (err) {
            // Continue to next path
          }
        }
      } catch (err) {
        console.warn(`Could not fetch remote files for ${catName}:`, err);
      }

      // Merge and return both lists
      return [...localFiles, ...remoteFiles];
    } catch (err) {
      console.error(`Error fetching files for ${catName}:`, err);
      return [];
    }
  }

  /**
   * Populate file cubes around a category cube after the API responds.
   * For shaders with coordinates, positions are mapped from coordinate (0-1000) to 3D space.
   * @param {number} catIndex
   * @param {Array}  files
   */
  _buildFileCubes(catIndex, files) {
    if (this._loadedCats.has(catIndex)) return;
    this._loadedCats.add(catIndex);

    const catMesh = this._catMeshes[catIndex];
    const catName = STORAGE_CATEGORIES[catIndex];
    const maxShown = Math.min(files.length, 32); // cap at 32 to keep geometry count manageable; remaining files are not lost — re-fetching the category always returns the full list

    const geo = new THREE.BoxGeometry(
      FILE_CUBE_SIZE,
      FILE_CUBE_SIZE,
      FILE_CUBE_SIZE,
    );

    for (let i = 0; i < maxShown; i++) {
      const fileData = files[i];
      let x, y, z;

      // Check if file has a coordinate (for shaders) - maps 0-1000 to 3D position
      if (fileData.coordinate !== undefined && fileData.coordinate !== null) {
        // Map coordinate (0-1000) to a spherical shell position
        const coord = Math.max(0, Math.min(1000, fileData.coordinate));
        const normalizedCoord = coord / 1000; // 0 to 1

        // Create a spiral distribution based on coordinate
        const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Golden angle for even distribution
        const theta = normalizedCoord * Math.PI * 4; // 2 full rotations
        const phi = goldenAngle * i;

        x = FILE_ORBIT_R * Math.sin(theta) * Math.cos(phi);
        y = FILE_ORBIT_R * Math.sin(theta) * Math.sin(phi);
        z = FILE_ORBIT_R * Math.cos(theta);
      } else {
        // Default Fibonacci sphere distribution
        const phi = Math.acos(1 - (2 * (i + 0.5)) / maxShown);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;

        x = FILE_ORBIT_R * Math.sin(phi) * Math.cos(theta);
        y = FILE_ORBIT_R * Math.sin(phi) * Math.sin(theta);
        z = FILE_ORBIT_R * Math.cos(phi);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: CATEGORY_COLORS[catIndex % CATEGORY_COLORS.length],
        transparent: true,
        opacity: 0.9,
        roughness: 0.6,
        emissive: CATEGORY_COLORS[catIndex % CATEGORY_COLORS.length],
        emissiveIntensity: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);

      const filename =
        fileData.filename || fileData.name || `${catName}-${i}`;
      const label = this._makeFileLabelSprite(filename);
      // Float the label just above the cube
      label.position.set(0, FILE_CUBE_SIZE * 1.4, 0);
      mesh.add(label);

      mesh.userData = {
        type: "file",
        catIndex,
        fileData,
        catName,
        filename,
        isRemote: fileData.isRemote || false,
        label,
        baseScale: 1, // animated toward on hover/selection
        targetScale: 1,
        baseEmissive: 0.2, // emissiveIntensity at rest
        targetEmissive: 0.2,
        dimmed: false, // set by search filtering
      };
      catMesh.add(mesh); // parented to the category cube
      this._fileMeshes.push(mesh);

      // Add visual badge for remote files
      if (fileData.isRemote) {
        this._addRemoteFileBadge(mesh);
      }
    }

    // A freshly populated category should immediately reflect any active filter
    if (this._searchTerm) this._applySearchHighlight();
  }

  /** Bind window events. */
  _bindEvents() {
    window.addEventListener("resize", () => this._onResize());
    this._overlay.addEventListener("click", (e) => this._onClick(e));

    // Hover: record pointer position, defer the raycast to the render loop
    this._renderer.domElement.addEventListener("mousemove", (e) => {
      const rect = this._renderer.domElement.getBoundingClientRect();
      this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this._mouse.y = ((e.clientY - rect.top) / rect.height) * -2 + 1;
      this._hoverNeedsUpdate = true;
    });

    // Keyboard navigation — only while the overlay is visible
    window.addEventListener("keydown", (e) => {
      if (!this.visible) return;
      this._onKeyDown(e);
    });
  }

  /** Keyboard navigation: arrows to move selection, Enter to open, Esc to close. */
  _onKeyDown(e) {
    // Don't hijack typing in the search box (except Enter to open top match)
    const typing = document.activeElement === this._searchInput;

    if (e.key === "Escape") {
      if (this._previewPanel.style.display !== "none") {
        this._hidePreview();
        this._setSelected(null);
      } else {
        this.hide();
      }
      return;
    }

    if (e.key === "Enter") {
      const sel = this._selectedMesh || this._hoveredMesh;
      if (sel) {
        e.preventDefault();
        const ud = sel.userData;
        this._onFileClick(ud.catIndex, ud.fileData);
      }
      return;
    }

    if (typing) return;

    const navKeys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"];
    if (!navKeys.includes(e.key)) return;
    e.preventDefault();

    const candidates = this._navigableMeshes();
    if (candidates.length === 0) return;

    let idx = candidates.indexOf(this._selectedMesh);
    const step =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    idx = idx === -1 ? 0 : (idx + step + candidates.length) % candidates.length;

    const next = candidates[idx];
    this._setSelected(next);
    this._showPreviewFor(next);
  }

  /** File meshes eligible for keyboard navigation (focused category, else all). */
  _navigableMeshes() {
    const pool =
      this._focusedCat >= 0
        ? this._fileMeshes.filter(
            (m) => m.userData.catIndex === this._focusedCat,
          )
        : this._fileMeshes;
    return this._searchTerm
      ? pool.filter((m) => !m.userData.dimmed)
      : pool;
  }

  /** Handle window resize. */
  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._renderer.setSize(w, h);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
  }

  /** Handle click on the Three.js canvas. */
  _onClick(e) {
    // Ignore clicks on the close button
    if (e.target !== this._renderer.domElement) return;

    const rect = this._renderer.domElement.getBoundingClientRect();
    this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = ((e.clientY - rect.top) / rect.height) * -2 + 1;

    this._raycaster.setFromCamera(this._mouse, this._camera);
    const intersects = this._raycaster.intersectObjects(
      this._scene.children,
      true,
    );

    for (const hit of intersects) {
      const ud = hit.object.userData;
      if (ud.type === "category") {
        this._onCategoryClick(ud.catIndex, ud.catName);
        return;
      }
      if (ud.type === "file") {
        this._onFileClick(ud.catIndex, ud.fileData);
        return;
      }
    }
  }

  /**
   * Focus camera on a category cube and load its files.
   * @param {number} catIndex
   * @param {string} catName
   */
  _onCategoryClick(catIndex, catName) {
    if (this._focusedCat === catIndex) {
      // Second click: zoom back out
      this._focusedCat = -1;
      this._animateCamera(
        new THREE.Vector3(0, 0, 10),
        new THREE.Vector3(0, 0, 0),
      );
      this._hint.textContent =
        "Click a category cube to explore · Click a file cube to open it";
      return;
    }

    this._focusedCat = catIndex;
    const target = this._catMeshes[catIndex].position.clone();
    const camPos = target.clone().add(new THREE.Vector3(0, 0, 4));
    this._animateCamera(camPos, target);
    this._hint.textContent = `Loading ${catName}…`;
    // Lazy-load files for this category
    if (!this._loadedCats.has(catIndex)) {
      this.storageAPI
        .getCategoryFiles(catName)
        .then((files) => {
          const list = Array.isArray(files)
            ? files
            : files.items || files.data || [];

          this._buildFileCubes(catIndex, list);
          this._hint.textContent = `${catName}: ${list.length} file(s) · Click a file cube to open`;
        })
        .catch(() => {
          this._hint.textContent = `${catName}: could not load files (check backend)`;
        });
    } else {
      this._hint.textContent = `${catName} · Click a file cube to open it`;
    }
  }

  /**
   * Open a file in the Monaco editor via TabManager.
   * Dispatches 'fileCubeClicked' event for main.js to handle with depth focus logic.
   * @param {number} catIndex
   * @param {object} fileData - Metadata object from the API.
   */
  _onFileClick(catIndex, fileData) {
    const catName = STORAGE_CATEGORIES[catIndex];
    const id = fileData.id || fileData._id || fileData.name || "unknown";
    const filename = fileData.filename || fileData.name || `${catName}-${id}`;

    // Dispatch custom event for main.js to handle with depth focus
    const event = new CustomEvent("fileCubeClicked", {
      detail: {
        id,
        type: catName,
        name: filename,
        fileData,
        catIndex,
      },
    });
    window.dispatchEvent(event);

    this._hint.textContent = `Opening ${filename}…`;
  }

  // ─── Hover / selection / preview ───────────────────────────────────────────

  /** Raycast under the cursor and update hover state. Called once per frame. */
  _updateHover() {
    if (!this._hoverNeedsUpdate) return;
    this._hoverNeedsUpdate = false;

    this._raycaster.setFromCamera(this._mouse, this._camera);
    const intersects = this._raycaster.intersectObjects(
      this._fileMeshes,
      false,
    );
    const hit = intersects.length ? intersects[0].object : null;

    if (hit !== this._hoveredMesh) {
      this._hoveredMesh = hit;
      this._renderer.domElement.style.cursor = hit ? "pointer" : "default";
      if (hit) this._showPreviewFor(hit);
    }
  }

  /** Mark a mesh as the keyboard-selected cube (drives scale/emissive too). */
  _setSelected(mesh) {
    this._selectedMesh = mesh;
  }

  /**
   * Populate and show the preview panel for a file mesh, then lazily fetch a
   * content snippet. Metadata renders instantly; the snippet streams in.
   * @param {THREE.Mesh} mesh
   */
  _showPreviewFor(mesh) {
    const ud = mesh.userData;
    const { fileData, catName, filename, isRemote } = ud;
    this._previewTarget = { catIndex: ud.catIndex, fileData };

    const { title, meta, snippet } = this._previewEls;
    title.textContent = filename;

    // Build metadata chips: origin, type, size, date when available
    const chips = [];
    chips.push(isRemote ? "☁ remote" : "💾 local");
    chips.push(catName);
    const size = fileData.size ?? fileData.bytes;
    if (typeof size === "number") chips.push(this._formatSize(size));
    const date =
      fileData.date || fileData.modified || fileData.updated_at;
    if (date) chips.push(this._formatDate(date));
    meta.innerHTML = "";
    chips.forEach((c) => {
      const span = document.createElement("span");
      span.textContent = c;
      span.style.cssText =
        "padding:2px 7px;background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.25);border-radius:10px;";
      meta.appendChild(span);
    });

    this._previewPanel.style.display = "flex";

    // Content snippet — fetched lazily, cached, and guarded against races
    const ext = (filename.split(".").pop() || "").toLowerCase();
    if (catName === "images" || BINARY_EXTS.has(ext)) {
      snippet.textContent = "⛔ Binary file — preview not available.";
      return;
    }
    if (this._snippetCache.has(fileData)) {
      snippet.textContent =
        this._snippetCache.get(fileData) || "(empty file)";
      return;
    }

    snippet.textContent = "Loading preview…";
    const token = ++this._previewFetchToken;
    this._fetchSnippet(ud)
      .then((text) => {
        this._snippetCache.set(fileData, text);
        // Ignore if the user has since hovered something else
        if (token === this._previewFetchToken) {
          snippet.textContent = text || "(empty file)";
        }
      })
      .catch(() => {
        if (token === this._previewFetchToken) {
          snippet.textContent = "⚠ Could not load preview.";
        }
      });
  }

  /**
   * Fetch a short content snippet for a file via the StorageAPI.
   * @param {object} ud - file mesh userData
   * @returns {Promise<string>}
   */
  async _fetchSnippet(ud) {
    const { fileData, catName } = ud;
    let content = "";
    if (fileData.isRemote && fileData.vpsPath) {
      content = (await this.storageAPI.getVPSFile(fileData.vpsPath)) || "";
    } else {
      const id =
        fileData.id || fileData._id || fileData.name || fileData.filename;
      const data = await this.storageAPI.getFileContent(id, catName);
      content = data && data.content ? data.content : "";
    }
    const trimmed = content.slice(0, PREVIEW_SNIPPET_CHARS);
    return content.length > PREVIEW_SNIPPET_CHARS ? trimmed + "…" : trimmed;
  }

  /** Hide the preview panel and clear its target. */
  _hidePreview() {
    this._previewPanel.style.display = "none";
    this._previewTarget = null;
    this._previewFetchToken++; // cancel any in-flight snippet
  }

  /** Format a byte count as a human-readable size. */
  _formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /** Format an ISO/epoch date loosely; falls back to the raw value. */
  _formatDate(date) {
    try {
      const d = new Date(date);
      if (!isNaN(d.getTime())) return d.toLocaleDateString();
    } catch (e) {
      /* fall through */
    }
    return String(date);
  }

  // ─── Search highlighting ───────────────────────────────────────────────────

  /** Dim file cubes that don't match the current search term. */
  _applySearchHighlight() {
    const term = this._searchTerm;
    let matches = 0;
    this._fileMeshes.forEach((mesh) => {
      const ud = mesh.userData;
      const isMatch =
        !term || ud.filename.toLowerCase().includes(term);
      ud.dimmed = !!term && !isMatch;
      if (isMatch && term) matches++;
      mesh.material.opacity = ud.dimmed ? 0.12 : 0.9;
    });
    if (term) {
      this._hint.textContent = `Filter "${term}": ${matches} match(es)`;
    }
  }

  /**
   * Infer a Monaco language identifier from the category or file data.
   * @param {string} catName
   * @param {object} data
   * @returns {string}
   */
  _detectLanguage(catName, data) {
    if (catName === "shaders") return "glsl";
    if (catName === "images") return "image";
    if (catName === "notes") return "markdown";
    if (data.language) return data.language;
    const name = (data.filename || data.name || "").toLowerCase();
    if (
      name.endsWith(".png") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".gif") ||
      name.endsWith(".webp")
    )
      return "image";
    if (name.endsWith(".js")) return "javascript";
    if (name.endsWith(".ts")) return "typescript";
    if (name.endsWith(".json")) return "json";
    if (name.endsWith(".py")) return "python";
    if (
      name.endsWith(".glsl") ||
      name.endsWith(".frag") ||
      name.endsWith(".vert")
    )
      return "glsl";
    if (
      catName === "songs" ||
      catName === "patterns" ||
      catName === "banks" ||
      catName === "music"
    )
      return "json";
    return "plaintext";
  }

  /**
   * Smooth camera animation to a new position/target.
   * @param {THREE.Vector3} toPos
   * @param {THREE.Vector3} toTarget
   */
  _animateCamera(toPos, toTarget) {
    const fromPos = this._camera.position.clone();
    const fromTarget = this._controls.target.clone();
    const startTime = performance.now();

    this._camAnim = { fromPos, toPos, fromTarget, toTarget, startTime };
  }

  /** Update camera animation each frame. */
  _updateCameraAnim() {
    if (!this._camAnim) return;
    const { fromPos, toPos, fromTarget, toTarget, startTime } = this._camAnim;
    const t = Math.min(1, (performance.now() - startTime) / CAM_ANIM_MS);
    const e = easeOut(t);

    this._camera.position.set(
      lerp(fromPos.x, toPos.x, e),
      lerp(fromPos.y, toPos.y, e),
      lerp(fromPos.z, toPos.z, e),
    );
    this._controls.target.set(
      lerp(fromTarget.x, toTarget.x, e),
      lerp(fromTarget.y, toTarget.y, e),
      lerp(fromTarget.z, toTarget.z, e),
    );

    if (t >= 1) this._camAnim = null;
  }

  /** Gentle idle rotation for category cubes. */
  _updateIdleRotation() {
    const t = performance.now() * 0.0003;
    this._catMeshes.forEach((mesh, i) => {
      if (this._focusedCat === i) return; // don't spin focused cube
      mesh.rotation.x = Math.sin(t + i * 0.7) * 0.15;
      mesh.rotation.y = t * 0.4 + i * 0.5;
    });
  }

  /**
   * Per-frame animation of file-cube labels, hover/selection scale and
   * emissive glow. Labels appear for the focused category, the hovered cube
   * and the keyboard-selected cube; everything eases for smoothness.
   */
  _updateFileVisuals() {
    const hovered = this._hoveredMesh;
    const selected = this._selectedMesh;

    this._fileMeshes.forEach((mesh) => {
      const ud = mesh.userData;
      const isHot = mesh === hovered || mesh === selected;
      const inFocusedCat =
        this._focusedCat >= 0 && ud.catIndex === this._focusedCat;

      // Label visibility: full when hot, faint when its category is focused
      let labelTarget = 0;
      if (ud.dimmed) labelTarget = 0;
      else if (isHot) labelTarget = 1;
      else if (inFocusedCat) labelTarget = 0.55;
      const lm = ud.label.material;
      lm.opacity += (labelTarget - lm.opacity) * 0.2;

      // Scale + emissive pop on hover/selection
      const scaleTarget = isHot ? 1.6 : 1;
      const cur = mesh.scale.x;
      const next = cur + (scaleTarget - cur) * 0.25;
      mesh.scale.setScalar(next);

      const emTarget = isHot ? 0.85 : 0.2;
      mesh.material.emissiveIntensity +=
        (emTarget - mesh.material.emissiveIntensity) * 0.2;
    });
  }

  /** Main render loop. */
  _loop() {
    this._rafId = requestAnimationFrame(() => this._loop());
    this._updateHover();
    this._updateCameraAnim();
    this._updateIdleRotation();
    this._updateFileVisuals();
    this._controls.update();
    this._renderer.render(this._scene, this._camera);
  }

  _startLoop() {
    if (this._rafId !== null) return;
    this._loop();
  }

  _stopLoop() {
    if (this._rafId === null) return;
    cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }
}
