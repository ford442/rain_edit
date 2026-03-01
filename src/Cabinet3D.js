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

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STORAGE_CATEGORIES } from './StorageAPI.js';

// ─── Visual constants ────────────────────────────────────────────────────────

/** Colour tint for each category slot (cycles when more than palette length). */
const CATEGORY_COLORS = [
  0x00aaff, // songs   — blue
  0x00ffaa, // patterns — teal
  0xff6600, // banks    — orange
  0xffaa00, // samples  — amber
  0xaa00ff, // shaders  — purple
  0x00ff66, // music    — green
];

const CAT_CUBE_SIZE  = 1.4;   // side-length of each category cube
const FILE_CUBE_SIZE = 0.25;  // side-length of each file cube
const GRID_GAP       = 0.35;  // gap between category cubes in the Rubik's grid
const FILE_ORBIT_R   = 1.0;   // radius of the file-cube shell around its parent

// Camera animation duration in ms
const CAM_ANIM_MS = 800;

// ─── Utility helpers ─────────────────────────────────────────────────────────

/** Linear interpolation */
function lerp(a, b, t) { return a + (b - a) * t; }

/** Ease-out cubic */
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// ─── Main class ──────────────────────────────────────────────────────────────

export class Cabinet3D {
  /**
   * @param {import('./StorageAPI.js').StorageAPI} storageAPI
   * @param {import('./TabManager.js').TabManager}  tabManager
   */
  constructor(storageAPI, tabManager) {
    this.storageAPI  = storageAPI;
    this.tabManager  = tabManager;
    this.visible     = false;

    // Overlay DOM element
    this._overlay = null;
    // Three.js core
    this._renderer = null;
    this._scene    = null;
    this._camera   = null;
    this._controls = null;
    this._raycaster = new THREE.Raycaster();
    this._mouse     = new THREE.Vector2();

    // Scene objects
    this._catMeshes  = [];   // { mesh, catIndex, catName }
    this._fileMeshes = [];   // { mesh, catIndex, fileData }

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
    this._overlay.style.display = 'flex';
    this._onResize();
    this._startLoop();
  }

  /** Hide the cabinet overlay. */
  hide() {
    if (!this.visible) return;
    this.visible = false;
    this._overlay.style.display = 'none';
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
    this._bindEvents();
  }

  /** Create the full-screen transparent HTML overlay. */
  _buildOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'cabinet-overlay';
    overlay.style.cssText = [
      'position: fixed',
      'inset: 0',
      'display: none',
      'align-items: center',
      'justify-content: center',
      'z-index: 50',
      'background: rgba(0,0,0,0.75)',
      'backdrop-filter: blur(4px)',
    ].join(';');

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕  Close Cabinet';
    closeBtn.style.cssText = [
      'position: absolute',
      'top: 16px',
      'right: 20px',
      'background: rgba(255,255,255,0.08)',
      'border: 1px solid rgba(255,255,255,0.18)',
      'color: #c0d0e0',
      'font-family: inherit',
      'font-size: 13px',
      'padding: 6px 14px',
      'border-radius: 6px',
      'cursor: pointer',
      'z-index: 51',
    ].join(';');
    closeBtn.addEventListener('click', () => this.hide());
    overlay.appendChild(closeBtn);

    // Status / hint label
    const hint = document.createElement('div');
    hint.id = 'cabinet-hint';
    hint.style.cssText = [
      'position: absolute',
      'bottom: 20px',
      'left: 0',
      'right: 0',
      'text-align: center',
      'color: rgba(192,208,224,0.7)',
      'font-size: 12px',
      'pointer-events: none',
    ].join(';');
    hint.textContent = 'Click a category cube to explore · Click a file cube to open it';
    overlay.appendChild(hint);

    this._hint = hint;

    document.body.appendChild(overlay);
    this._overlay = overlay;
  }

  /** Initialise the Three.js renderer, scene and camera. */
  _buildScene() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
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
    const n    = STORAGE_CATEGORIES.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const step = CAT_CUBE_SIZE + GRID_GAP;

    const offsetX = ((cols - 1) * step) / 2;
    const offsetY = ((rows - 1) * step) / 2;

    STORAGE_CATEGORIES.forEach((name, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const geo  = new THREE.BoxGeometry(CAT_CUBE_SIZE, CAT_CUBE_SIZE, CAT_CUBE_SIZE);
      const mat  = new THREE.MeshStandardMaterial({
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        transparent: true,
        opacity: 0.85,
        roughness: 0.4,
        metalness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(col * step - offsetX, -(row * step - offsetY), 0);
      mesh.userData = { type: 'category', catIndex: i, catName: name };
      this._scene.add(mesh);
      this._catMeshes.push(mesh);

      // Wireframe outline
      const wGeo  = new THREE.EdgesGeometry(geo);
      const wMat  = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
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
    const canvas  = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 64;
    const ctx     = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#c0d0e0';
    ctx.font      = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(1.2, 0.3, 1);
    return spr;
  }

  /**
   * Populate file cubes around a category cube after the API responds.
   * @param {number} catIndex
   * @param {Array}  files
   */
  _buildFileCubes(catIndex, files) {
    if (this._loadedCats.has(catIndex)) return;
    this._loadedCats.add(catIndex);

    const catMesh  = this._catMeshes[catIndex];
    const maxShown = Math.min(files.length, 32); // cap at 32 to keep geometry count manageable; remaining files are not lost — re-fetching the category always returns the full list

    const geo = new THREE.BoxGeometry(FILE_CUBE_SIZE, FILE_CUBE_SIZE, FILE_CUBE_SIZE);

    for (let i = 0; i < maxShown; i++) {
      const phi   = Math.acos(1 - (2 * (i + 0.5)) / maxShown); // Fibonacci sphere
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = FILE_ORBIT_R * Math.sin(phi) * Math.cos(theta);
      const y = FILE_ORBIT_R * Math.sin(phi) * Math.sin(theta);
      const z = FILE_ORBIT_R * Math.cos(phi);

      const mat  = new THREE.MeshStandardMaterial({
        color: CATEGORY_COLORS[catIndex % CATEGORY_COLORS.length],
        transparent: true,
        opacity: 0.9,
        roughness: 0.6,
        emissive: CATEGORY_COLORS[catIndex % CATEGORY_COLORS.length],
        emissiveIntensity: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.userData = { type: 'file', catIndex, fileData: files[i] };
      catMesh.add(mesh); // parented to the category cube
      this._fileMeshes.push(mesh);
    }
  }

  /** Bind window events. */
  _bindEvents() {
    window.addEventListener('resize', () => this._onResize());
    this._overlay.addEventListener('click', (e) => this._onClick(e));
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
    this._mouse.x = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
    this._mouse.y = ((e.clientY - rect.top)  / rect.height) * -2 + 1;

    this._raycaster.setFromCamera(this._mouse, this._camera);
    const intersects = this._raycaster.intersectObjects(this._scene.children, true);

    for (const hit of intersects) {
      const ud = hit.object.userData;
      if (ud.type === 'category') {
        this._onCategoryClick(ud.catIndex, ud.catName);
        return;
      }
      if (ud.type === 'file') {
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
      this._animateCamera(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, 0));
      this._hint.textContent = 'Click a category cube to explore · Click a file cube to open it';
      return;
    }

    this._focusedCat = catIndex;
    const target = this._catMeshes[catIndex].position.clone();
    const camPos  = target.clone().add(new THREE.Vector3(0, 0, 4));
    this._animateCamera(camPos, target);
    this._hint.textContent = `Loading ${catName}…`;

    // Lazy-load files for this category
    if (!this._loadedCats.has(catIndex)) {
      this.storageAPI
        .fetchCategory(catName)
        .then((files) => {
          const list = Array.isArray(files) ? files : (files.items || files.data || []);
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
   * @param {number} catIndex
   * @param {object} fileData - Metadata object from the API.
   */
  _onFileClick(catIndex, fileData) {
    const catName = STORAGE_CATEGORIES[catIndex];
    const id      = fileData.id || fileData._id || fileData.name || 'unknown';
    this._hint.textContent = `Fetching ${id}…`;

    this.storageAPI
      .fetchFileContent(id, catName)
      .then((data) => {
        const content  = data.code || data.content || data.text || JSON.stringify(data, null, 2);
        const filename = data.filename || data.name || `${catName}-${id}`;
        const language = this._detectLanguage(catName, data);
        this.tabManager.addFile(filename, content, language);
        const newId = this.tabManager.files.length > 0
          ? this.tabManager.files[this.tabManager.files.length - 1].id
          : null;
        if (newId !== null) this.tabManager.setActive(newId);
        this.hide();
      })
      .catch(() => {
        this._hint.textContent = `Could not fetch file (check backend URL)`;
      });
  }

  /**
   * Infer a Monaco language identifier from the category or file data.
   * @param {string} catName
   * @param {object} data
   * @returns {string}
   */
  _detectLanguage(catName, data) {
    if (catName === 'shaders') return 'glsl';
    if (data.language) return data.language;
    const name = (data.filename || data.name || '').toLowerCase();
    if (name.endsWith('.js'))   return 'javascript';
    if (name.endsWith('.ts'))   return 'typescript';
    if (name.endsWith('.json')) return 'json';
    if (name.endsWith('.py'))   return 'python';
    if (name.endsWith('.glsl') || name.endsWith('.frag') || name.endsWith('.vert')) return 'glsl';
    if (catName === 'songs' || catName === 'patterns' || catName === 'banks' || catName === 'music') return 'json';
    return 'plaintext';
  }

  /**
   * Smooth camera animation to a new position/target.
   * @param {THREE.Vector3} toPos
   * @param {THREE.Vector3} toTarget
   */
  _animateCamera(toPos, toTarget) {
    const fromPos    = this._camera.position.clone();
    const fromTarget = this._controls.target.clone();
    const startTime  = performance.now();

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
