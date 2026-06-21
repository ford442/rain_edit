import StorageAPI from "./StorageAPI.js";
import { storageAPI, TOAST_DISPLAY_DURATION, DEPTH_Z_INDEX, DEPTH_ICONS, DEPTH_TITLES, _extractSymbols, _symbolKindIcon } from './TabManager.js';
export const TabManagerMixin5 = {
  _bindEchoEvents(el, file, index, totalEchoes, inactiveFiles, activeFile, header, content, outlineList, activeExt, activeLang) {
      el.addEventListener("mouseenter", () => {
        el.classList.add("glitch-active");
        setTimeout(() => el.classList.remove("glitch-active"), 300); // Glitch duration
      });

      // Echo Pulse Focus (on double click)
      el.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        // Apply pulse to clicked document immediately
        el.classList.add("echo-pulse");
        setTimeout(() => el.classList.remove("echo-pulse"), 1500);

        // Get center coordinates of clicked document
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Propagate pulse to other documents based on distance
        const otherEchoes = Array.from(
          this.echoLayerEl.querySelectorAll(".echo-document"),
        ).filter((doc) => doc !== el);

        otherEchoes.forEach((doc) => {
          const docRect = doc.getBoundingClientRect();
          const docCenterX = docRect.left + docRect.width / 2;
          const docCenterY = docRect.top + docRect.height / 2;

          const dx = docCenterX - centerX;
          const dy = docCenterY - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Delay based on distance (speed of ripple)
          const delay = distance * 0.5; // adjust multiplier for speed

          setTimeout(() => {
            doc.classList.add("echo-pulse");
            setTimeout(() => doc.classList.remove("echo-pulse"), 1500);
          }, delay);
        });
      });

      // Calculate Exploded Orbit View variables
      let _totalEchoes = inactiveFiles.length;
      if (totalEchoes > 0) {
        const angle = (index / totalEchoes) * Math.PI * 2;
        const radius = 300; // Orbit radius
        const explodeX = Math.cos(angle) * radius;
        const explodeY = Math.sin(angle) * radius;
        el.style.setProperty("--explode-x", `${explodeX}px`);
        el.style.setProperty("--explode-y", `${explodeY}px`);

        // Expose Mode (Grid view) coordinates
        const cols = Math.ceil(Math.sqrt(totalEchoes));
        const rows = Math.ceil(totalEchoes / cols);

        const col = index % cols;
        const row = Math.floor(index / cols);

        const exposeW = window.innerWidth * 0.7; // Spread width
        const exposeH = window.innerHeight * 0.7; // Spread height

        const spacingX = cols > 1 ? exposeW / (cols - 1) : 0;
        const spacingY = rows > 1 ? exposeH / (rows - 1) : 0;

        const offsetX = -exposeW / 2;
        const offsetY = -exposeH / 2;

        const exposeX = offsetX + col * spacingX;
        const exposeY = offsetY + row * spacingY;

        el.style.setProperty("--expose-tx", `${exposeX}px`);
        el.style.setProperty("--expose-ty", `${exposeY}px`);
      }

      if (this._applyLayoutChunk0(el, index, totalEchoes, file, inactiveFiles, activeFile) || this._applyLayoutChunk1(el, index, totalEchoes, file, inactiveFiles, activeFile) || this._applyLayoutChunk2(el, index, totalEchoes, file, inactiveFiles, activeFile) || this._applyLayoutChunk3(el, index, totalEchoes, file, inactiveFiles, activeFile) || this._applyLayoutChunk4(el, index, totalEchoes, file, inactiveFiles, activeFile)) {
        // handled
      } else {
        // Original Parallax depth offsets
        const depthOffset = (index + 1) * 2;
        // tx/ty will be overwritten by mousemove, but we set initial values here
        el.style.setProperty("--tx", `${depthOffset * 2}px`);
        el.style.setProperty("--ty", `${depthOffset * 2}px`);
        // Add var(--stack-z) for the MRI scroll effect
        el.style.setProperty(
          "--tz",
          `calc(-${index * 50}px + var(--stack-z, 0px))`,
        );

        // Glitch distant echoes
        if (index > 2) {
          el.classList.add("distant-echo");
        }
      }

      let clickTimeout = null;

      // Add context menu (right click) for Holographic Side-by-Side Projection
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isProjected = el.classList.contains("holo-projected");

        // Remove from all other echoes
        this.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
          doc.classList.remove("holo-projected");
        });

        if (!isProjected) {
          el.classList.add("holo-projected");
        }
      });

      // Add double click listener to break through the active document
      el.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        if (clickTimeout) {
          clearTimeout(clickTimeout);
          clickTimeout = null;
        }
        const isBreakthrough = el.classList.contains("breakthrough");
        // Remove breakthrough from all other echoes
        this.echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
          doc.classList.remove("breakthrough");
        });
        if (!isBreakthrough) {
          el.classList.add("breakthrough");
        }
      });

      // Add click listener to switch to this document
      // We use a small timeout to distinguish single click from double click,
      // preventing the active document from switching when the user is trying to double click.
      el.addEventListener("click", (e) => {
        // Magnetic Align: Shift + Click
        if (e.shiftKey) {
          e.stopPropagation();
          el.classList.toggle("magnetic-align-active");
          return;
        }

        if (e.detail === 1) {
          // If in Tesseract view, exit view and switch immediately
          if (document.body.classList.contains("tesseract-active")) {
            const viewSelect = document.getElementById("view-mode-select");
            if (viewSelect) viewSelect.value = "";
            this._deactivateAllViews();
            this.setActive(file.id);
            return;
          }

          // --- Layer Peeling / Page Turn Interaction ---
          // Synthesize a short "paper rustle/whoosh" sound using Web Audio API
          try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') {
              audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            // White noise burst simulation (paper-like whoosh)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);

            filter.type = 'highpass';
            filter.frequency.value = 1000;

            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
          } catch (err) {
            console.error("Audio playback failed:", err);
          }

          // Target document styling (the one being clicked/bringing forward)
          el.classList.add("peel-target");

          // Select foreground elements (editor + echoes with lower index = in front in the stack)
          const editorEl = this.editorEl || document.getElementById("editor");
          if (editorEl) editorEl.classList.add("peel-away");

          const targetDepthIndex = index;
          const allEchoes = document.querySelectorAll(".echo-document");
          const peelEchoes = [];
          allEchoes.forEach((echo) => {
            const echoIndex = parseInt(echo.dataset.index, 10);
            if (!isNaN(echoIndex) && echoIndex < targetDepthIndex) {
              echo.classList.add("peel-away");
              peelEchoes.push(echo);
            }
          });

          // Also add Kaleidoscope Effect just for extra visual flair
          el.classList.add("kaleidoscope-fx");

          clickTimeout = setTimeout(() => {
            this.setActive(file.id);
            el.classList.remove("kaleidoscope-fx"); // clean up
            el.classList.remove("peel-target");
            if (editorEl) editorEl.classList.remove("peel-away");
            peelEchoes.forEach(echo => echo.classList.remove("peel-away"));
            clickTimeout = null;
          }, 800); // Wait for the peel animation to complete
        }
      });

      // Add sci-fi glass pane identifier styling to the existing header
      header.style.position = "absolute";
      header.style.top = "0";
      header.style.left = "0";
      header.style.width = "100%";
      header.style.padding = "8px 16px";
      header.style.background = "rgba(0, 229, 255, 0.1)";
      header.style.borderBottom = "1px solid rgba(0, 229, 255, 0.2)";
      header.style.fontWeight = "bold";
      header.style.letterSpacing = "1px";
      header.style.textTransform = "uppercase";
      header.style.transform = "translateZ(30px)";
      header.style.boxShadow = "0 10px 20px rgba(0,0,0,0.5)";

      const bodyWrapper = el.querySelector(".echo-body-wrapper");
      if (bodyWrapper) {
        bodyWrapper.style.marginTop = "40px"; // Offset for header
        bodyWrapper.style.height = "calc(100% - 40px)";
      }

      // Interactive 3D Card Hover Effect
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // -1 to 1 based on position from center
        const normX = (localX - centerX) / centerX;
        const normY = (localY - centerY) / centerY;

        // Max tilt 15 degrees
        const rotX = -normY * 15;
        const rotY = normX * 15;

        el.style.setProperty("--hover-rot-x", `${rotX}deg`);
        el.style.setProperty("--hover-rot-y", `${rotY}deg`);

        // Set local mouse variables for glossy reflection
        const pctX = (localX / rect.width) * 100;
        const pctY = (localY / rect.height) * 100;
        el.style.setProperty("--mouse-local-x", `${pctX}%`);
        el.style.setProperty("--mouse-local-y", `${pctY}%`);
      });

      // Add hover listener to fade editor
      el.addEventListener("mouseenter", (e) => {
        if (this.editorEl) {
          this.editorEl.classList.add("editor-peek-fade");
          // Bring forward while hovering the doc itself
          if (
            !this.isCascadeView &&
            !this.isOrbitView &&
            !this.isScatteredView &&
            !this.isHelixView &&
            !this.isPinboardView &&
            !this.isVortexView &&
            !this.isPrismView &&
            !this.isCoverflowView &&
            !this.isWaveView &&
            !this.isSphereView &&
            !this.isRolodexView &&
            !this.isCylinderView &&
            !this.isMatrixRainView &&
            !this.isNeonSynthView &&
            !this.isBlueprint3dView &&
            !this.isCyberCortexView &&
            !this.isAccordionView
          ) {
            el.style.setProperty("--tz", "100px");
          } else if (this.isOrbitView) {
            // Push out slightly to emphasize selection in orbit view
            const tEchoes = inactiveFiles.length;
            const oRad = Math.max(500, tEchoes * 120);
            el.style.setProperty("--orbit-tz", `${oRad + 100}px`);
          } else if (this.isScatteredView) {
            // Bring forward slightly in scattered view
            const originalZ = parseFloat(
              el.style.getPropertyValue("--scatter-z") || "0",
            );
            el.style.setProperty("--scatter-z", `${originalZ + 150}px`);
          } else if (
            this.isPinboardView ||
            this.isHelixView ||
            this.isVortexView ||
            this.isPrismView ||
            this.isWaveView ||
            this.isSphereView ||
            this.isRolodexView ||
            this.isCylinderView ||
            this.isMatrixRainView ||
            this.isFractalView ||
            this.isNeonSynthView ||
            this.isBlueprint3dView ||
            this.isCyberCortexView ||
            this.isArchwayView
          ) {
            // Pop out for pinboard/helix/vortex/prism/wave/rolodex/cylinder/fractal/neon-synth
            const tz = parseFloat(el.style.getPropertyValue("--tz")) || 0;
            el.style.setProperty("--tz", `${tz + 150}px`);
            if (this.isPinboardView || this.isVortexView) {
              el.style.setProperty("--rot-z", "0deg");
            }
          }
          // Focus Spotlight: Dispatch event to heavily clear fog and rain when peeking
          const rect = el.getBoundingClientRect();
          const evt = new CustomEvent("echo-peek", {
            detail: {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              radius: Math.max(rect.width, rect.height) / 1.5,
              isFocusSpotlight: true,
            },
          });
          document.dispatchEvent(evt);
        }
      });

      el.addEventListener("mouseleave", () => {
        // Reset 3D tilt
        el.style.setProperty("--hover-rot-x", `0deg`);
        el.style.setProperty("--hover-rot-y", `0deg`);

        if (this.editorEl) {
          this.editorEl.classList.remove("editor-peek-fade");
          // Restore Z
          if (this.isOrbitView) {
            const tEchoes = inactiveFiles.length;
            const oRad = Math.max(500, tEchoes * 120);
            el.style.setProperty("--orbit-tz", `${oRad}px`);
          } else if (this.isScatteredView) {
            // Restore scatter Z
            const index = parseInt(el.dataset.index || 0);
            const sz = -100 - index * 80;
            el.style.setProperty("--scatter-z", `${sz}px`);
          } else if (this.isVortexView) {
            const inactiveFiles = this.files.filter(
              (f) => f.id !== this.activeId,
            );
            let _totalEchoes = inactiveFiles.length;
            const index = parseInt(el.dataset.index || 0);
            const indexRatio = index / Math.max(1, totalEchoes - 1);
            const radius = 200 + index * 40;
            const angle = indexRatio * Math.PI * 2 * 4;
            const tz = -index * 120 - 100;
            const rotZ = (angle * 180) / Math.PI + 90;
            el.style.setProperty("--tz", `${tz}px`);
            el.style.setProperty("--rot-z", `${rotZ}deg`);
          } else if (this.isPinboardView) {
            const index = parseInt(el.dataset.index || 0);
            const tz = -150 + Math.sin(index * 789) * 50;
            const rotZ = Math.sin(index * 111) * 15;
            el.style.setProperty("--tz", `${tz}px`);
            el.style.setProperty("--rot-z", `${rotZ}deg`);
          } else if (this.isHelixView) {
            const inactiveFiles = this.files.filter(
              (f) => f.id !== this.activeId,
            );
            let _totalEchoes = inactiveFiles.length;
            const index = parseInt(el.dataset.index || 0);
            const indexRatio = index / Math.max(1, totalEchoes - 1);
            const radius = 300;
            const cycles = 2;
            const angle = indexRatio * Math.PI * 2 * cycles;
            const tz = Math.sin(angle) * radius - 200;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isPrismView) {
            const inactiveFiles = this.files.filter(
              (f) => f.id !== this.activeId,
            );
            let _totalEchoes = inactiveFiles.length;
            const index = parseInt(el.dataset.index || 0);
            const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
            const radius = 450;
            const tz = radius * Math.cos(phi) - 200;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isSphereView) {
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
          } else if (this.isCoverflowView) {
            const inactiveFiles = this.files.filter(
              (f) => f.id !== this.activeId,
            );
            let _totalEchoes = inactiveFiles.length;
            const index = parseInt(el.dataset.index || 0);
            const middleIndex = Math.floor(totalEchoes / 2);
            const diff = index - middleIndex;
            const absDiff = Math.abs(diff);
            const tz = absDiff === 0 ? 0 : -200 - absDiff * 50;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isSphereView) {
            const inactiveFiles = this.files.filter(
              (f) => f.id !== this.activeId,
            );
            const totalEchoes = Math.max(1, inactiveFiles.length);
            const index = parseInt(el.dataset.index || 0);
            const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
            const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5);
            const radius = 600;
            const tz = radius * Math.cos(phi) - 200;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isRolodexView) {
            const inactiveFiles = this.files.filter(
              (f) => f.id !== this.activeId,
            );
            const totalEchoes = Math.max(1, inactiveFiles.length);
            const index = parseInt(el.dataset.index || 0);
            const angle = (index / totalEchoes) * Math.PI * 2;
            const radius = 600;
            const tz = Math.cos(angle) * radius - 200;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isCylinderView) {
            const inactiveFiles = this.files.filter(
              (f) => f.id !== this.activeId,
            );
            const totalEchoes = Math.max(1, inactiveFiles.length);
            const index = parseInt(el.dataset.index || 0);
            const angle = (index / totalEchoes) * Math.PI * 2;
            const radius = 600;
            const tz = Math.cos(angle) * radius - 200;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isSolarSystemView) {
            // In hover out, we just need to make sure we don't clobber the animation properties
            // We'll set a base tz. The orbit animation handles the rest.
            el.style.setProperty("--tz", `-200px`);
          } else if (this.isOrigamiView) {
            const inactiveFiles = this.files.filter(
              (f) => f.id !== this.activeId,
            );
            const totalEchoes = Math.max(1, inactiveFiles.length);
            const index = parseInt(el.dataset.index || 0);
            const tz = Math.abs(index - totalEchoes / 2) * -150 - 200;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isCycloneView) {
            const inactiveFiles = this.files.filter(
              (f) => f.id !== this.activeId,
            );
            const totalEchoes = Math.max(1, inactiveFiles.length);
            const index = parseInt(el.dataset.index || 0);
            const angleDeg = index * 45;
            const angleRad = (angleDeg * Math.PI) / 180;
            const radius = 600 - index * (400 / totalEchoes);
            const tz = Math.cos(angleRad) * radius - 400;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isGalaxyView) {
            const inactiveFiles = this.files.filter(
              (f) => f.id !== this.activeId,
            );
            const totalEchoes = Math.max(1, inactiveFiles.length);
            const index = parseInt(el.dataset.index || 0);
            const maxRadius = 1500;
            const spiralRotations = 3;
            const t = index / totalEchoes;
            const r = maxRadius * Math.pow(t, 0.7);
            const theta = t * Math.PI * 2 * spiralRotations;
            const armOffset = index % 2 === 0 ? 0 : Math.PI;
            const tz = r * Math.sin(theta + armOffset) - 600;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isDataHiveView) {
            const inactiveFiles = this.files.filter(
              (f) => f.id !== this.activeId,
            );
            const totalEchoes = Math.max(1, inactiveFiles.length);
            const cols = Math.ceil(Math.sqrt(totalEchoes));
            const index = parseInt(el.dataset.index || 0);
            const row = Math.floor(index / cols);
            const tz = -400 - row * 50;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isCrystalView) {
            const inactiveFiles = this.files.filter(
              (f) => f.id !== this.activeId,
            );
            const totalEchoes = Math.max(1, inactiveFiles.length);
            const size = Math.ceil(Math.cbrt(totalEchoes));
            const index = parseInt(el.dataset.index || 0);
            const spacing = 350;
            const zLayer = Math.floor(index / (size * size));
            const tz = -600 - zLayer * spacing;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isNeonSynthView) {
            const index = parseInt(el.dataset.index || 0);
            const zSpacing = 300;
            const tz = -index * zSpacing;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isTesseractView) {
            const face = parseInt(el.dataset.index || 0) % 6;
            const isOuter =
              Math.floor(parseInt(el.dataset.index || 0) / 6) % 2 === 0;
            const r = isOuter ? 400 : 200;
            let tz = 0;
            if (face === 0) {
              tz = r;
            } else if (face === 1) {
              tz = -r;
            } else {
              tz = 0;
            }
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isBlueprint3dView) {
            const totalEchoes = Math.max(
              1,
              document.querySelectorAll(".echo-document").length - 1,
            );
            const index = parseInt(el.dataset.index || 0);
            const r = 400;
            const angle = (index / Math.max(1, totalEchoes - 1)) * Math.PI; // Semi-circle
            const tz = -Math.sin(angle) * r - 100;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isCyberCortexView) {
            const totalEchoes = Math.max(
              1,
              document.querySelectorAll(".echo-document").length - 1,
            );
            const index = parseInt(el.dataset.index || 0);
            const phi = Math.acos(1 - (2 * (index + 0.5)) / totalEchoes);
            const radius = 500;
            const tz = radius * Math.cos(phi) - 200;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isTorusView) {
            const inactiveFiles = this.files.filter((f) => f.id !== this.activeId);
            const totalEchoes = Math.max(1, inactiveFiles.length);
            const index = parseInt(el.dataset.index || 0);

            // Torus parameters
            const R = 400; // Major radius
            const r = 150; // Minor radius

            // Map index to angles
            // u = poloidal angle (around the minor radius)
            // v = toroidal angle (around the major radius)
            // We want a spiral around the torus
            const t = index / totalEchoes;
            const wraps = Math.max(1, Math.floor(totalEchoes / 8)); // 8 documents per wrap

            const v = t * Math.PI * 2; // Full circle around major radius
            const u = t * Math.PI * 2 * wraps; // Multiple circles around minor radius

            const tx = (R + r * Math.cos(u)) * Math.cos(v);
            const ty = (R + r * Math.cos(u)) * Math.sin(v);
            const tz = r * Math.sin(u) - 300;

            // Calculate rotation to face outward from the torus surface
            // This is a simplified rotation approximation
            const rotZ = v * (180 / Math.PI);
            const rotX = u * (180 / Math.PI);

            el.style.setProperty("--tx", `${tx}px`);
            el.style.setProperty("--ty", `${ty}px`);
            el.style.setProperty("--tz", `${tz}px`);
            el.style.setProperty("--rot-x", `${rotX}deg`);
            el.style.setProperty("--rot-y", `0deg`);
            el.style.setProperty("--rot-z", `${rotZ}deg`);
            el.style.setProperty("--scatter-x", "0px");
            el.style.setProperty("--scatter-y", "0px");
            el.style.setProperty("--scatter-z", "0px");
            el.style.setProperty("--scatter-rot", "0deg");
          } else if (this.isMobiusView) {
            const totalEchoes = Math.max(1, inactiveFiles.length);
            const index = parseInt(el.dataset.index || 0);
            const t = index / totalEchoes;
            const R = 600;
            const w = 200;
            const u = t * Math.PI * 2;
            const v = (index % 2 === 0 ? 1 : -1) * 0.5 * w;
            const tz = (R + v * Math.cos(u / 2)) * Math.sin(u) - 400;
            el.style.setProperty("--tz", `${tz}px`);
          } else if (this.isWaveView) {
            el.style.setProperty("--tz", `-150px`);
          } else if (this.isAccordionView) {
            const idx = parseInt(el.dataset.index || 0);
            const spacingZ = -100;
            el.style.setProperty("--tz", `${idx * spacingZ}px`);
          } else if (!this.isCascadeView) {
            const idx = parseInt(el.dataset.index || 0);
            el.style.setProperty(
              "--tz",
              `calc(-${idx * 50}px + var(--stack-z, 0px))`,
            );
          }
        }
      });
      // Calculate atmospheric depth based on tz
      const tzVal = parseFloat(el.style.getPropertyValue("--tz")) || 0;
      el.style.setProperty("--tz-val", tzVal);
      if (tzVal < -100) {
        el.classList.add("depth-desaturate");
      } else {
        el.classList.remove("depth-desaturate");
      }

      // Depth Parting (The Moses Effect)
      el.addEventListener("mouseenter", () => {
        const hoveredRect = el.getBoundingClientRect();
        const hcx = hoveredRect.left + hoveredRect.width / 2;
        const hcy = hoveredRect.top + hoveredRect.height / 2;

        this.echoLayerEl
          .querySelectorAll(".echo-document")
          .forEach((sibling) => {
            if (sibling === el) return;

            const siblingRect = sibling.getBoundingClientRect();
            const scx = siblingRect.left + siblingRect.width / 2;
            const scy = siblingRect.top + siblingRect.height / 2;

            const dx = scx - hcx;
            const dy = scy - hcy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Only push siblings within a certain radius
            if (dist < 600 && dist > 0) {
              const pushFactor = (600 - dist) / 600; // 0 to 1
              const pushDist = pushFactor * 150; // max push 150px

              const nx = dx / dist;
              const ny = dy / dist;

              sibling.style.setProperty("--part-tx", `${nx * pushDist}px`);
              sibling.style.setProperty("--part-ty", `${ny * pushDist}px`);
            }
          });
      });

      el.addEventListener("mouseleave", () => {
        this.echoLayerEl
          .querySelectorAll(".echo-document")
          .forEach((sibling) => {
            if (sibling === el) return;
            sibling.style.setProperty("--part-tx", "0px");
            sibling.style.setProperty("--part-ty", "0px");
          });
      });

  },
};
