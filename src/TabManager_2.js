import StorageAPI from "./StorageAPI.js";
import { storageAPI, TOAST_DISPLAY_DURATION, DEPTH_Z_INDEX, DEPTH_ICONS, DEPTH_TITLES, _extractSymbols, _symbolKindIcon } from './TabManager.js';
export const TabManagerMixin2 = {
  _applyLayoutChunk0(el, index, totalEchoes, file, inactiveFiles, activeFile) {
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
            const angle = (index * ANGLE_STEP) + scrollOffset;

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
};
