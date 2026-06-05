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

// Preview panel config
const LABEL_TRUNCATE_LEN = 16;
const PREVIEW_DEBOUNCE_MS = 500;
const PREVIEW_MAX_CHARS = 400;
const PREVIEW_HIDE_GRACE_MS = 220; // ms to wait before hiding (lets mouse reach panel)

// Label LOD fade distances (world units)
const LOD_NEAR = 2.5; // full opacity at this distance or closer
const LOD_FAR = 8.0; // invisible at this distance or farther

// ─── Utility helpers ─────────────────────────────────────────────────────────

/** Linear interpolation */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Ease-out cubic */
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

/** Pick an icon character for a file based on its name and category. */
function _fileTypeIcon(name, catName) {
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
function _isImageFile(name, catName) {
  if (catName === "images") return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(name || "");
}

/** Human-readable file size string. */
function _formatSize(bytes) {
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
  show() {
    if (this.visible) return;
    this.visible = true;
    this._overlay.style.display = "flex";
    this._renderer.domElement.style.display = "block";
    this._onResize();
    this._startLoop();
  }

  /** Hide the cabinet overlay. */
  hide() {
    if (!this.visible) return;
    this.visible = false;
    this._overlay.style.display = "none";
    this._renderer.domElement.style.display = "none";
    this._stopLoop();
    this._hidePreview();
  }

  /** Expose the Three.js renderer canvas so the rain shader can read it as a texture. */
  getRendererCanvas() {
    return this._renderer.domElement;
  }

  /**
   * Return the screen-space position (CSS px) of the currently hovered or pinned file
   * cube, or null when nothing is active.  Used by the main animate loop for continuous
   * frame-driven rain clearing — mousemove events alone stop firing when the cursor is
   * stationary, so this lets the clearing persist.
   * @returns {{ x: number, y: number, r: number } | null}
   */
  getHoverScreenPos() {
    const mesh = this._hoveredFileMesh || this._pinnedFileMesh;
    if (!mesh || !this.visible) return null;
    const wp = new THREE.Vector3();
    mesh.getWorldPosition(wp);
    const s = this._worldToScreen(wp);
    return { x: s.x, y: s.y, r: 58 };
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
    this._bindEvents();
  }

  /** Create the full-screen transparent HTML overlay (controls only, no background). */
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
      "pointer-events: none",
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
      "pointer-events: auto",
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
      "Click a category cube to explore · Click a file cube to open it";
    overlay.appendChild(hint);

    this._hint = hint;

    document.body.appendChild(overlay);
    this._overlay = overlay;
  }

  /** Initialise the Three.js renderer, scene and camera. */
  _buildScene() {
    // preserveDrawingBuffer lets the rain shader read pixels cross-context each frame
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    // Dark background so rain has something opaque to refract
    renderer.setClearColor(0x020a14, 0.92);
    // Canvas sits between editor (z=5) and rain-front (z=10) so rain renders over it
    renderer.domElement.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;z-index:8;display:none;";
    document.body.appendChild(renderer.domElement);
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
   * Build a small canvas-texture sprite label for a file cube.
   * Shown at reduced opacity by default; boosts to full on hover.
   * @param {string} filename
   * @returns {THREE.Sprite}
   */
  _makeFileLabelSprite(filename) {
    const label =
      filename.length > LABEL_TRUNCATE_LEN
        ? filename.slice(0, LABEL_TRUNCATE_LEN - 1) + "…"
        : filename;

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 48;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 256, 48);
    ctx.fillStyle = "#90b8d0";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 128, 24);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(0.62, 0.115, 1);
    spr.position.set(0, FILE_CUBE_SIZE / 2 + 0.1, 0);
    return spr;
  }

  /** Build the HTML file-preview panel and attach it to the document body. */
  _buildPreviewPanel() {
    const panel = document.createElement("div");
    panel.id = "cabinet-file-preview";
    panel.style.cssText = [
      "position: fixed",
      "z-index: 60",
      "display: none",
      "width: 288px",
      "max-height: 380px",
      "background: rgba(2,10,22,0.93)",
      "border: 1px solid rgba(0,229,255,0.22)",
      "border-radius: 8px",
      "overflow: hidden",
      "font-family: 'JetBrains Mono', monospace",
      "font-size: 12px",
      "color: #c0d0e0",
      "pointer-events: auto",
      "box-shadow: 0 4px 32px rgba(0,0,0,0.7), 0 0 20px rgba(0,229,255,0.07)",
      "backdrop-filter: blur(10px)",
    ].join(";");

    // Cancel pending hide when mouse enters panel
    panel.addEventListener("mouseenter", () =>
      clearTimeout(this._previewHideTimer),
    );
    // Restart hide grace period when mouse leaves panel to canvas
    panel.addEventListener("mouseleave", () => {
      if (!this._isPinned) {
        clearTimeout(this._previewHideTimer);
        this._previewHideTimer = setTimeout(
          () => this._hidePreview(),
          PREVIEW_HIDE_GRACE_MS,
        );
      }
    });

    // ── Header ──────────────────────────────────────────────────────────────
    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;align-items:center;gap:6px;padding:9px 10px 7px;" +
      "border-bottom:1px solid rgba(0,229,255,0.1);";

    const icon = document.createElement("span");
    icon.id = "pfp-icon";
    icon.style.cssText = "font-size:15px;flex-shrink:0;";

    const name = document.createElement("span");
    name.id = "pfp-name";
    name.style.cssText =
      "font-weight:bold;color:#dff0ff;overflow:hidden;" +
      "text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:11px;";

    const badge = document.createElement("span");
    badge.id = "pfp-badge";
    badge.style.cssText =
      "font-size:9px;color:#00aaff;flex-shrink:0;display:none;" +
      "border:1px solid rgba(0,170,255,0.4);border-radius:3px;padding:1px 4px;";

    // 📌 Pin button — keeps preview open while orbiting
    const pinBtn = document.createElement("button");
    pinBtn.id = "pfp-pin";
    pinBtn.title = "Pin preview";
    pinBtn.textContent = "📍";
    pinBtn.style.cssText =
      "background:none;border:none;cursor:pointer;font-size:13px;" +
      "padding:0 2px;opacity:0.45;flex-shrink:0;line-height:1;";
    pinBtn.addEventListener("click", () => {
      this._isPinned = !this._isPinned;
      if (this._isPinned) {
        this._pinnedFileMesh = this._previewTargetMesh;
      } else {
        this._pinnedFileMesh = null;
      }
      this._updatePinButton();
    });

    // ✕ Close button
    const closeBtn = document.createElement("button");
    closeBtn.title = "Close preview";
    closeBtn.textContent = "✕";
    closeBtn.style.cssText =
      "background:none;border:none;cursor:pointer;font-size:13px;" +
      "color:rgba(192,208,224,0.5);padding:0 2px;flex-shrink:0;line-height:1;";
    closeBtn.addEventListener("click", () => this._hidePreview());

    header.append(icon, name, badge, pinBtn, closeBtn);

    // ── Meta ────────────────────────────────────────────────────────────────
    const meta = document.createElement("div");
    meta.id = "pfp-meta";
    meta.style.cssText =
      "padding:4px 12px 5px;color:rgba(192,208,224,0.55);font-size:9px;";

    // ── Image thumbnail (images category) ───────────────────────────────────
    const thumb = document.createElement("img");
    thumb.id = "pfp-thumb";
    thumb.style.cssText =
      "width:100%;max-height:150px;object-fit:cover;display:none;" +
      "border-top:1px solid rgba(0,229,255,0.07);background:#000;";

    // ── Content / code snippet ───────────────────────────────────────────────
    const content = document.createElement("pre");
    content.id = "pfp-content";
    content.style.cssText = [
      "margin:0",
      "padding:8px 12px",
      "max-height:155px",
      "overflow:hidden",
      "color:rgba(180,220,240,0.82)",
      "font-size:9px",
      "line-height:1.45",
      "background:rgba(0,0,0,0.28)",
      "border-top:1px solid rgba(0,229,255,0.07)",
      "white-space:pre-wrap",
      "word-break:break-all",
      "tab-size:2",
    ].join(";");

    // ── Actions ─────────────────────────────────────────────────────────────
    const actions = document.createElement("div");
    actions.style.cssText =
      "display:flex;gap:6px;padding:7px 12px;" +
      "border-top:1px solid rgba(0,229,255,0.08);";

    const btnStyle = (accent) =>
      `background:rgba(${accent},0.1);border:1px solid rgba(${accent},0.3);` +
      `color:rgb(${accent});font-family:inherit;font-size:9px;` +
      `padding:4px 10px;border-radius:4px;cursor:pointer;flex:1;`;

    const openBtn = document.createElement("button");
    openBtn.id = "pfp-open";
    openBtn.textContent = "Open in Editor";
    openBtn.style.cssText = btnStyle("0,229,255");
    openBtn.addEventListener("click", () => {
      if (this._previewTargetMesh) {
        const ud = this._previewTargetMesh.userData;
        this._onFileClick(ud.catIndex, ud.fileData);
        this._hidePreview();
      }
    });

    const copyBtn = document.createElement("button");
    copyBtn.id = "pfp-copy";
    copyBtn.textContent = "Copy Path";
    copyBtn.style.cssText = btnStyle("192,208,224");
    copyBtn.addEventListener("click", () => {
      if (!this._previewTargetMesh) return;
      const { fileData } = this._previewTargetMesh.userData;
      const path = fileData.vpsPath || fileData.id || fileData.name || "";
      navigator.clipboard.writeText(path).catch(() => {});
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = "Copy Path";
      }, 1500);
    });

    actions.append(openBtn, copyBtn);
    panel.append(header, meta, thumb, content, actions);
    document.body.appendChild(panel);
    this._previewPanel = panel;
  }

  /** Populate and show the preview panel for a file mesh (metadata only; content lazy). */
  _showPreview(mesh) {
    clearTimeout(this._previewHideTimer);
    this._previewTargetMesh = mesh;
    const { fileData, catName } = mesh.userData;
    const filename = fileData.filename || fileData.name || "unknown";

    this._previewPanel.querySelector("#pfp-icon").textContent = _fileTypeIcon(
      filename,
      catName,
    );
    this._previewPanel.querySelector("#pfp-name").textContent = filename;

    const badge = this._previewPanel.querySelector("#pfp-badge");
    if (fileData.isRemote) {
      badge.textContent = "☁ Remote";
      badge.style.display = "inline";
    } else {
      badge.style.display = "none";
    }

    const parts = [catName];
    if (fileData.date) parts.push(new Date(fileData.date).toLocaleDateString());
    if (fileData.size) parts.push(_formatSize(fileData.size));
    this._previewPanel.querySelector("#pfp-meta").textContent =
      parts.join(" · ");

    const cacheKey = fileData.vpsPath || fileData.id || filename;
    const thumb = this._previewPanel.querySelector("#pfp-thumb");
    const contentEl = this._previewPanel.querySelector("#pfp-content");

    if (_isImageFile(filename, catName)) {
      // Show thumbnail; skip text content area
      contentEl.style.display = "none";
      thumb.style.display = "block";
      thumb.src = fileData.vpsPath
        ? this.storageAPI.getVPSFileURL(fileData.vpsPath)
        : "";
      thumb.alt = filename;
    } else {
      thumb.style.display = "none";
      contentEl.style.display = "block";
      const cachedHtml = this._previewCacheHtml.get(cacheKey);
      const cached = this._previewCache.get(cacheKey);
      if (cachedHtml) {
        contentEl.innerHTML = cachedHtml;
      } else if (cached && cached !== "Loading…") {
        contentEl.textContent = cached;
      } else {
        contentEl.textContent = cached ?? "…";
      }
    }

    this._updatePinButton();
    this._previewPanel.style.display = "block";
    this._updatePreviewPanelPosition();
  }

  /** Hide and reset the preview panel, cancelling any pending fetch or hide timer. */
  _hidePreview() {
    clearTimeout(this._previewFetchTimer);
    this._previewFetchTimer = null;
    clearTimeout(this._previewHideTimer);
    this._previewHideTimer = null;
    if (this._previewPanel) this._previewPanel.style.display = "none";
    this._previewTargetMesh = null;
    this._pinnedFileMesh = null;
    this._isPinned = false;
    this._updatePinButton();
  }

  /** Sync the 📌 pin button visual to `_isPinned` state. */
  _updatePinButton() {
    const btn = this._previewPanel?.querySelector("#pfp-pin");
    if (!btn) return;
    btn.textContent = this._isPinned ? "📌" : "📍";
    btn.style.opacity = this._isPinned ? "1" : "0.45";
    btn.title = this._isPinned ? "Unpin preview" : "Pin preview";
  }

  /**
   * Fetch a content snippet for a file cube (called after debounce).
   * Text and highlighted HTML are cached independently; repeated hovers are instant.
   */
  async _fetchPreviewContent(mesh) {
    const { fileData, catName } = mesh.userData;
    const filename = fileData.filename || fileData.name || "unknown";
    const cacheKey = fileData.vpsPath || fileData.id || filename;

    // Images are handled with a thumbnail — no text to fetch
    if (_isImageFile(filename, catName)) {
      this._previewCache.set(cacheKey, "«image»");
      return;
    }

    const existing = this._previewCache.get(cacheKey);
    if (existing && existing !== "Loading…") return;

    // Sentinel to prevent duplicate in-flight fetches
    this._previewCache.set(cacheKey, "Loading…");
    this._updateContentEl(mesh, "Loading…", false);

    try {
      let text;
      if (fileData.isRemote && fileData.vpsPath) {
        text = await this.storageAPI.getVPSFile(fileData.vpsPath);
      } else {
        const id = fileData.id || fileData._id || fileData.name;
        const result = await this.storageAPI.getFileContent(id, catName);
        text = result?.content ?? null;
      }

      const snippet =
        text == null
          ? "(preview unavailable)"
          : text.length > PREVIEW_MAX_CHARS
            ? text.slice(0, PREVIEW_MAX_CHARS) + "…"
            : text;

      this._previewCache.set(cacheKey, snippet);

      // Syntax highlight via Monaco if available
      if (this._monacoApi && snippet !== "(preview unavailable)") {
        const rawLang = this._detectLanguage(catName, fileData);
        // Map langs Monaco doesn't know to plaintext
        const lang = ["wgsl", "image", "brainfuck"].includes(rawLang)
          ? "plaintext"
          : rawLang;
        try {
          const html = await this._monacoApi.editor.colorize(snippet, lang, {
            tabSize: 2,
          });
          this._previewCacheHtml.set(cacheKey, html);
        } catch {
          /* fall through to plain text */
        }
      }
    } catch {
      this._previewCache.set(cacheKey, "(preview unavailable)");
    }

    // Push result to panel if still the active target
    if (
      this._previewTargetMesh === mesh &&
      this._previewPanel?.style.display !== "none"
    ) {
      const html = this._previewCacheHtml.get(cacheKey);
      const text = this._previewCache.get(cacheKey);
      this._updateContentEl(mesh, text, false, html);
    }
  }

  /** Write text or HTML into the content <pre> element. */
  _updateContentEl(mesh, text, _unused, html = null) {
    if (this._previewTargetMesh !== mesh) return;
    const el = this._previewPanel?.querySelector("#pfp-content");
    if (!el) return;
    if (html) {
      el.innerHTML = html;
    } else {
      el.textContent = text ?? "";
    }
  }

  /** Reposition the preview panel to follow the hovered file cube each frame. */
  _updatePreviewPanelPosition() {
    if (
      !this._hoveredFileMesh ||
      !this._previewPanel ||
      this._previewPanel.style.display === "none"
    )
      return;

    const worldPos = new THREE.Vector3();
    this._hoveredFileMesh.getWorldPosition(worldPos);
    const s = this._worldToScreen(worldPos);
    const pw = 280;
    const ph = this._previewPanel.offsetHeight || 190;
    let left = s.x + 26;
    let top = s.y - ph / 2;
    if (left + pw > window.innerWidth - 12) left = s.x - pw - 26;
    top = Math.max(12, Math.min(window.innerHeight - ph - 12, top));
    this._previewPanel.style.left = left + "px";
    this._previewPanel.style.top = top + "px";
  }

  /**
   * Fade label sprite opacity based on camera-to-cube world distance (LOD).
   * Throttled to every 8 frames; hover-animated meshes are skipped.
   */
  _updateLabelLOD() {
    this._lodFrameCounter = (this._lodFrameCounter + 1) % 8;
    if (this._lodFrameCounter !== 0) return;

    const camPos = this._camera.position;
    const wp = new THREE.Vector3();
    const range = LOD_FAR - LOD_NEAR;

    for (const mesh of this._fileMeshes) {
      const sprite = mesh.userData.labelSprite;
      if (!sprite) continue;
      // Hover animation owns these — don't fight it
      if (mesh === this._hoveredFileMesh || mesh === this._prevHoveredFileMesh)
        continue;

      mesh.getWorldPosition(wp);
      const dist = camPos.distanceTo(wp);
      let target;
      if (dist <= LOD_NEAR) {
        target = 0.55;
      } else if (dist >= LOD_FAR) {
        target = 0;
      } else {
        target = 0.55 * (1 - (dist - LOD_NEAR) / range);
      }
      sprite.material.opacity = lerp(sprite.material.opacity, target, 0.2);
    }
  }

  /**
   * Lerp file cube scale and emissive intensity toward hover/rest targets.
   * Only touches the actively hovered cube and the previously hovered one.
   */
  _updateHoverAnimation() {
    const T = 0.14;
    const HOVER_SCALE = 1.5;
    const REST_SCALE = 1.0;
    const HOVER_EMISSIVE = 0.82;
    const REST_EMISSIVE = 0.2;
    const HOVER_LABEL_A = 1.0;
    const REST_LABEL_A = 0.55;

    if (this._hoveredFileMesh) {
      const m = this._hoveredFileMesh;
      m.scale.x = lerp(m.scale.x, HOVER_SCALE, T);
      m.scale.y = lerp(m.scale.y, HOVER_SCALE, T);
      m.scale.z = lerp(m.scale.z, HOVER_SCALE, T);
      if (m.material)
        m.material.emissiveIntensity = lerp(
          m.material.emissiveIntensity,
          HOVER_EMISSIVE,
          T,
        );
      if (m.userData.labelSprite)
        m.userData.labelSprite.material.opacity = lerp(
          m.userData.labelSprite.material.opacity,
          HOVER_LABEL_A,
          T,
        );
    }

    if (
      this._prevHoveredFileMesh &&
      this._prevHoveredFileMesh !== this._hoveredFileMesh
    ) {
      const m = this._prevHoveredFileMesh;
      m.scale.x = lerp(m.scale.x, REST_SCALE, T);
      m.scale.y = lerp(m.scale.y, REST_SCALE, T);
      m.scale.z = lerp(m.scale.z, REST_SCALE, T);
      if (m.material)
        m.material.emissiveIntensity = lerp(
          m.material.emissiveIntensity,
          REST_EMISSIVE,
          T,
        );
      if (m.userData.labelSprite)
        m.userData.labelSprite.material.opacity = lerp(
          m.userData.labelSprite.material.opacity,
          REST_LABEL_A,
          T,
        );
      if (Math.abs(m.scale.x - REST_SCALE) < 0.005)
        this._prevHoveredFileMesh = null;
    }
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
      const filename = fileData.filename || fileData.name || `${catName}-${i}`;
      mesh.userData = {
        type: "file",
        catIndex,
        fileData,
        catName,
        isRemote: fileData.isRemote || false,
        filename,
      };
      catMesh.add(mesh); // parented to the category cube
      this._fileMeshes.push(mesh);

      // Filename label billboard — always visible, boosts opacity on hover
      const labelSprite = this._makeFileLabelSprite(filename);
      mesh.userData.labelSprite = labelSprite;
      mesh.add(labelSprite);

      // Add visual badge for remote files
      if (fileData.isRemote) {
        this._addRemoteFileBadge(mesh);
      }
    }
  }

  /** Bind window events. */
  _bindEvents() {
    window.addEventListener("resize", () => this._onResize());
    // Canvas is the click target now (overlay has pointer-events:none)
    this._renderer.domElement.addEventListener("click", (e) =>
      this._onClick(e),
    );
    this._renderer.domElement.addEventListener("mousemove", (e) =>
      this._onMouseMove(e),
    );
    // External cache invalidation (e.g. after a VPS file save)
    window.addEventListener("cabinet-cache-invalidate", (e) => {
      const path = e.detail?.path;
      if (path) {
        this._previewCache.delete(path);
        this._previewCacheHtml.delete(path);
      }
    });
  }

  /**
   * Project a Three.js world position to CSS pixel coordinates on screen.
   * @param {THREE.Vector3} worldPos
   * @returns {{ x: number, y: number }}
   */
  _worldToScreen(worldPos) {
    const v = worldPos.clone().project(this._camera);
    const el = this._renderer.domElement;
    return {
      x: ((v.x + 1) / 2) * el.clientWidth,
      y: ((1 - v.y) / 2) * el.clientHeight,
    };
  }

  /**
   * Handle mousemove: raycast to find hovered cube and dispatch rain-clear event
   * so the main loop can wipe droplets off the glass in front of the hovered item.
   */
  _onMouseMove(e) {
    const rect = this._renderer.domElement.getBoundingClientRect();
    this._hoverMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._hoverMouse.y = ((e.clientY - rect.top) / rect.height) * -2 + 1;

    this._raycaster.setFromCamera(this._hoverMouse, this._camera);
    const hits = this._raycaster.intersectObjects(this._scene.children, true);

    let hitMesh = null;
    for (const h of hits) {
      const ud = h.object.userData;
      if (ud.type === "category" || ud.type === "file") {
        hitMesh = h.object;
        break;
      }
    }

    if (hitMesh !== this._hoveredMesh) {
      this._hoveredMesh = hitMesh;
    }

    // Track file hover separately for preview + animation
    const hitFileMesh = hitMesh?.userData.type === "file" ? hitMesh : null;
    if (hitFileMesh !== this._hoveredFileMesh) {
      this._prevHoveredFileMesh = this._hoveredFileMesh;
      this._hoveredFileMesh = hitFileMesh;

      if (hitFileMesh) {
        // Moving to a different file overrides any pin
        if (this._isPinned && this._pinnedFileMesh !== hitFileMesh) {
          this._isPinned = false;
          this._pinnedFileMesh = null;
        }
        clearTimeout(this._previewHideTimer);
        this._showPreview(hitFileMesh);
        // Debounce the network fetch so fast mouse sweeps don't trigger requests
        clearTimeout(this._previewFetchTimer);
        const key =
          hitFileMesh.userData.fileData.vpsPath ||
          hitFileMesh.userData.fileData.id ||
          hitFileMesh.userData.filename;
        const cached = this._previewCache.get(key);
        if (!cached || cached === "Loading…") {
          this._previewFetchTimer = setTimeout(
            () => this._fetchPreviewContent(hitFileMesh),
            PREVIEW_DEBOUNCE_MS,
          );
        }
      } else if (!this._isPinned) {
        // Grace period: allow mouse to slide from cube to panel without hiding
        clearTimeout(this._previewHideTimer);
        this._previewHideTimer = setTimeout(
          () => this._hidePreview(),
          PREVIEW_HIDE_GRACE_MS,
        );
      }
    }

    if (hitMesh) {
      // Get the world-space center of the hit object (accounting for parent transforms)
      const worldPos = new THREE.Vector3();
      hitMesh.getWorldPosition(worldPos);
      const screen = this._worldToScreen(worldPos);
      const isCategory = hitMesh.userData.type === "category";

      window.dispatchEvent(
        new CustomEvent("cabinet-rain-clear", {
          detail: {
            x: screen.x,
            y: screen.y,
            r: isCategory ? 110 : 60,
            type: hitMesh.userData.type,
          },
        }),
      );
    }
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
        // Dispatch a large rain splash at the clicked cube's screen position
        const worldPos = new THREE.Vector3();
        hit.object.getWorldPosition(worldPos);
        const screen = this._worldToScreen(worldPos);
        window.dispatchEvent(
          new CustomEvent("cabinet-rain-splash", {
            detail: { x: screen.x, y: screen.y, r: 160 },
          }),
        );
        this._onCategoryClick(ud.catIndex, ud.catName);
        return;
      }
      if (ud.type === "file") {
        // Dispatch a medium rain splash at the clicked file cube's screen position
        const worldPos = new THREE.Vector3();
        hit.object.getWorldPosition(worldPos);
        const screen = this._worldToScreen(worldPos);
        window.dispatchEvent(
          new CustomEvent("cabinet-rain-splash", {
            detail: { x: screen.x, y: screen.y, r: 90 },
          }),
        );
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
    // Invalidate cached preview so next hover reflects any edits
    const filename = fileData.filename || fileData.name || "";
    const cacheKey = fileData.vpsPath || fileData.id || filename;
    this._previewCache.delete(cacheKey);
    this._previewCacheHtml.delete(cacheKey);

    const catName = STORAGE_CATEGORIES[catIndex];
    const id = fileData.id || fileData._id || fileData.name || "unknown";

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

  /** Main render loop. */
  _loop() {
    this._rafId = requestAnimationFrame(() => this._loop());
    this._updateCameraAnim();
    this._updateIdleRotation();
    this._updateHoverAnimation();
    this._updateLabelLOD();
    this._updatePreviewPanelPosition();
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
