import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STORAGE_CATEGORIES } from "./StorageAPI.js";
import { CATEGORY_COLORS, CAT_CUBE_SIZE, FILE_CUBE_SIZE, GRID_GAP, FILE_ORBIT_R, CAM_ANIM_MS, LABEL_TRUNCATE_LEN, PREVIEW_DEBOUNCE_MS, PREVIEW_MAX_CHARS, PREVIEW_HIDE_GRACE_MS, LOD_NEAR, LOD_FAR, lerp, easeOut, _fileTypeIcon, _isImageFile, _formatSize } from './Cabinet3D.js';
export const Cabinet3DMixin1 = {
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
  },
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
  },
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
  },
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
  },
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
  },
  _worldToScreen(worldPos) {
    const v = worldPos.clone().project(this._camera);
    const el = this._renderer.domElement;
    return {
      x: ((v.x + 1) / 2) * el.clientWidth,
      y: ((1 - v.y) / 2) * el.clientHeight,
    };
  },
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
  },
  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this._renderer.setSize(w, h);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
  },
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
  },
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
  },
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
  },
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
  },
  _animateCamera(toPos, toTarget) {
    const fromPos = this._camera.position.clone();
    const fromTarget = this._controls.target.clone();
    const startTime = performance.now();

    this._camAnim = { fromPos, toPos, fromTarget, toTarget, startTime };
  },
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
  },
  _updateIdleRotation() {
    const t = performance.now() * 0.0003;
    this._catMeshes.forEach((mesh, i) => {
      if (this._focusedCat === i) return; // don't spin focused cube
      mesh.rotation.x = Math.sin(t + i * 0.7) * 0.15;
      mesh.rotation.y = t * 0.4 + i * 0.5;
    });
  },
  _loop() {
    this._rafId = requestAnimationFrame(() => this._loop());
    this._updateCameraAnim();
    this._updateIdleRotation();
    this._updateHoverAnimation();
    this._updateLabelLOD();
    this._updatePreviewPanelPosition();
    this._controls.update();
    this._renderer.render(this._scene, this._camera);
  },
  _startLoop() {
    if (this._rafId !== null) return;
    this._loop();
  },
  _stopLoop() {
    if (this._rafId === null) return;
    cancelAnimationFrame(this._rafId);
    this._rafId = null;
  },
};
