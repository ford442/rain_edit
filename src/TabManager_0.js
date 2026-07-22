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
export const TabManagerMixin0 = {

  _deactivateAllViews() {
    this.isFloatingNexusView = false;

    // Clear inline styles that could freeze layouts
    const echoes = document.querySelectorAll('.echo-document');
    echoes.forEach(doc => {
      doc.style.transform = '';
      doc.style.boxShadow = '';
      doc.style.borderColor = '';
    });

    this.isCrystalView = false;
    this.isWaterfallView = false;
    this.isCascadeView = false;
    this.isOrbitView = false;
    this.isScatteredView = false;
    this.isIsometricView = false;
    this.isStackView = false;
    this.isTimelineView = false;
    this.isTunnelView = false;
    this.isGridView = false;
    this.isHelixView = false;
    this.isMeteorView = false;
    this.isTimeTunnelView = false;
    this.isPinboardView = false;
    this.isVortexView = false;
    this.isConstellationView = false;
    this.isPrismView = false;
    this.isPrismSplitView = false;
    this.isCoverflowView = false;
    this.isRibbonView = false;
    this.isWaveView = false;
    this.isSphereView = false;
    this.isBlackHoleView = false;
    this.isRolodexView = false;
    this.isCylinderView = false;
    this.isGalaxyView = false;
    this.isOrigamiView = false;
    this.isDataHiveView = false;
    this.isFractalView = false;
    this.isSolarSystemView = false;
    this.isNeonSynthView = false;
    this.isTesseractView = false;
    this.isBlueprint3dView = false;
    this.isCyberCortexView = false;
    this.isQuantumSuperpositionView = false;
    this.isOutlineView = false;
    this.isDnaHelixView = false;
    this.isAccordionView = false;
    this.isInfinityMirrorView = false;
    this.isChronoRingView = false;
    this.isArchwayView = false;
    this.isCityscapeView = false;
    this.isHouseOfCardsView = false;
    this.isKaleidoscopeView = false;
    this.isBookshelfView = false;
    this.isCarouselView = false;
    this.isCycloneView = false;
    this.isMobiusView = false;
    this.isAstrolabeView = false;
    this.isDominoesView = false;
    this.isHexagonMatrixView = false;
    this.isStackDeckView = false;
    this.isLuminescenceView = false;
    this.isGeodeView = false;
    this.isLotusView = false;
    this.isFibonacciSpiralView = false;
    this.isHypercubeView = false;
    this.isTheaterView = false;
    this.isTornadoView = false;
    this.isVenetianView = false;
    this.isStaircaseView = false;
    this.isCardSpreadView = false;
    this.isAuroraView = false;
    this.isPyramidView = false;
    this.isTorusView = false;
    this.isFloatingNexusView = false;

    document.body.classList.remove(
      "waterfall-active",
      "cityscape-active",
      "house-of-cards-active",
      "cascade-active",
      "orbit-active",
      "scattered-active",
      "isometric-active",
      "stack-active",
      "timeline-active",
      "tunnel-active",
      "grid-active",
      "helix-active",
      "meteor-active",
      "pinboard-active",
      "vortex-active",
      "constellation-active",
      "prism-active",
      "prism-split-active",
      "coverflow-active",
      "wave-active",
      "sphere-active",
      "black-hole-active",
      "rolodex-active",
      "cylinder-active",
      "galaxy-active",
      "origami-active",
      "data-hive-active",
      "matrix-rain-active",
      "fractal-active",
      "solar-system-active",
      "neon-synth-active",
      "tesseract-active",
      "fibonacci-spiral-active",
      "blueprint-3d-active",
      "cyber-cortex-active",
      "outline-active",
      "infinity-mirror-active",
      "kaleidoscope-active",
      "bookshelf-active",
      "carousel-active",
      "time-tunnel-active",
      "accordion-active",
      "chrono-ring-active",
      "cyclone-active",
      "mobius-active",
      "torus-active",
      "floating-nexus-active",
      "astrolabe-active",
      "dominoes-active",
      "luminescence-active",
      "geode-active",
      "lotus-active",
      "hypercube-active",
      "theater-active",
      "tornado-active",
      "venetian-active",
      "staircase-active",
      "aurora-active",
      "stack-deck-active",
      "card-spread-active",
      "pyramid-active"
    );

    this.isOrigamiView = false;
    this.isDataHiveView = false;
    this.isCardSpreadView = false;

    [
      "btn-waterfall-view",
      "btn-cascade-view",
      "btn-orbit-view",
      "btn-scattered-view",
      "btn-isometric-view",
      "btn-stack-view",
      "btn-timeline-view",
      "btn-tunnel-view",
      "btn-grid-view",
      "btn-helix-view",
      "btn-pinboard-view",
      "btn-vortex-view",
      "btn-constellation-view",
      "btn-prism-view",
      "btn-coverflow-view",
      "btn-wave-view",
      "btn-sphere-view",
      "btn-rolodex-view",
      "btn-data-hive-view",
      "btn-matrix-rain-view",
      "btn-fractal-view",
      "btn-solar-system-view",
      "btn-neon-synth-view",
      "btn-tesseract-view",
      "btn-blueprint-3d-view",
      "btn-cyber-cortex-view",
      "btn-hexagon-matrix-view",
    ].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.remove("active");
    });
  },
  toggleLotusView() {
    const wasActive = this.isLotusView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isLotusView = true;
      document.body.classList.add("lotus-active");
    }
    this._renderEchoes();
  },
  toggleFibonacciSpiralView() {
    const wasActive = this.isFibonacciSpiralView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isFibonacciSpiralView = true;
      document.body.classList.add("fibonacci-spiral-active");
      const btn = document.getElementById("btn-fibonacci-spiral-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleChronoRingView() {
    const wasActive = this.isChronoRingView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isChronoRingView = true;
      document.body.classList.add("chrono-ring-active");
    }
    this._renderEchoes();
  },
  toggleDnaHelixView() {
    const wasActive = this.isDnaHelixView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isDnaHelixView = true;
      document.body.classList.add("dna-helix-active");
    }
    this._renderEchoes();
  },
  toggleCardSpreadView() {
    const wasActive = this.isCardSpreadView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isCardSpreadView = true;
      document.body.classList.add("card-spread-active");
      const btn = document.getElementById("btn-card-spread-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleMeteorView() {
    const wasActive = this.isMeteorView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isMeteorView = true;
      document.body.classList.add("meteor-active");
      const btn = document.getElementById("btn-meteor-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleStackDeckView() {
    const wasActive = this.isStackDeckView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isStackDeckView = true;
      document.body.classList.add("stack-deck-active");
    }
    this._renderEchoes();
  },
  toggleStaircaseView() {
    const wasActive = this.isStaircaseView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isStaircaseView = true;
      document.body.classList.add("staircase-active");
      const btn = document.getElementById("btn-staircase-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  togglePyramidView() {
    const wasActive = this.isPyramidView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isPyramidView = true;
      document.body.classList.add("pyramid-active");
      const btn = document.getElementById("btn-pyramid-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleRibbonView() {
    const wasActive = this.isRibbonView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isRibbonView = true;
      document.body.classList.add("ribbon-active");
      const btn = document.getElementById("btn-ribbon-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleHypercubeView() {
    const wasActive = this.isHypercubeView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isHypercubeView = true;
      document.body.classList.add("hypercube-active");
    }
    this._renderEchoes();
  },
  toggleTheaterView() {
    const wasActive = this.isTheaterView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isTheaterView = true;
      document.body.classList.add("theater-active");
    }
    this._renderEchoes();
  },
  toggleVenetianView() {
    const wasActive = this.isVenetianView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isVenetianView = true;
      document.body.classList.add("venetian-active");
    }
    this._renderEchoes();
  },
  toggleTornadoView() {
    const wasActive = this.isTornadoView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isTornadoView = true;
      document.body.classList.add("tornado-active");
    }
    this._renderEchoes();
  },
  toggleHexagonMatrixView() {
    const wasActive = this.isHexagonMatrixView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isHexagonMatrixView = true;
      document.body.classList.add("hexagon-matrix-active");
      const btn = document.getElementById("btn-hexagon-matrix-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleGeodeView() {
    const wasActive = this.isGeodeView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isGeodeView = true;
      document.body.classList.add("geode-active");
    }
    this._renderEchoes();
  },
  toggleNeonSynthView() {
    const wasActive = this.isNeonSynthView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isNeonSynthView = true;
      document.body.classList.add("neon-synth-active");
      const btn = document.getElementById("btn-neon-synth-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleAstrolabeView() {
    const wasActive = this.isAstrolabeView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isAstrolabeView = true;
      document.body.classList.add("astrolabe-active");
    }
    this._renderEchoes();
  },
  toggleDominoesView() {
    const wasActive = this.isDominoesView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isDominoesView = true;
      document.body.classList.add("dominoes-active");
    }
    this._renderEchoes();
  },
  toggleBlueprint3dView() {
    const wasActive = this.isBlueprint3dView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isBlueprint3dView = true;
      document.body.classList.add("blueprint-3d-active");
      const btn = document.getElementById("btn-blueprint-3d-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleCyberCortexView() {
    const wasActive = this.isCyberCortexView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isCyberCortexView = true;
      document.body.classList.add("cyber-cortex-active");
      const btn = document.getElementById("btn-cyber-cortex-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleQuantumSuperpositionView() {
    this._deactivateAllViews();
    if (!document.body.classList.contains("quantum-superposition-active")) {
      this.isQuantumSuperpositionView = true;
      document.body.classList.add("quantum-superposition-active");
    }
    this._renderEchoes();
  },
  toggleOutlineView() {
    const wasActive = this.isOutlineView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isOutlineView = true;
      document.body.classList.add("outline-active");
    }
    this._renderEchoes();
  },
  toggleCycloneView() {
    const wasActive = this.isCycloneView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isCycloneView = true;
      document.body.classList.add("cyclone-active");
    }
    this._renderEchoes();
  },
  toggleMobiusView() {
    const wasActive = this.isMobiusView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isMobiusView = true;
      document.body.classList.add("mobius-active");
    }
    this._renderEchoes();
  },
  toggleTesseractView() {
    const wasActive = this.isTesseractView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isTesseractView = true;
      document.body.classList.add("tesseract-active");
      const btn = document.getElementById("btn-tesseract-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleCoverflowView() {
    const wasActive = this.isCoverflowView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isCoverflowView = true;
      document.body.classList.add("coverflow-active");
      const btn = document.getElementById("btn-coverflow-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleSolarSystemView() {
    const wasActive = this.isSolarSystemView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isSolarSystemView = true;
      document.body.classList.add("solar-system-active");
      const btn = document.getElementById("btn-solar-system-view");
      if (btn) btn.classList.add("active");
    }
    this._renderEchoes();
  },
  toggleBookshelfView() {
    const wasActive = this.isBookshelfView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isBookshelfView = true;
      document.body.classList.add("bookshelf-active");
    }
    this._renderEchoes();
  },
  toggleCarouselView() {
    this._deactivateAllViews();
    this.isCarouselView = true;
    document.body.classList.add("carousel-active");
    this._renderEchoes();
  },
  toggleArchwayView() {
    this._deactivateAllViews();
    this.isArchwayView = true;
    document.body.classList.add("archway-active");
    this._renderEchoes();
  },
  toggleAccordionView() {
    this._deactivateAllViews();
    this.isAccordionView = true;
    document.body.classList.add("accordion-active");
    this._renderEchoes();
  },
  toggleInfinityMirrorView() {
    this._deactivateAllViews();
    this.isInfinityMirrorView = true;
    document.body.classList.add("infinity-mirror-active");
    this._renderEchoes();
  },
  toggleKaleidoscopeView() {
    this._deactivateAllViews();
    this.isKaleidoscopeView = true;
    document.body.classList.add("kaleidoscope-active");
    this._renderEchoes();
  },
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
  toggleCityscapeView() {
    const wasActive = this.isCityscapeView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isCityscapeView = true;
      document.body.classList.add("cityscape-active");
    }
    this._renderEchoes();
  },
  toggleHouseOfCardsView() {
    const wasActive = this.isHouseOfCardsView;
    this._deactivateAllViews();
    if (!wasActive) {
      this.isHouseOfCardsView = true;
      document.body.classList.add("house-of-cards-active");
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

};



TabManagerMixin0.toggleAuroraView = function() {
  const wasActive = this.isAuroraView;
  this._deactivateAllViews();
  if (!wasActive) {
    this.isAuroraView = true;
    document.body.classList.add("aurora-active");
  }
  this._renderEchoes();
};

TabManagerMixin0.toggleFloatingNexusView = function() {
  const wasActive = this.isFloatingNexusView;
  this._deactivateAllViews();
  if (!wasActive) {
    this.isFloatingNexusView = true;
    document.body.classList.add("floating-nexus-active");
  }
  this._renderEchoes();
};
