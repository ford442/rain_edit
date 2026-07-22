import StorageAPI from "./StorageAPI.js";
import { storageAPI, TOAST_DISPLAY_DURATION, DEPTH_Z_INDEX, DEPTH_ICONS, DEPTH_TITLES, _extractSymbols, _symbolKindIcon } from './TabManager.js';
export const TabManagerMixin7 = {
  _applyLayoutChunk3(el, index, totalEchoes, file, inactiveFiles, activeFile) {
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
