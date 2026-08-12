import {
  storageAPI,
  TOAST_DISPLAY_DURATION,
  DEPTH_Z_INDEX,
  DEPTH_ICONS,
  DEPTH_TITLES,
  _extractSymbols,
  _symbolKindIcon,
} from "../TabManager.js";

/** Per-view echo-document CSS variable layouts (chunked dispatch chain). */
export const TabManagerEchoLayoutsMixin = {

  _applyLayoutChunk0(el, index, totalEchoes, file, inactiveFiles, activeFile) {
    if (this.isLotusView) {
      // Lotus View positions
      const angle = (index / totalEchoes) * Math.PI * 2;
      const radius = 400 + (index % 2) * 100; // Alternating petal lengths

      const tx = Math.sin(angle) * radius;
      const ty = Math.cos(angle) * radius;
      const tz = -200 - index * 20;

      const rotZ = -(angle * 180) / Math.PI;
      const rotX = 15; // Inward tilt

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", `${rotX}deg`);
      el.style.setProperty("--rot-y", `${rotY}deg`);
      el.style.setProperty("--rot-z", "0deg");
      return true;
    }
    if (this.isTheaterView) {
      // Theater View positions
      const totalEchoes = Math.max(1, inactiveFiles.length);
      const radius = 600;
      // Arrange items in a semi-circle based on index
      const angle = (index / totalEchoes) * Math.PI - Math.PI / 2;

      const tx = Math.sin(angle) * radius;
      const ty = 0;
      const tz = -Math.cos(angle) * radius;

      const rotY = -angle * (180 / Math.PI);

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", "0deg");
      el.style.setProperty("--rot-y", `${rotY}deg`);
      el.style.setProperty("--rot-z", "0deg");
      return true;
    }
    if (this.isTornadoView) {
      // Tornado View positions
      const totalEchoes = Math.max(1, inactiveFiles.length);
      const angleStep = Math.PI / 3;
      const angle = index * angleStep;

      // Base radius expands as we go further up the tornado
      const radius = 200 + index * 40;

      const tx = Math.cos(angle) * radius;
      // Tornado goes up or down. Let's make it go up.
      const ty = index * 80 - 300;
      const tz = Math.sin(angle) * radius - 400;

      const rotY = -angle * (180 / Math.PI) - 90;
      const rotX = 15;

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", `${rotX}deg`);
      el.style.setProperty("--rot-y", "0deg");
      el.style.setProperty("--rot-z", `${rotZ}deg`);
      return true;
    }
    if (this.isHypercubeView) {
      // Hypercube layout - distributed across 6 faces of a cube
      const layer = Math.floor(index / 6);
      const distance = 400 + layer * 200;
      const faceIndex = index % 6;
      let tx = 0,
        ty = 0,
        tz = 0;
      let rotX = 0,
        rotY = 0,
        rotZ = 0;

      switch (faceIndex) {
        case 0: // Front
          tz = distance;
          break;
        case 1: // Back
          tz = -distance;
          rotY = 180;
          break;
        case 2: // Right
          tx = distance;
          rotY = 90;
          break;
        case 3: // Left
          tx = -distance;
          rotY = -90;
          break;
        case 4: // Top
          ty = -distance;
          rotX = 90;
          break;
        case 5: // Bottom
          ty = distance;
          rotX = -90;
          break;
      }

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", `${rotX}deg`);
      el.style.setProperty("--rot-y", `${rotY}deg`);
      el.style.setProperty("--rot-z", `${rotZ}deg`);
      return true;
    }
    if (this.isHexagonMatrixView) {
      // Hexagon Matrix View positions
      const cols = Math.ceil(Math.sqrt(totalEchoes));
      const hexWidth = 400;
      const hexHeight = (Math.sqrt(3) * hexWidth) / 2; // Hexagon row height

      const col = index % cols;
      const row = Math.floor(index / cols);

      // Offset every other row
      const rowOffset = row % 2 === 1 ? hexWidth / 2 : 0;

      const offsetX = -((cols - 1) * hexWidth) / 2;
      const offsetY = -((Math.ceil(totalEchoes / cols) - 1) * hexHeight) / 2;

      const tx = offsetX + col * hexWidth + rowOffset;
      const ty = offsetY + row * hexHeight;
      const tz = -300 - row * 50; // Push back slightly and slope

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", "0deg");
      el.style.setProperty("--rot-y", "0deg");
      el.style.setProperty("--rot-z", "0deg");
      return true;
    }
    if (this.isTunnelView) {
      // Tunnel View: arrange into a 3D cylindrical tunnel leading backward
      const angle = (index / totalEchoes) * Math.PI * 2 * 3; // Spiral
      const radius = 400;
      const tx = Math.cos(angle) * radius;
      const ty = Math.sin(angle) * radius;
      const tz = -index * 150;
      const rotZ = (angle * 180) / Math.PI;

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-z", `${rotZ}deg`);
      el.style.setProperty("--rot-x", "0deg");
      el.style.setProperty("--rot-y", "0deg");
      return true;
    }
    if (this.isGridView) {
      // Grid View: neat 3D matrix-style wall
      const cols = Math.ceil(Math.sqrt(totalEchoes));
      const spacingX = 600;
      const spacingY = 400;

      const col = index % cols;
      const row = Math.floor(index / cols);

      const offsetX = -((cols - 1) * spacingX) / 2;
      const offsetY = -((Math.ceil(totalEchoes / cols) - 1) * spacingY) / 2;

      const tx = offsetX + col * spacingX;
      const ty = offsetY + row * spacingY;
      const tz = -300; // Push back slightly

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", "0deg");
      el.style.setProperty("--rot-y", "0deg");
      el.style.setProperty("--rot-z", "0deg");
      return true;
    }
    if (this.isOrbitView) {
      // Orbit View (3D Carousel Cylindrical) positions
      const angle = (index / totalEchoes) * 360; // Degrees
      const orbitRadius = Math.max(500, totalEchoes * 120); // Dynamic radius based on file count

      el.style.setProperty("--orbit-rot-y", `${angle}deg`);
      el.style.setProperty("--orbit-tz", `${orbitRadius}px`);

      // Remove standard tx, ty offsets to center the carousel properly
      el.style.setProperty("--tx", `0px`);
      el.style.setProperty("--ty", `0px`);
      el.style.setProperty("--tz", `0px`);
      return true;
    }
    if (this.isTheaterView) {
      // Theater / Amphitheater View
      const total = Math.max(1, totalEchoes);
      const angle =
        total <= 1 ? 0 : (index / (total - 1)) * Math.PI - Math.PI / 2;
      const radius = 600;
      const tx = Math.sin(angle) * radius;
      const tz = -Math.cos(angle) * radius;
      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `0px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", "0deg");
      el.style.setProperty("--rot-y", `${-((angle * 180) / Math.PI)}deg`);
      el.style.setProperty("--rot-z", "0deg");
      return true;
    }
    if (this.isTornadoView) {
      // Tornado View
      const angle = index * 0.8;
      const height = -200 + index * 50;
      const radius = 100 + index * 20;
      const tx = Math.sin(angle) * radius;
      const tz = -Math.cos(angle) * radius;
      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${height}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", "15deg");
      el.style.setProperty("--rot-y", `${-((angle * 180) / Math.PI)}deg`);
      el.style.setProperty("--rot-z", "5deg");
      return true;
    }
    if (this.isWaterfallView) {
      // Waterfall Layout: Cascade downwards and slightly backwards
      const tx = index % 2 === 0 ? 50 : -50; // slight alternating zigzag
      const ty = index * 120 + 50; // cascade down heavily
      const tz = -index * 60; // push backwards
      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-y", "0deg");
      el.style.setProperty("--rot-x", "15deg"); // slight tilt up to see the flow
      el.style.setProperty("--rot-z", "0deg");
      return true;
    }
    if (this.isCascadeView) {
      // Cascade positions
      const vw = window.innerWidth;
      const tx = vw * 0.3 + index * 40;
      const ty = index * 20;
      const tz = -index * 50;
      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      return true;
    }
    if (this.isTimelineView) {
      // Timeline View positions
      let _totalEchoes = inactiveFiles.length;
      const width = window.innerWidth * 1.5;
      // Position them in a line from left to right, going backwards in Z
      const spacingX = totalEchoes > 1 ? width / (totalEchoes - 1) : 0;
      const xPos = -width / 2 + index * spacingX;
      const zPos = -index * 150;

      el.style.setProperty("--tx", `${xPos}px`);
      el.style.setProperty("--ty", "0px");
      el.style.setProperty("--tz", `${zPos}px`);
      el.style.setProperty("--rot-x", "0deg");
      el.style.setProperty("--rot-y", "0deg");
      el.style.setProperty("--rot-z", "0deg");
      return true;
    }
    if (this.isStackView) {
      // Time Machine Stack View
      el.style.setProperty("--tx", `0px`);
      el.style.setProperty("--ty", `0px`);
      el.style.setProperty(
        "--tz",
        `${-index * 300 + (parseFloat(document.getElementById("echo-layer").style.getPropertyValue("--stack-z")) || 0)}px`,
      );
      el.style.setProperty("--rot-x", "0deg");
      el.style.setProperty("--rot-y", "0deg");
      return true;
    }
    if (this.isIsometricView) {
      // Simple stacked positioning for isometric view
      el.style.setProperty("--tx", `0px`);
      el.style.setProperty("--ty", `${index * 20}px`);
      el.style.setProperty("--tz", `${index * 50}px`);
      el.style.setProperty("--rot-x", "0deg");
      el.style.setProperty("--rot-y", "0deg");
      return true;
    }
    if (this.isHelixView) {
      // Helix View positions
      let _totalEchoes = inactiveFiles.length;
      const indexRatio = index / Math.max(1, totalEchoes - 1);
      const yRange = window.innerHeight * 0.8;
      const radius = 300;
      const cycles = 2; // Number of full rotations

      const angle = indexRatio * Math.PI * 2 * cycles;

      const tx = Math.cos(angle) * radius;
      const ty = indexRatio * yRange - yRange / 2;
      const tz = Math.sin(angle) * radius - 200; // Push back a bit

      const rotY = -((angle * 180) / Math.PI) + 90; // Face inwards/outwards appropriately

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-y", `${rotY}deg`);
      el.style.setProperty("--rot-x", "0deg");
      el.style.setProperty("--rot-z", "0deg");
      return true;
    }
    return false;
  },
  _applyLayoutChunk1(el, index, totalEchoes, file, inactiveFiles, activeFile) {
    if (this.isConstellationView) {
      // Constellation View: Map to a 3D spherical point cloud
      let _totalEchoes = inactiveFiles.length;
      const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;

      const radius = 400 + Math.sin(index * 123) * 100; // 400-500 radius with some jitter
      const tx = radius * Math.sin(phi) * Math.cos(theta);
      const ty = radius * Math.sin(phi) * Math.sin(theta);
      const tz = radius * Math.cos(phi) - 200; // Offset back

      // Random tilt for constellation nodes
      const rotX = Math.sin(index * 22) * 20;
      const rotY = Math.cos(index * 33) * 20;
      const rotZ = Math.sin(index * 44) * 20;

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", `${rotX}deg`);
      el.style.setProperty("--rot-y", `${rotY}deg`);
      el.style.setProperty("--rot-z", `${rotZ}deg`);
      return true;
    }
    if (this.isArchwayView) {
      const allEchoes = Array.from(document.querySelectorAll(".echo-document"));
      const totalEchoes = Math.max(1, allEchoes.length);
      const index = parseInt(el.dataset.index || 0);

      // Allow continuous cycling using scrollRotation added via main.js
      const scrollOffset = window.archScrollOffset || 0;

      const ARCH_ANGLE_SPAN = Math.PI * 1.1;
      const ANGLE_STEP = ARCH_ANGLE_SPAN / Math.min(15, totalEchoes);
      const angle = index * ANGLE_STEP + scrollOffset;

      const radius = 1200;
      const tx = Math.sin(angle) * radius;
      const tz = Math.cos(angle) * radius * 0.6 - 400;
      const ty = 400 + Math.sin(angle) * -200;

      const rotY = angle * -30;

      const depthFactor = (Math.cos(angle) + 1) / 2;
      const scale = 0.6 + depthFactor * 0.4;
      const opacity = 0.3 + depthFactor * 0.7;

      el.style.setProperty("--arch-tx", `${tx}px`);
      el.style.setProperty("--arch-ty", `${ty}px`);
      el.style.setProperty("--arch-tz", `${tz}px`);
      el.style.setProperty("--arch-rot-y", `${rotY}deg`);
      el.style.setProperty("--arch-scale", scale);
      el.style.opacity = opacity;
      return true;
    }

    if (this.isVenetianView) {
      // Venetian Blinds view: stack closely, tilt heavily backward
      const spacingZ = 40;
      const tilt = -75; // Heavy backward tilt

      // Adjust position slightly to center the stack
      const ty = 0;
      const tz = -(index * spacingZ);

      const tx = 0;
      const rotX = tilt;
      const rotY = 0;
      const rotZ = 0;

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", `${rotX}deg`);
      el.style.setProperty("--rot-y", `${rotY}deg`);
      el.style.setProperty("--rot-z", `${rotZ}deg`);

      el.style.opacity = Math.max(0.1, 1 - index * 0.15);
      return true;
    }

    if (this.isMobiusView) {
      // Mobius Strip View positions
      const totalEchoes = Math.max(1, inactiveFiles.length);
      const t = index / totalEchoes; // 0 to 1
      const R = 600; // Radius of the strip
      const w = 200; // Width parameter of the strip

      // Parametric equations for a Möbius strip
      const u = t * Math.PI * 2; // Angle around the strip
      const v = (index % 2 === 0 ? 1 : -1) * 0.5 * w; // Width variation

      const tx = (R + v * Math.cos(u / 2)) * Math.cos(u);
      const ty = v * Math.sin(u / 2);
      const tz = (R + v * Math.cos(u / 2)) * Math.sin(u) - 400; // Push back

      // Rotate to be tangential to the strip
      const rotY = -((u * 180) / Math.PI) + 90;
      const rotZ = ((u / 2) * 180) / Math.PI;
      const rotX = 0;

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", `${rotX}deg`);
      el.style.setProperty("--rot-y", `${rotY}deg`);
      el.style.setProperty("--rot-z", `${rotZ}deg`);
      return true;
    }
    if (this.isAstrolabeView) {
      // Astrolabe View positions
      const tx = Math.cos((index * Math.PI) / 4) * 300;
      const ty = Math.sin((index * Math.PI) / 4) * 300;
      const tz = -200;
      const rotZ = index * 45;

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", `0deg`);
      el.style.setProperty("--rot-y", `0deg`);
      el.style.setProperty("--rot-z", `${rotZ}deg`);
      return true;
    }
    if (this.isDominoesView) {
      // Dominoes View positions
      const tx = index * 20;
      const ty = 0;
      const tz = index * -50;
      const rotX = 10;

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", `${rotX}deg`);
      el.style.setProperty("--rot-y", `0deg`);
      el.style.setProperty("--rot-z", `0deg`);
      return true;
    }
    if (this.isGeodeView) {
      // Geode View: Arranged inside a hollow sphere, facing inward
      // with crystalline angular variations
      const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      const radius = 500;

      // Random angular jitter for crystalline look
      const jitterRotX = (Math.random() - 0.5) * 45;
      const jitterRotY = (Math.random() - 0.5) * 45;
      const jitterRotZ = (Math.random() - 0.5) * 45;

      const tx = radius * Math.sin(phi) * Math.cos(theta);
      const ty = radius * Math.sin(phi) * Math.sin(theta);
      const tz = radius * Math.cos(phi) - 300;

      // Face inward, opposite of Luminescence view
      const rotX = -((phi * 180) / Math.PI - 90) + jitterRotX;
      const rotY = -((theta * 180) / Math.PI) + jitterRotY;
      const rotZ = jitterRotZ;

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", `${rotX}deg`);
      el.style.setProperty("--rot-y", `${rotY}deg`);
      el.style.setProperty("--rot-z", `${rotZ}deg`);
      return true;
    }
    if (this.isLuminescenceView) {
      // Luminescence View: Floating sphere with glowing colors based on extension
      // Using golden ratio spiral for even distribution on a sphere
      const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
      const theta = Math.PI * (1 + Math.sqrt(5)) * index;
      const radius = 600;

      const tx = radius * Math.sin(phi) * Math.cos(theta);
      const ty = radius * Math.sin(phi) * Math.sin(theta);
      const tz = radius * Math.cos(phi) - 300; // Center the sphere

      // Calculate rotation so documents face outward
      const rotX = (phi * 180) / Math.PI - 90;
      const rotY = (theta * 180) / Math.PI;

      let glowColor = "rgba(255, 255, 255, 0.6)"; // Default white
      if (tab.name.endsWith(".js")) {
        glowColor = "rgba(255, 215, 0, 0.8)"; // Yellow for JS
      } else if (tab.name.endsWith(".css")) {
        glowColor = "rgba(0, 191, 255, 0.8)"; // Deep Sky Blue for CSS
      } else if (tab.name.endsWith(".html")) {
        glowColor = "rgba(255, 69, 0, 0.8)"; // Red-Orange for HTML
      } else if (tab.name.endsWith(".md")) {
        glowColor = "rgba(147, 112, 219, 0.8)"; // Medium Purple for MD
      } else if (tab.name.endsWith(".py")) {
        glowColor = "rgba(50, 205, 50, 0.8)"; // Lime Green for Python
      } else {
        // Provide a pseudo-random color for other files based on their ID
        const hue = (parseInt(tab.id.replace("tab-", "")) * 137.5) % 360;
        glowColor = `hsla(${hue}, 100%, 60%, 0.8)`;
      }

      el.style.setProperty("--glow-color", glowColor);
      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-x", `${rotX}deg`);
      el.style.setProperty("--rot-y", `${rotY}deg`);
      el.style.setProperty("--rot-z", `0deg`);
      return true;
    }
    if (this.isMatrixRainView) {
      // Arrange items randomly on X and Z, falling down from Y
      const maxCols = 10;
      const col = index % maxCols;
      const colWidth = window.innerWidth / maxCols;

      // Spread out evenly but with some jitter
      const tX = -window.innerWidth / 2 + col * colWidth + Math.random() * 50;

      // Random Y start position for staggered falling effect
      // We set startY uniformly within a viewport height so that
      // they loop inside the animation keyframes (-100vh to 100vh) consistently
      const startY =
        -window.innerHeight / 2 - Math.random() * window.innerHeight;

      // Z-depth spread
      const tZ = -300 - Math.random() * 600;

      const rX = 0;
      const rY = 0;
      const rZ = 0;

      el.style.setProperty("--tx", `${tX}px`);
      el.style.setProperty("--ty", `${startY}px`);
      el.style.setProperty("--tz", `${tZ}px`);
      el.style.setProperty("--rot-x", `${rX}deg`);
      el.style.setProperty("--rot-y", `${rY}deg`);
      el.style.setProperty("--rot-z", `${rZ}deg`);

      // Use animation delay to randomize falling
      el.style.setProperty("--matrix-delay", `${Math.random() * 5}s`);
      return true;
    }
    if (this.isFractalView) {
      // Fractal Tree positioning
      const depth = Math.floor(Math.log2(index + 1)); // 0, 1, 2, 3...
      const indexInLevel = index - (Math.pow(2, depth) - 1); // 0, 0,1, 0,1,2,3...
      const itemsInLevel = Math.pow(2, depth);

      // Spread evenly horizontally based on depth
      const xSpread = window.innerWidth * 0.8;
      const startX = -xSpread / 2;
      const stepX = itemsInLevel > 1 ? xSpread / (itemsInLevel - 1) : 0;

      const tX = startX + indexInLevel * stepX;
      const tY = depth * 300 - 400; // Go down as depth increases
      const tZ = -depth * 200; // Go back as depth increases

      const rX = 0;
      const rY = 0;
      const rZ = 0;

      el.style.setProperty("--tx", `${tX}px`);
      el.style.setProperty("--ty", `${tY}px`);
      el.style.setProperty("--tz", `${tZ}px`);
      el.style.setProperty("--rot-x", `${rX}deg`);
      el.style.setProperty("--rot-y", `${rY}deg`);
      el.style.setProperty("--rot-z", `${rZ}deg`);
      return true;
    }
    if (this.isVortexView) {
      // Vortex View positions
      let _totalEchoes = inactiveFiles.length;
      const indexRatio = index / Math.max(1, totalEchoes - 1);
      const radius = 200 + index * 40; // Expanding radius
      const angle = indexRatio * Math.PI * 2 * 4; // 4 swirls

      const tx = Math.cos(angle) * radius;
      const ty = Math.sin(angle) * radius;
      const tz = -index * 120 - 100;

      const rotZ = (angle * 180) / Math.PI + 90;

      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--tz", `${tz}px`);
      el.style.setProperty("--rot-z", `${rotZ}deg`);
      el.style.setProperty("--rot-x", "0deg");
      el.style.setProperty("--rot-y", "0deg");
      return true;
    }
    return false;
  },

  _applyLayoutChunk2(el, index, totalEchoes, file, inactiveFiles, activeFile) {
      if (this.isShatteredGlassView) {
        // Shattered Glass View: random sharp translations and rotations
        const pseudoRandomX = Math.sin(index * 11.23);
        const pseudoRandomY = Math.cos(index * 13.37);
        const pseudoRandomZ = Math.sin(index * 17.59);

        const tx = pseudoRandomX * 800;
        const ty = pseudoRandomY * 800;
        const tz = pseudoRandomZ * 1000 - 400; // slightly pushed back

        const rotX = pseudoRandomY * 180;
        const rotY = pseudoRandomX * 180;
        const rotZ = pseudoRandomZ * 90;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        return true;
      }

      if (this.isCityscapeView) {
        // Cityscape View: buildings of varying heights jutting out from a flat grid
        const cols = Math.ceil(Math.sqrt(totalEchoes));
        const row = Math.floor(index / cols);
        const col = index % cols;

        const spacingX = 400;
        const spacingZ = 300;

        const offsetX = -((cols - 1) * spacingX) / 2;
        const offsetZ = -((Math.ceil(totalEchoes / cols) - 1) * spacingZ) / 2;

        const tx = offsetX + col * spacingX;
        // Pseudo-random height (tz) variation based on index to look like buildings
        const pseudoRandom = Math.sin(index * 13.37) * 0.5 + 0.5; // value between 0 and 1
        const buildingHeight = 100 + pseudoRandom * 600;

        const tz = offsetZ - row * spacingZ - 400; // push everything back a bit
        // Tilt the documents so they stand up from the floor
        const ty = 300 - buildingHeight / 2;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz + buildingHeight}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        el.style.setProperty("--rot-z", "0deg");
        // add some minor scale to vary thickness visually
        el.style.transform = `translate3d(var(--tx), var(--ty), var(--tz)) rotateX(var(--rot-x)) rotateY(var(--rot-y)) rotateZ(var(--rot-z)) scale(${1 - pseudoRandom * 0.2})`;

        return;
      }
      if (this.isStaircaseView) {
        // Staircase View: cascading step-like arrangement
        const stepWidth = 100;
        const stepHeight = 80;
        const stepDepth = 150;

        // Center the staircase somewhat
        const offsetX = -((totalEchoes - 1) * stepWidth) / 2;
        const offsetY = -((totalEchoes - 1) * stepHeight) / 2;

        const tx = offsetX + index * stepWidth;
        const ty = offsetY + index * stepHeight;
        const tz = -index * stepDepth;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        el.style.setProperty("--rot-z", "0deg");

        return;
      }
      if (this.isPyramidView) {
        // Pyramid View: converging layers
        const layerDepth = 200;
        const baseWidth = 800;
        const baseHeight = 600;

        // Approximate pyramid layers
        let layers = Math.ceil(Math.sqrt(totalEchoes));
        let itemsInLayer = layers;
        let layerIdx = 0;
        let itemInLayerIdx = 0;

        let remaining = index;
        for (let l = layers; l > 0; l--) {
            if (remaining < l) {
                layerIdx = layers - l;
                itemInLayerIdx = remaining;
                itemsInLayer = l;
                break;
            }
            remaining -= l;
        }

        const scale = 1 - (layerIdx / layers); // Shrink width/height per layer
        const currentWidth = baseWidth * scale;
        const currentHeight = baseHeight * scale;

        const tx = itemsInLayer > 1 ? -currentWidth/2 + (currentWidth / (itemsInLayer - 1)) * itemInLayerIdx : 0;
        const ty = (layerIdx * 100) - 200; // Shift up as we go deeper
        const tz = -(layerIdx + 1) * layerDepth;

        // Tilt slightly to point towards apex
        const rotX = 15;
        const rotY = itemsInLayer > 1 ? -15 + (30 / (itemsInLayer - 1)) * itemInLayerIdx : 0;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", "0deg");

        return;
      }
      if (this.isPinboardView) {
        // Pinboard View positions (Organic spread on a wall)
        let _totalEchoes = inactiveFiles.length;
        const spreadW = window.innerWidth * 0.8;
        const spreadH = window.innerHeight * 0.8;

        // Use a grid-like base with random offsets for organic feel
        const cols = Math.ceil(Math.sqrt(totalEchoes));
        const col = index % cols;
        const row = Math.floor(index / cols);

        const cellW = spreadW / Math.max(1, cols);
        const cellH = spreadH / Math.max(1, Math.ceil(totalEchoes / cols));

        const randomSeedX = Math.sin(index * 123) * 0.5;
        const randomSeedY = Math.cos(index * 456) * 0.5;

        const tx =
          col * cellW - spreadW / 2 + cellW / 2 + randomSeedX * cellW * 0.5;
        const ty =
          row * cellH - spreadH / 2 + cellH / 2 + randomSeedY * cellH * 0.5;
        const tz = -150 + Math.sin(index * 789) * 50; // slight depth variation

        const rotZ = Math.sin(index * 111) * 15; // -15 to 15 deg tilt

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        return true;
      }
      if (this.isRibbonView) {
        // Ribbon View positions: a winding 3D spiral ribbon
        const frequency = 0.5; // Controls how fast the ribbon winds
        const amplitude = 300; // Controls the width of the ribbon

        const tz = -index * 150; // Moving back in Z space
        const angle = index * frequency;

        const tx = Math.sin(angle) * amplitude;
        const ty = Math.cos(angle) * (amplitude / 2); // Slightly squashed vertically

        // Rotate items so they "face" along the ribbon curve somewhat
        const rotY = Math.cos(angle) * 45;
        const rotX = Math.sin(angle) * 20;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `0deg`);

        return true;
      }
      if (this.isFibonacciSpiralView) {
        // Golden ratio spiral
        const phi = (1 + Math.sqrt(5)) / 2;
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const radius = index * 40;
        const theta = index * phi * Math.PI * 2;
        const tz = -index * 60 - 100;

        const tx = Math.cos(theta) * radius;
        const ty = Math.sin(theta) * radius;

        const rotZ = theta * (180 / Math.PI);

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        return true;
      }
      if (this.isSphereView) {
        // Fibonacci Sphere logic
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
        const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5);

        const radius = 600;
        const tx = radius * Math.sin(phi) * Math.cos(theta);
        const ty = radius * Math.sin(phi) * Math.sin(theta);
        const tz = radius * Math.cos(phi) - 200;

        const rotX = (ty / radius) * -90;
        const rotY = (tx / radius) * 90;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", "0deg");
        el.style.setProperty("--scatter-x", "0px");
        el.style.setProperty("--scatter-y", "0px");
        el.style.setProperty("--scatter-z", "0px");
        el.style.setProperty("--scatter-rot", "0deg");
        return true;
      }
      if (this.isAccordionView) {
        const spacingX = 40;
        const spacingZ = -100;
        const rotY = 15;
        el.style.setProperty("--tx", `${idx * spacingX}px`);
        el.style.setProperty("--tz", `${idx * spacingZ}px`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        return true;
      }
      if (this.isCarouselView) {
        const total = Math.max(1, inactiveFiles.length);
        const radius = Math.max(800, total * 150); // Dynamic radius

        // We'll calculate a base angle per item
        const angleStep = 360 / total;
        const currentAngle = index * angleStep;

        // We can pass these to CSS
        el.style.setProperty("--carousel-angle", `${currentAngle}deg`);
        el.style.setProperty("--carousel-radius", `${radius}px`);

        el.style.transform = `
          translate3d(-50%, -50%, 0)
          rotateY(var(--carousel-angle))
          translateZ(var(--carousel-radius))
        `;
        return true;
      }
      if (this.isInfinityMirrorView) {
        const isLeft = index % 2 === 0;
        const tz = -(index + 1) * 300;
        const tx = isLeft ? -400 : 400;
        const rotY = isLeft ? 45 : -45;

        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        return true;
      }
      if (this.isKaleidoscopeView) {
        // Kaleidoscope View: radially symmetric pattern with rotation and translation
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const angle = (index / totalEchoes) * Math.PI * 2;
        const radius = 500;

        const tx = Math.sin(angle) * radius;
        const ty = Math.cos(angle) * radius;
        const tz = -400; // Push back into Z
        const rotZ = (-angle * 180) / Math.PI; // Face the center tangentially

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        return true;
      }
      if (this.isCylinderView) {
        // Cylinder View: vertical carousel
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const angle = (index / totalEchoes) * Math.PI * 2;
        const radius = 600;

        const tx = Math.sin(angle) * radius;
        const ty = 0;
        const tz = Math.cos(angle) * radius - 200; // offset back

        // Orient planes facing outward (along Y axis)
        const rotY = (angle * 180) / Math.PI;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", "0deg");
        el.style.setProperty("--scatter-x", "0px");
        el.style.setProperty("--scatter-y", "0px");
        el.style.setProperty("--scatter-z", "0px");
        el.style.setProperty("--scatter-rot", "0deg");
        return true;
      }
      if (this.isSolarSystemView) {
        // Concentric orbits around the center.
        // Index determines the orbit radius and speed.
        const orbitSpacing = 200; // Distance between orbits
        const radius = 300 + index * orbitSpacing;

        // Stagger the starting angles
        const startAngle = (index * Math.PI * 0.7) % (Math.PI * 2);

        // Pass the radius to CSS for animation
        el.style.setProperty("--orbit-radius", `${radius}px`);
        el.style.setProperty("--orbit-start-angle", `${startAngle}rad`);

        // We'll let CSS keyframes handle the x/y translation for the orbit,
        // but we'll set base transforms here to position the orbital plane.
        // By default we use a tilted plane
        el.style.setProperty("--tx", "0px");
        el.style.setProperty("--ty", "0px");
        el.style.setProperty("--tz", "-200px"); // Push back slightly
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        el.style.setProperty("--rot-z", "0deg");
        el.style.setProperty("--scatter-x", "0px");
        el.style.setProperty("--scatter-y", "0px");
        el.style.setProperty("--scatter-z", "0px");
        el.style.setProperty("--scatter-rot", "0deg");

        // Pass index to CSS to vary the orbit duration
        el.style.setProperty("--orbit-index", index + 1);
        return true;
      }
      if (this.isBookshelfView) {
        const inactiveFiles = this.files.filter((f) => f.id !== this.activeId);
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const cols = Math.ceil(Math.sqrt(totalEchoes));
        const col = index % cols;
        const row = Math.floor(index / cols);

        // Arrange like books on a shelf
        const spacingX = 400;
        const spacingY = 300;
        const startX = -((cols - 1) * spacingX) / 2;
        const startY = -(((Math.ceil(totalEchoes / cols)) - 1) * spacingY) / 2;

        const tx = startX + col * spacingX;
        const ty = startY + row * spacingY;
        const tz = -400; // Pushed back

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        el.style.setProperty("--rot-z", "0deg");
        el.style.setProperty("--scatter-x", "0px");
        el.style.setProperty("--scatter-y", "0px");
        el.style.setProperty("--scatter-z", "0px");
        el.style.setProperty("--scatter-rot", "0deg");
        return true;
      }
      if (this.isTesseractView) {
        const face = index % 6;
        const isOuter = Math.floor(index / 6) % 2 === 0;
        const r = isOuter ? 400 : 200;
        let tx = 0,
          ty = 0,
          tz = 0,
          rx = 0,
          ry = 0;
        if (face === 0) {
          tz = r;
        } else if (face === 1) {
          tz = -r;
          ry = 180;
        } else if (face === 2) {
          tx = r;
          ry = 90;
        } else if (face === 3) {
          tx = -r;
          ry = -90;
        } else if (face === 4) {
          ty = r;
          rx = -90;
        } else if (face === 5) {
          ty = -r;
          rx = 90;
        }

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rx}deg`);
        el.style.setProperty("--rot-y", `${ry}deg`);
        el.style.setProperty("--rot-z", "0deg");
        return true;
      }
      if (this.isBlueprint3dView) {
        // Semi-circle arrangement like an architect's desk
        let _totalEchoes = inactiveFiles.length;
        const r = 400;
        const angle = (index / Math.max(1, totalEchoes - 1)) * Math.PI;

        const tx = Math.cos(angle) * r;
        const ty = 50; // slightly down
        const tz = -Math.sin(angle) * r - 100;

        const rotY = (angle * 180) / Math.PI - 90; // Face user

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", "0deg");
        return true;
      }
      if (this.isQuantumSuperpositionView) {
        // Quantum Superposition: Scatter in 3D cloud
        const maxDist = 800;
        const tX = (Math.random() - 0.5) * maxDist * 2;
        const tY = (Math.random() - 0.5) * maxDist * 2;
        const tZ = -(Math.random() * 2000 + 200); // Back into screen

        const rX = (Math.random() - 0.5) * 60; // -30 to 30 deg
        const rY = (Math.random() - 0.5) * 60;
        const rZ = (Math.random() - 0.5) * 60;

        el.style.setProperty("--tx", `${tX}px`);
        el.style.setProperty("--ty", `${tY}px`);
        el.style.setProperty("--tz", `${tZ}px`);
        el.style.setProperty("--rot-x", `${rX}deg`);
        el.style.setProperty("--rot-y", `${rY}deg`);
        el.style.setProperty("--rot-z", `${rZ}deg`);
        return true;
      }

      if (this.isHouseOfCardsView) {
        // House of Cards View: stacked structure
        let _totalEchoes = inactiveFiles.length;

        // Build rows starting from bottom
        // Row 0 has max items, Row 1 has max-1, etc.
        let row = 0;
        let col = 0;
        let itemsInRow = 4; // Start with 4 items at the base
        let itemsCounted = 0;

        for (let i = 0; i < index; i++) {
          col++;
          if (col >= itemsInRow) {
            row++;
            col = 0;
            itemsInRow = Math.max(1, itemsInRow - 1);
          }
        }

        // Random slight offsets for realism
        const randomSeed = index * 9876.54321;
        const jitterX = (Math.sin(randomSeed) - 0.5) * 20;
        const jitterY = (Math.cos(randomSeed * 1.5) - 0.5) * 20;
        const jitterZ = (Math.sin(randomSeed * 2.5) - 0.5) * 10;
        const jitterRotZ = (Math.cos(randomSeed * 3.5) - 0.5) * 10;

        const spacingX = 220;
        const spacingY = 180;

        // Center the rows
        const startX = -((itemsInRow - 1) * spacingX) / 2;

        // Ty goes UP (negative) as row increases
        const tx = startX + col * spacingX + jitterX;
        const ty = 200 - row * spacingY + jitterY;
        const tz = -150 - row * 50 + jitterZ; // Push higher rows further back slightly

        // Slight leaning inward for stability illusion
        const rotY = tx > 0 ? -10 : tx < 0 ? 10 : 0;
        const rotX = -5; // Tilt slightly up

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${jitterRotZ}deg`);
        return true;
      }
    return false;
  },
  _applyLayoutChunk3(el, index, totalEchoes, file, inactiveFiles, activeFile) {
if (this.isCyberCortexView) {
        // Brain-like cluster / spherical node map
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
        const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5);

        const radius = 500;
        const tx = radius * Math.sin(phi) * Math.cos(theta);
        const ty = radius * Math.sin(phi) * Math.sin(theta);
        const tz = radius * Math.cos(phi) - 200;

        // Add some organic jitter
        const rotX = Math.sin(index * 13) * 30;
        const rotY = Math.cos(index * 17) * 30;
        const rotZ = Math.sin(index * 19) * 30;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        return true;
      }
      if (this.isOrigamiView) {
        // Origami spatial view calculation
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const foldAngle = 35; // degrees for each fold
        const spacing = 180;

        // Alternating folds
        const direction = index % 2 === 0 ? 1 : -1;
        const tx = (index - totalEchoes / 2) * spacing;
        const ty = (index % 3) * 60 - 60; // stagger y
        const tz = Math.abs(index - totalEchoes / 2) * -150 - 200; // V-shape depth
        const rotY = direction * foldAngle;
        const rotZ = direction * 5;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        el.style.setProperty("--scatter-x", "0px");
        el.style.setProperty("--scatter-y", "0px");
        el.style.setProperty("--scatter-z", "0px");
        el.style.setProperty("--scatter-rot", "0deg");
        return true;
      }
      if (this.isDataHiveView) {
        // Data Hive View: Hexagonal grid arrangement
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const cols = Math.ceil(Math.sqrt(totalEchoes));
        const hexWidth = 240;
        const hexHeight = 200;

        const col = index % cols;
        const row = Math.floor(index / cols);

        // Stagger rows for hexagonal tiling
        const xOffset = row % 2 === 1 ? hexWidth / 2 : 0;
        const tx = (col - cols / 2) * hexWidth + xOffset;
        const ty = (row - cols / 2) * hexHeight;
        const tz = -400 - row * 50; // Slight slant backward

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        return true;
      }
      if (this.isCrystalView) {
        // Crystal Lattice View: 3D Grid Arrangement
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const size = Math.ceil(Math.cbrt(totalEchoes)); // Cube root for 3D grid
        const spacing = 350; // Spacing between nodes

        const zLayer = Math.floor(index / (size * size));
        const rem = index % (size * size);
        const yLayer = Math.floor(rem / size);
        const xLayer = rem % size;

        const tx = (xLayer - size / 2) * spacing;
        const ty = (yLayer - size / 2) * spacing;
        const tz = -600 - zLayer * spacing;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        el.style.setProperty("--rot-z", "0deg");
        return true;
      }
      if (this.isNeonSynthView) {
        // Neon Synth View: Retro-futuristic grid highway stretching backwards
        const laneWidth = 400;
        const zSpacing = 300;
        // Alternate between left and right lanes
        const isLeftLane = index % 2 === 0;
        const tx = isLeftLane ? -laneWidth / 2 : laneWidth / 2;
        // Position at the bottom to form the 'highway' feel
        const ty = 300;
        const tz = -index * zSpacing;

        // Tilt backwards to lay flat like a road
        const rotX = 70;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", "0deg");
        el.style.setProperty("--rot-z", "0deg");
        return true;
      }
      if (this.isCycloneView) {
        // Cyclone View: Funnel-like spiral with decreasing radius based on depth index
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const angleStep = 45; // Degrees per document

        const angleDeg = index * angleStep;
        const angleRad = (angleDeg * Math.PI) / 180;

        // Base radius is wide at top (index 0), narrow at bottom
        const radius = 600 - index * (400 / totalEchoes);

        const tx = Math.sin(angleRad) * radius;
        const tz = Math.cos(angleRad) * radius - 400; // Push back slightly
        const ty = index * 80 - totalEchoes * 40; // Spiral vertically

        // Tilt elements slightly upwards to face the viewer from the funnel
        const rotX = 15;
        const rotY = angleDeg; // Face inward

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `0deg`);
        return true;
      }
      if (this.isGalaxyView) {
        // Galaxy Spiral View: Logarithmic spiral arrangement on X-Z plane
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const spiralRotations = 3; // How many times the arms wrap
        const maxRadius = 1500;

        // Progress along the spiral (0 at center, 1 at edge)
        const t = index / totalEchoes;

        // Logarithmic scaling for tighter clustering at the core
        const r = maxRadius * Math.pow(t, 0.7);
        const theta = t * Math.PI * 2 * spiralRotations;

        // Two spiral arms offset by PI
        const armOffset = index % 2 === 0 ? 0 : Math.PI;

        const tx = r * Math.cos(theta + armOffset);
        // Add slight vertical variation
        const ty = (Math.random() - 0.5) * 200 * t;
        const tz = r * Math.sin(theta + armOffset) - 600; // Shift galaxy backwards

        // Tilt elements slightly inwards towards the core, rotate to face camera somewhat
        const rotX = 15 * Math.cos(theta);
        const rotY = 25 * Math.sin(theta);
        const rotZ = 0;

        // Core elements are smaller and brighter
        const scale = 0.5 + 0.5 * (1 - t);

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        el.style.setProperty("--scatter-x", "0px");
        el.style.setProperty("--scatter-y", "0px");
        el.style.setProperty("--scatter-z", "0px");
        el.style.setProperty("--scatter-rot", "0deg");
        el.style.setProperty("--scale", scale.toFixed(2));
        return true;
      }
      if (this.isCoverflowView) {
        // Coverflow View positions
        let _totalEchoes = inactiveFiles.length;
        const middleIndex = Math.floor(totalEchoes / 2);
        const diff = index - middleIndex;

        const spacingX = 150;
        const tx = diff * spacingX;

        // Push back non-center items, scale them down, rotate them inwards
        const absDiff = Math.abs(diff);
        const tz = absDiff === 0 ? 0 : -200 - absDiff * 50;
        const rotY = diff === 0 ? 0 : diff < 0 ? 45 : -45; // Left items face right, right items face left
        const scale = 1 - absDiff * 0.1;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `0px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--scale", `${Math.max(0.3, scale)}`);
        el.style.setProperty("--z-index", `${100 - absDiff}`);

        // Reset others
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-z", "0deg");
        el.style.setProperty("--scatter-x", "0px");
        el.style.setProperty("--scatter-y", "0px");
        el.style.setProperty("--scatter-z", "0px");
        el.style.setProperty("--scatter-rot", "0deg");
        return true;
      }
      if (this.isWaveView) {
        // Wave View positions (Sine wave floating)
        let _totalEchoes = inactiveFiles.length;
        const spreadW = window.innerWidth * 1.2;
        const startX = -spreadW / 2;

        const stepX = totalEchoes > 1 ? spreadW / (totalEchoes - 1) : 0;
        const tx = startX + index * stepX;

        // Sine wave for Y
        const frequency = 2; // Number of full waves
        const amplitude = 300; // Height of wave
        const phase =
          (index / Math.max(1, totalEchoes - 1)) * Math.PI * 2 * frequency;
        const ty = Math.sin(phase) * amplitude;

        const tz = -150; // Constant depth

        // Derivative of sine is cosine, use for tangent rotation
        const rotZ = Math.cos(phase) * 30; // Max tilt 30deg

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);

        // Reset others
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        return true;
      }

      if (this.isPrismSplitView) {
        // V-shape split logic
        const side = index % 2 === 0 ? 1 : -1;
        const row = Math.floor(index / 2);

        const tx = side * (300 + row * 50);
        const ty = row * 20 - 50;
        const tz = -200 - row * 150;

        // Tilt them to face inwards
        const rotY = side * -35;
        const rotX = 10;
        const rotZ = 0;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        return true;
      }
      if (this.isPrismView) {
        // Prism View positions (Polyhedron shape)
        let _totalEchoes = inactiveFiles.length;

        // Calculate spherical coordinates for an even distribution
        const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
        const theta = Math.PI * (1 + Math.sqrt(5)) * index;

        const radius = 450;

        const tx = radius * Math.sin(phi) * Math.cos(theta);
        const ty = radius * Math.sin(phi) * Math.sin(theta);
        const tz = radius * Math.cos(phi) - 200; // Offset back

        // Orient planes to face outward from center
        const rotX = -phi * (180 / Math.PI) + 90;
        const rotY = theta * (180 / Math.PI);
        const rotZ = 0;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        return true;
      }

      if (this.isHouseOfCardsView) {
        // House of Cards View: stacked structure
        let _totalEchoes = inactiveFiles.length;

        // Build rows starting from bottom
        // Row 0 has max items, Row 1 has max-1, etc.
        let row = 0;
        let col = 0;
        let itemsInRow = 4; // Start with 4 items at the base
        let itemsCounted = 0;

        for (let i = 0; i < index; i++) {
          col++;
          if (col >= itemsInRow) {
            row++;
            col = 0;
            itemsInRow = Math.max(1, itemsInRow - 1);
          }
        }

        // Random slight offsets for realism
        const randomSeed = index * 9876.54321;
        const jitterX = (Math.sin(randomSeed) - 0.5) * 20;
        const jitterY = (Math.cos(randomSeed * 1.5) - 0.5) * 20;
        const jitterZ = (Math.sin(randomSeed * 2.5) - 0.5) * 10;
        const jitterRotZ = (Math.cos(randomSeed * 3.5) - 0.5) * 10;

        const spacingX = 220;
        const spacingY = 180;

        // Center the rows
        const startX = -((itemsInRow - 1) * spacingX) / 2;

        // Ty goes UP (negative) as row increases
        const tx = startX + col * spacingX + jitterX;
        const ty = 200 - row * spacingY + jitterY;
        const tz = -150 - row * 50 + jitterZ; // Push higher rows further back slightly

        // Slight leaning inward for stability illusion
        const rotY = tx > 0 ? -10 : tx < 0 ? 10 : 0;
        const rotX = -5; // Tilt slightly up

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${jitterRotZ}deg`);
        return true;
      }

if (this.isChronoRingView) {
        // Multi-layered clockface arrangement
        const total = Math.max(1, inactiveFiles.length);
        const layers = Math.ceil(total / 12); // Max 12 docs per ring
        const docsPerRing = Math.min(12, total);
        const layerIndex = Math.floor(index / docsPerRing);
        const ringIndex = index % docsPerRing;

        const angle = (ringIndex / docsPerRing) * Math.PI * 2;
        const radius = 300 + (layerIndex * 150); // Rings expand outward

        const tx = Math.cos(angle - Math.PI / 2) * radius;
        const ty = Math.sin(angle - Math.PI / 2) * radius;
        // Layers go backward in Z
        const tz = layerIndex * -300 - 200;

        // Face outward relative to center
        const rotZ = (angle * 180 / Math.PI);

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `0deg`);
        el.style.setProperty("--rot-y", `0deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);

        return true;
      }
      if (this.isTimeTunnelView) {
        // Time Tunnel View
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const zStep = -300; // How deep each layer goes
        const tz = index * zStep;

        // Arrange them into left, top, right, bottom walls
        const wallIndex = index % 4;
        const offset = 400; // Tunnel radius

        let tx = 0;
        let ty = 0;
        let rotY = 0;
        let rotX = 0;

        if (wallIndex === 0) {
          // Left wall
          tx = -offset;
          rotY = 90;
        } else if (wallIndex === 1) {
          // Top wall
          ty = -offset;
          rotX = -90;
        } else if (wallIndex === 2) {
          // Right wall
          tx = offset;
          rotY = -90;
        } else if (wallIndex === 3) {
          // Bottom wall
          ty = offset;
          rotX = 90;
        }

        // Add a slight spin/twist to the tunnel over depth
        const rotZ = index * 5;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);

        // Reset scale and scatter
        el.style.setProperty("--scale", "1");
        el.style.setProperty("--scatter-x", "0px");
        el.style.setProperty("--scatter-y", "0px");
        el.style.setProperty("--scatter-z", "0px");
        el.style.setProperty("--scatter-rot", "0deg");
        return true;
      }
      if (this.isCyberCortexView) {
        // Brain-like cluster / spherical node map
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
        const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5);

        const radius = 500;
        const tx = radius * Math.sin(phi) * Math.cos(theta);
        const ty = radius * Math.sin(phi) * Math.sin(theta);
        const tz = radius * Math.cos(phi) - 200;

        // Add some organic jitter
        const rotX = Math.sin(index * 13) * 30;
        const rotY = Math.cos(index * 17) * 30;
        const rotZ = Math.sin(index * 19) * 30;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        return true;
      }
      if (this.isOrigamiView) {
        // Origami spatial view calculation
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const foldAngle = 35; // degrees for each fold
        const spacing = 180;

        // Alternating folds
        const direction = index % 2 === 0 ? 1 : -1;
        const tx = (index - totalEchoes / 2) * spacing;
        const ty = (index % 3) * 60 - 60; // stagger y
        const tz = Math.abs(index - totalEchoes / 2) * -150 - 200; // V-shape depth
        const rotY = direction * foldAngle;
        const rotZ = direction * 5;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        el.style.setProperty("--scatter-x", "0px");
        el.style.setProperty("--scatter-y", "0px");
        el.style.setProperty("--scatter-z", "0px");
        el.style.setProperty("--scatter-rot", "0deg");
        return true;
      }
      if (this.isDataHiveView) {
        // Data Hive View: Hexagonal grid arrangement
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const cols = Math.ceil(Math.sqrt(totalEchoes));
        const hexWidth = 240;
        const hexHeight = 200;

        const col = index % cols;
        const row = Math.floor(index / cols);

        // Stagger rows for hexagonal tiling
        const xOffset = row % 2 === 1 ? hexWidth / 2 : 0;
        const tx = (col - cols / 2) * hexWidth + xOffset;
        const ty = (row - cols / 2) * hexHeight;
        const tz = -400 - row * 50; // Slight slant backward

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        return true;
      }
      if (this.isCrystalView) {
        // Crystal Lattice View: 3D Grid Arrangement
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const size = Math.ceil(Math.cbrt(totalEchoes)); // Cube root for 3D grid
        const spacing = 350; // Spacing between nodes

        const zLayer = Math.floor(index / (size * size));
        const rem = index % (size * size);
        const yLayer = Math.floor(rem / size);
        const xLayer = rem % size;

        const tx = (xLayer - size / 2) * spacing;
        const ty = (yLayer - size / 2) * spacing;
        const tz = -600 - zLayer * spacing;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        el.style.setProperty("--rot-z", "0deg");
        return true;
      }
      if (this.isNeonSynthView) {
        // Neon Synth View: Retro-futuristic grid highway stretching backwards
        const laneWidth = 400;
        const zSpacing = 300;
        // Alternate between left and right lanes
        const isLeftLane = index % 2 === 0;
        const tx = isLeftLane ? -laneWidth / 2 : laneWidth / 2;
        // Position at the bottom to form the 'highway' feel
        const ty = 300;
        const tz = -index * zSpacing;

        // Tilt backwards to lay flat like a road
        const rotX = 70;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", "0deg");
        el.style.setProperty("--rot-z", "0deg");
        return true;
      }
      if (this.isCycloneView) {
        // Cyclone View: Funnel-like spiral with decreasing radius based on depth index
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const angleStep = 45; // Degrees per document

        const angleDeg = index * angleStep;
        const angleRad = (angleDeg * Math.PI) / 180;

        // Base radius is wide at top (index 0), narrow at bottom
        const radius = 600 - index * (400 / totalEchoes);

        const tx = Math.sin(angleRad) * radius;
        const tz = Math.cos(angleRad) * radius - 400; // Push back slightly
        const ty = index * 80 - totalEchoes * 40; // Spiral vertically

        // Tilt elements slightly upwards to face the viewer from the funnel
        const rotX = 15;
        const rotY = angleDeg; // Face inward

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `0deg`);

        return true;
      }
      if (this.isGalaxyView) {
        // Galaxy Spiral View: Logarithmic spiral arrangement on X-Z plane
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const spiralRotations = 3; // How many times the arms wrap
        const maxRadius = 1500;

        // Progress along the spiral (0 at center, 1 at edge)
        const t = index / totalEchoes;

        // Logarithmic scaling for tighter clustering at the core
        const r = maxRadius * Math.pow(t, 0.7);
        const theta = t * Math.PI * 2 * spiralRotations;

        // Two spiral arms offset by PI
        const armOffset = index % 2 === 0 ? 0 : Math.PI;

        const tx = r * Math.cos(theta + armOffset);
        // Add slight vertical variation
        const ty = (Math.random() - 0.5) * 200 * t;
        const tz = r * Math.sin(theta + armOffset) - 600; // Shift galaxy backwards

        // Tilt elements slightly inwards towards the core, rotate to face camera somewhat
        const rotX = 15 * Math.cos(theta);
        const rotY = 25 * Math.sin(theta);
        const rotZ = 0;

        // Core elements are smaller and brighter
        const scale = 0.5 + 0.5 * (1 - t);

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        el.style.setProperty("--scatter-x", "0px");
        el.style.setProperty("--scatter-y", "0px");
        el.style.setProperty("--scatter-z", "0px");
        el.style.setProperty("--scatter-rot", "0deg");
        el.style.setProperty("--scale", scale.toFixed(2));
        return true;
      }
      if (this.isCoverflowView) {
        // Coverflow View positions
        let _totalEchoes = inactiveFiles.length;
        const middleIndex = Math.floor(totalEchoes / 2);
        const diff = index - middleIndex;

        const spacingX = 150;
        const tx = diff * spacingX;

        // Push back non-center items, scale them down, rotate them inwards
        const absDiff = Math.abs(diff);
        const tz = absDiff === 0 ? 0 : -200 - absDiff * 50;
        const rotY = diff === 0 ? 0 : diff < 0 ? 45 : -45; // Left items face right, right items face left
        const scale = 1 - absDiff * 0.1;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `0px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--scale", `${Math.max(0.3, scale)}`);
        el.style.setProperty("--z-index", `${100 - absDiff}`);

        // Reset others
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-z", "0deg");
        el.style.setProperty("--scatter-x", "0px");
        el.style.setProperty("--scatter-y", "0px");
        el.style.setProperty("--scatter-z", "0px");
        el.style.setProperty("--scatter-rot", "0deg");
        return true;
      }
      if (this.isWaveView) {
        // Wave View positions (Sine wave floating)
        let _totalEchoes = inactiveFiles.length;
        const spreadW = window.innerWidth * 1.2;
        const startX = -spreadW / 2;

        const stepX = totalEchoes > 1 ? spreadW / (totalEchoes - 1) : 0;
        const tx = startX + index * stepX;

        // Sine wave for Y
        const frequency = 2; // Number of full waves
        const amplitude = 300; // Height of wave
        const phase =
          (index / Math.max(1, totalEchoes - 1)) * Math.PI * 2 * frequency;
        const ty = Math.sin(phase) * amplitude;

        const tz = -150; // Constant depth

        // Derivative of sine is cosine, use for tangent rotation
        const rotZ = Math.cos(phase) * 30; // Max tilt 30deg

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);

        // Reset others
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        return true;
      }

      if (this.isPrismSplitView) {
        // V-shape split logic
        const side = index % 2 === 0 ? 1 : -1;
        const row = Math.floor(index / 2);

        const tx = side * (300 + row * 50);
        const ty = row * 20 - 50;
        const tz = -200 - row * 150;

        // Tilt them to face inwards
        const rotY = side * -35;
        const rotX = 10;
        const rotZ = 0;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        return true;
      }
      if (this.isPrismView) {
        // Prism View positions (Polyhedron shape)
        let _totalEchoes = inactiveFiles.length;

        // Calculate spherical coordinates for an even distribution
        const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
        const theta = Math.PI * (1 + Math.sqrt(5)) * index;

        const radius = 450;

        const tx = radius * Math.sin(phi) * Math.cos(theta);
        const ty = radius * Math.sin(phi) * Math.sin(theta);
        const tz = radius * Math.cos(phi) - 200; // Offset back

        // Orient planes to face outward from center
        const rotX = -phi * (180 / Math.PI) + 90;
        const rotY = theta * (180 / Math.PI);
        const rotZ = 0;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        return true;
      }
    return false;
  },
  _applyLayoutChunk4(el, index, totalEchoes, file, inactiveFiles, activeFile) {
if (this.isStackDeckView) {
        // Stack Deck View positions
        const spacingY = 40;
        const spacingZ = 15;

        el.style.setProperty("--tx", `0px`);
        el.style.setProperty("--ty", `${index * spacingY}px`);
        el.style.setProperty("--tz", `${-index * spacingZ}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        el.style.setProperty("--rot-z", "0deg");
        return true;
      }
      if (this.isScatteredView) {
        // Scattered View positions
        let _totalEchoes = inactiveFiles.length;

        // Use a simple pseudo-random function based on index
        const randomSeed = index * 12345.6789;
        const randX = Math.sin(randomSeed) * 0.5 + 0.5; // 0 to 1
        const randY = Math.cos(randomSeed * 1.5) * 0.5 + 0.5; // 0 to 1

        const spreadW = window.innerWidth * 0.8;
        const spreadH = window.innerHeight * 0.8;

        const sx = randX * spreadW - spreadW / 2;
        const sy = randY * spreadH - spreadH / 2;

        // Further back ones are smaller/further
        const sz = -100 - index * 80;
        const rotZ = Math.sin(randomSeed * 2) * 20; // -20deg to 20deg

        el.style.setProperty("--scatter-x", `${sx}px`);
        el.style.setProperty("--scatter-y", `${sy}px`);
        el.style.setProperty("--scatter-z", `${sz}px`);
        el.style.setProperty("--scatter-rot", `${rotZ}deg`);

        // Remove standard offsets
        el.style.setProperty("--tx", `0px`);
        el.style.setProperty("--ty", `0px`);
        el.style.setProperty("--tz", `0px`);
        return true;
      }
      if (this.isBlackHoleView) {
        // Black Hole View positions
        const angle = (index * Math.PI) / 4;
        const radius = Math.max(0, 200 - index * 20);

        el.style.setProperty("--tx", `${Math.cos(angle) * radius}px`);
        el.style.setProperty("--ty", `${Math.sin(angle) * radius}px`);
        el.style.setProperty("--tz", `${-100 - index * 50}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        el.style.setProperty("--rot-z", `${index * 15}deg`);
        return true;
      }
      if (this.isRolodexView) {
        // Rolodex View: revolving file cabinet cylinder
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const angle = (index / totalEchoes) * Math.PI * 2;
        const radius = 600;

        const tx = 0;
        const ty = Math.sin(angle) * radius;
        const tz = Math.cos(angle) * radius - 200; // offset back

        // Orient planes facing outward
        const rotX = -((angle * 180) / Math.PI);
        const rotY = 0;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", "0deg");
        el.style.setProperty("--scatter-x", "0px");
        el.style.setProperty("--scatter-y", "0px");
        el.style.setProperty("--scatter-z", "0px");
        el.style.setProperty("--scatter-rot", "0deg");
        return true;
      }

      if (this.isHouseOfCardsView) {
        // House of Cards View: stacked structure
        let _totalEchoes = inactiveFiles.length;

        // Build rows starting from bottom
        // Row 0 has max items, Row 1 has max-1, etc.
        let row = 0;
        let col = 0;
        let itemsInRow = 4; // Start with 4 items at the base
        let itemsCounted = 0;

        for (let i = 0; i < index; i++) {
          col++;
          if (col >= itemsInRow) {
            row++;
            col = 0;
            itemsInRow = Math.max(1, itemsInRow - 1);
          }
        }

        // Random slight offsets for realism
        const randomSeed = index * 9876.54321;
        const jitterX = (Math.sin(randomSeed) - 0.5) * 20;
        const jitterY = (Math.cos(randomSeed * 1.5) - 0.5) * 20;
        const jitterZ = (Math.sin(randomSeed * 2.5) - 0.5) * 10;
        const jitterRotZ = (Math.cos(randomSeed * 3.5) - 0.5) * 10;

        const spacingX = 220;
        const spacingY = 180;

        // Center the rows
        const startX = -((itemsInRow - 1) * spacingX) / 2;

        // Ty goes UP (negative) as row increases
        const tx = startX + col * spacingX + jitterX;
        const ty = 200 - row * spacingY + jitterY;
        const tz = -150 - row * 50 + jitterZ; // Push higher rows further back slightly

        // Slight leaning inward for stability illusion
        const rotY = tx > 0 ? -10 : tx < 0 ? 10 : 0;
        const rotX = -5; // Tilt slightly up

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `${jitterRotZ}deg`);
        return true;
      }

if (this.isFloatingNexusView) {
        const total = Math.max(1, inactiveFiles.length);
        const radius = Math.max(400, total * 60);

        // Calculate a spiral or layered hexagon orbit
        const goldenRatio = 1.61803398875;
        const angle = index * Math.PI * 2 * goldenRatio;

        // As index grows, push slightly back and out
        const currentRadius = radius + (index * 15);

        const tx = Math.cos(angle) * currentRadius;
        const ty = Math.sin(angle) * currentRadius;

        // Stagger in Z to avoid perfect overlapping
        const tz = -200 - (index * 40);

        // Rotate slightly to face the user or slightly off-center
        const rotX = (ty / 20);
        const rotY = -(tx / 20);

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `0deg`);

        // Save base transform for magnetic fluid interaction
        const transformString = `translate3d(${tx}px, ${ty}px, ${tz}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(0deg)`;
        el.setAttribute('data-base-transform', transformString);
        return true;
      }
      if (this.isScatteredView) {
        // Scattered View positions
        let _totalEchoes = inactiveFiles.length;

        // Use a simple pseudo-random function based on index
        const randomSeed = index * 12345.6789;
        const randX = Math.sin(randomSeed) * 0.5 + 0.5; // 0 to 1
        const randY = Math.cos(randomSeed * 1.5) * 0.5 + 0.5; // 0 to 1

        const spreadW = window.innerWidth * 0.8;
        const spreadH = window.innerHeight * 0.8;

        const sx = randX * spreadW - spreadW / 2;
        const sy = randY * spreadH - spreadH / 2;

        // Further back ones are smaller/further
        const sz = -100 - index * 80;
        const rotZ = Math.sin(randomSeed * 2) * 20; // -20deg to 20deg

        el.style.setProperty("--scatter-x", `${sx}px`);
        el.style.setProperty("--scatter-y", `${sy}px`);
        el.style.setProperty("--scatter-z", `${sz}px`);
        el.style.setProperty("--scatter-rot", `${rotZ}deg`);

        // Remove standard offsets
        el.style.setProperty("--tx", `0px`);
        el.style.setProperty("--ty", `0px`);
        el.style.setProperty("--tz", `0px`);
        return true;
      }
      if (this.isBlackHoleView) {
        // Black Hole View positions
        const angle = (index * Math.PI) / 4;
        const radius = Math.max(0, 200 - index * 20);

        el.style.setProperty("--tx", `${Math.cos(angle) * radius}px`);
        el.style.setProperty("--ty", `${Math.sin(angle) * radius}px`);
        el.style.setProperty("--tz", `${-100 - index * 50}px`);
        el.style.setProperty("--rot-x", "0deg");
        el.style.setProperty("--rot-y", "0deg");
        el.style.setProperty("--rot-z", `${index * 15}deg`);
        return true;
      }
      if (this.isRolodexView) {
        // Rolodex View: revolving file cabinet cylinder
        const totalEchoes = Math.max(1, inactiveFiles.length);
        const angle = (index / totalEchoes) * Math.PI * 2;
        const radius = 600;

        const tx = 0;
        const ty = Math.sin(angle) * radius;
        const tz = Math.cos(angle) * radius - 200; // offset back

        // Orient planes facing outward
        const rotX = -((angle * 180) / Math.PI);
        const rotY = 0;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${rotX}deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", "0deg");
        el.style.setProperty("--scatter-x", "0px");
        el.style.setProperty("--scatter-y", "0px");
        el.style.setProperty("--scatter-z", "0px");
        el.style.setProperty("--scatter-rot", "0deg");
        return true;
      }
    return false;
  },
};
