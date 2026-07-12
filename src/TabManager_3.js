import StorageAPI from "./StorageAPI.js";
import { storageAPI, TOAST_DISPLAY_DURATION, DEPTH_Z_INDEX, DEPTH_ICONS, DEPTH_TITLES, _extractSymbols, _symbolKindIcon } from './TabManager.js';
export const TabManagerMixin3 = {
  _applyLayoutChunk2(el, index, totalEchoes, file, inactiveFiles, activeFile) {

      if (this.isDnaHelixView) {
        const theta = index * Math.PI / 4;
        const yOffset = (index - totalEchoes / 2) * 60;

        // Alternate strands
        const strandOffset = index % 2 === 0 ? 0 : Math.PI;

        const radius = 300;

        const tx = radius * Math.cos(theta + strandOffset);
        const ty = yOffset;
        const tz = radius * Math.sin(theta + strandOffset) - 200;

        const rotY = -(theta + strandOffset) * (180 / Math.PI) + 90;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `0deg`);
        el.style.setProperty("--rot-y", `${rotY}deg`);
        el.style.setProperty("--rot-z", `0deg`);
        return true;
      }

      if (this.isStackDeckView) {
        // Stack Deck View: vertically overlapping cards like a deck
        const yOffset = index * 40;
        const zOffset = -index * 5;

        el.style.setProperty("--tx", `0px`);
        el.style.setProperty("--ty", `${yOffset}px`);
        el.style.setProperty("--tz", `${zOffset}px`);
        el.style.setProperty("--rot-x", `0deg`);
        el.style.setProperty("--rot-y", `0deg`);
        el.style.setProperty("--rot-z", `0deg`);
      }
      if (this.isCardSpreadView) {
        // Card Spread View: arched overlapping cards
        const total = totalEchoes || 1;
        // Center the spread
        const offsetIndex = index - (total - 1) / 2;

        // Spread angle (total span ~60 degrees)
        const angleDeg = offsetIndex * (60 / total);
        const angleRad = (angleDeg * Math.PI) / 180;

        const radius = 600;

        const tx = Math.sin(angleRad) * radius;
        const ty = radius - Math.cos(angleRad) * radius + (index * 5); // Slight vertical drop
        const tz = -index * 20 - 50; // Push back slightly to show overlap
        const rotZ = angleDeg;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `5deg`); // Slight tilt back
        el.style.setProperty("--rot-y", `0deg`);
        el.style.setProperty("--rot-z", `${rotZ}deg`);
        return true;
      }
      if (this.isAuroraView) {
        // Aurora View: undulating sine wave in 3D space
        const spreadX = 250;
        const spreadY = 100;
        const tx = Math.sin(index * 0.6) * spreadX;
        const ty = Math.cos(index * 0.4) * spreadY - 50;
        const tz = -index * 120;

        el.style.setProperty("--tx", `${tx}px`);
        el.style.setProperty("--ty", `${ty}px`);
        el.style.setProperty("--tz", `${tz}px`);
        el.style.setProperty("--rot-x", `${Math.sin(index * 0.3) * 15}deg`);
        el.style.setProperty("--rot-y", `${Math.cos(index * 0.5) * 20}deg`);
        el.style.setProperty("--rot-z", "0deg");
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
    return false;
  },
};
