import StorageAPI from "./StorageAPI.js";
import {
  storageAPI,
  TOAST_DISPLAY_DURATION,
  DEPTH_Z_INDEX,
  DEPTH_ICONS,
  DEPTH_TITLES,
  _extractSymbols,
  _symbolKindIcon,
} from "./TabManager.js";
export const TabManagerMixin6 = {
  toggleFractalView() {
    const wasActive = this.isFractalView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isFractalView = true;
      document.body.classList.add("fractal-active");
      const btn = document.getElementById("btn-fractal-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleCrystalView() {
    const wasActive = this.isCrystalView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isCrystalView = true;
      document.body.classList.add("crystal-active");
      const btn = document.getElementById("btn-crystal-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleMatrixRainView() {
    const wasActive = this.isMatrixRainView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isMatrixRainView = true;
      document.body.classList.add("matrix-rain-active");
      const btn = document.getElementById("btn-matrix-rain-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleOrigamiView() {
    const wasActive = this.isOrigamiView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isOrigamiView = true;
      document.body.classList.add("origami-active");
    }
    this._renderEchoes();
  },
  toggleDataHiveView() {
    const wasActive = this.isDataHiveView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isDataHiveView = true;
      document.body.classList.add("data-hive-active");
    }
    this._renderEchoes();
  },
  toggleGalaxyView() {
    const wasActive = this.isGalaxyView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isGalaxyView = true;
      document.body.classList.add("galaxy-active");
    }
    this._renderEchoes();
  },
  toggleBlackHoleView() {
    const wasActive = this.isBlackHoleView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isBlackHoleView = true;
      document.body.classList.add("black-hole-active");
      const btn = document.getElementById("btn-black-hole-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleRolodexView() {
    const wasActive = this.isRolodexView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isRolodexView = true;
      document.body.classList.add("rolodex-active");
      const btn = document.getElementById("btn-rolodex-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleCylinderView() {
    const wasActive = this.isCylinderView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isCylinderView = true;
      document.body.classList.add("cylinder-active");
      const btn = document.getElementById("btn-cylinder-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleSphereView() {
    const wasActive = this.isSphereView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isSphereView = true;
      document.body.classList.add("sphere-active");
      const btn = document.getElementById("btn-sphere-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleWaveView() {
    const wasActive = this.isWaveView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isWaveView = true;
      document.body.classList.add("wave-active");
      const btn = document.getElementById("btn-wave-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },

  togglePrismSplitView() {
    const wasActive = this.isPrismSplitView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isPrismSplitView = true;
      document.body.classList.add("prism-split-active");
    }
    this._renderEchoes();
  },
  togglePrismView() {
    const wasActive = this.isPrismView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isPrismView = true;
      document.body.classList.add("prism-active");
      const btn = document.getElementById("btn-prism-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleTimeTunnelView() {
    const wasActive = this.isTimeTunnelView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isTimeTunnelView = true;
      document.body.classList.add("time-tunnel-active");
    }
    this._renderEchoes();
  },
  toggleHelixView() {
    const wasActive = this.isHelixView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isHelixView = true;
      document.body.classList.add("helix-active");
      const btn = document.getElementById("btn-helix-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleConstellationView() {
    const wasActive = this.isConstellationView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isConstellationView = true;
      document.body.classList.add("constellation-active");
      const btn = document.getElementById("btn-constellation-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  togglePinboardView() {
    const wasActive = this.isPinboardView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isPinboardView = true;
      document.body.classList.add("pinboard-active");
      const btn = document.getElementById("btn-pinboard-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleVortexView() {
    const wasActive = this.isVortexView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isVortexView = true;
      document.body.classList.add("vortex-active");
      const btn = document.getElementById("btn-vortex-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleStackView() {
    const wasActive = this.isStackView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isStackView = true;
      document.body.classList.add("stack-active");
      const btn = document.getElementById("btn-stack-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleTimelineView() {
    const wasActive = this.isTimelineView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isTimelineView = true;
      document.body.classList.add("timeline-active");
      const btn = document.getElementById("btn-timeline-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleTunnelView() {
    const wasActive = this.isTunnelView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isTunnelView = true;
      document.body.classList.add("tunnel-active");
      const btn = document.getElementById("btn-tunnel-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleGridView() {
    const wasActive = this.isGridView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isGridView = true;
      document.body.classList.add("grid-active");
      const btn = document.getElementById("btn-grid-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleIsometricView() {
    const wasActive = this.isIsometricView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isIsometricView = true;
      document.body.classList.add("isometric-active");
      const btn = document.getElementById("btn-isometric-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleScatteredView() {
    const wasActive = this.isScatteredView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isScatteredView = true;
      document.body.classList.add("scattered-active");
      const btn = document.getElementById("btn-scattered-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleLuminescenceView() {
    const wasActive = this.isLuminescenceView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isLuminescenceView = true;
      document.body.classList.add("luminescence-active");
    }
    this._renderEchoes();
  },
  toggleTheaterView() {
    const wasActive = this.isTheaterView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isTheaterView = true;
      document.body.classList.add("theater-active");
      const btn = document.getElementById("btn-theater-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleTornadoView() {
    const wasActive = this.isTornadoView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isTornadoView = true;
      document.body.classList.add("tornado-active");
      const btn = document.getElementById("btn-tornado-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleTorusView() {
    const wasActive = this.isTorusView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isTorusView = true;
      document.body.classList.add("torus-active");
    }
    this._renderEchoes();
  },
  toggleWaterfallView() {
    const wasActive = this.isWaterfallView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isWaterfallView = true;
      document.body.classList.add("waterfall-active");
      const btn = document.getElementById("btn-waterfall-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleCascadeView() {
    const wasActive = this.isCascadeView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isCascadeView = true;
      document.body.classList.add("cascade-active");
      const btn = document.getElementById("btn-cascade-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleOrbitView() {
    const wasActive = this.isOrbitView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isOrbitView = true;
      document.body.classList.add("orbit-active");
      const btn = document.getElementById("btn-orbit-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  addFile(name, content = "", language = "javascript") {
    const id = this._nextId++;
    const isImage = language === "image";

    let model = null;
    if (!isImage) {
      model = this.monaco.editor.createModel(content, language);
    }

    this.files.push({
      id,
      name,
      model,
      depth: 1,
      isImage,
      language,
      url: isImage ? content : null,
      dirty: false,
      savedContent: isImage ? undefined : content,
    });
    this.workspaceSession?.watchFile?.(
      this.files[this.files.length - 1],
    );
    this._renderTabs();
    this._saveTabsToStorage();
    return id;
  },
};
