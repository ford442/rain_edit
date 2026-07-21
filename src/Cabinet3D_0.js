import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STORAGE_CATEGORIES } from "./StorageAPI.js";
import {
  createGLContext,
  getGLContextInfo,
} from "./rendering/createGLContext.js";
import { CATEGORY_COLORS, CAT_CUBE_SIZE, FILE_CUBE_SIZE, GRID_GAP, FILE_ORBIT_R, CAM_ANIM_MS, LABEL_TRUNCATE_LEN, PREVIEW_DEBOUNCE_MS, PREVIEW_MAX_CHARS, PREVIEW_HIDE_GRACE_MS, LOD_NEAR, LOD_FAR, lerp, easeOut, _fileTypeIcon, _isImageFile, _formatSize } from './Cabinet3D.js';
export const Cabinet3DMixin0 = {
  show() {
    if (this.visible) return;
    this.visible = true;
    this._overlay.style.display = "flex";
    this._renderer.domElement.style.display = "block";
    this._onResize();
    this.renderFrame();
  },
  hide() {
    if (!this.visible) return;
    this.visible = false;
    this._overlay.style.display = "none";
    this._renderer.domElement.style.display = "none";
    this._hidePreview();
  },
  getRendererCanvas() {
    return this._renderer.domElement;
  },
  recordRainTextureUpload(durationMs) {
    const stats = this._rainTextureUploadStats;
    stats.samples += 1;
    stats.totalMs += durationMs;
    stats.maxMs = Math.max(stats.maxMs, durationMs);
    stats.lastMs = durationMs;
  },
  getCompositingDiagnostics() {
    const stats = this._rainTextureUploadStats;
    return {
      context: this._contextInfo,
      mode: "synchronized-cross-context-upload",
      preserveDrawingBuffer: this._preserveDrawingBuffer,
      uploadCountPerFrame: 3,
      samples: stats.samples,
      averageUploadMs: stats.samples ? stats.totalMs / stats.samples : 0,
      maxUploadMs: stats.maxMs,
      lastUploadMs: stats.lastMs,
    };
  },
  renderFrame() {
    if (!this.visible) return;
    this._updateCameraAnim();
    this._updateIdleRotation();
    this._updateHoverAnimation();
    this._updateLabelLOD();
    this._updatePreviewPanelPosition();
    this._controls.update();
    this._renderer.render(this._scene, this._camera);
  },
  getHoverScreenPos() {
    const mesh = this._hoveredFileMesh || this._pinnedFileMesh;
    if (!mesh || !this.visible) return null;
    const wp = new THREE.Vector3();
    mesh.getWorldPosition(wp);
    const s = this._worldToScreen(wp);
    return { x: s.x, y: s.y, r: 58 };
  },
  toggle() {
    this.visible ? this.hide() : this.show();
  },
  _build() {
    this._buildOverlay();
    this._buildScene();
    this._buildCategoryCubes();
    this._buildPreviewPanel();
    this._bindEvents();
  },
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
  },
  _buildScene() {
    const canvas = document.createElement("canvas");
    const context = createGLContext(canvas, {
      attributes: {
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: this._preserveDrawingBuffer,
      },
      webgl1Fallback: false,
      label: "Cabinet3D",
    });
    if (!context) throw new Error("Cabinet3D requires WebGL2.");

    this._contextInfo = getGLContextInfo(context);
    const renderer = new THREE.WebGLRenderer({ canvas, context });
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
  },
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
  },
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
  },
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
  },
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
  },
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
  },
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
  },
  _updatePinButton() {
    const btn = this._previewPanel?.querySelector("#pfp-pin");
    if (!btn) return;
    btn.textContent = this._isPinned ? "📌" : "📍";
    btn.style.opacity = this._isPinned ? "1" : "0.45";
    btn.title = this._isPinned ? "Unpin preview" : "Pin preview";
  },
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
  },
  _updateContentEl(mesh, text, _unused, html = null) {
    if (this._previewTargetMesh !== mesh) return;
    const el = this._previewPanel?.querySelector("#pfp-content");
    if (!el) return;
    if (html) {
      el.innerHTML = html;
    } else {
      el.textContent = text ?? "";
    }
  },
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
  },
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
  },
};
