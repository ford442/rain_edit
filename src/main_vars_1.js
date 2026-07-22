import { monaco } from "./editor/setupMonaco.js";

window._autofocusStep = function _autofocusStep() {
  if (!isAutofocusActive) {
    _stopAutofocusLoop();
    return;
  }

  // Lerp current Z to target Z for smooth focal transition
  autofocusCurrentZ += (autofocusTargetZ - autofocusCurrentZ) * 0.1;

  if (echoLayerEl) {
    echoLayerEl.querySelectorAll(".echo-document").forEach((doc) => {
      // Calculate local Z depth (derived from its data-depth or var(--tz))
      // It's hard to get computed --tz reliably if it's animated, so we use an approximation based on depth
      let docZ = 0;
      const depth = parseInt(doc.dataset.depth || "0", 10);
      if (depth === 0) docZ = -400;
      else if (depth === 1) docZ = 0;
      else if (depth === 2) docZ = 400;

      const distance = Math.abs(docZ - autofocusCurrentZ);
      // Max distance is roughly 800, let's map this to blur 0px -> 15px
      const blurAmount = Math.min(15, (distance / 800) * 15);
      const brightnessAmount = 1 - Math.min(0.6, (distance / 800) * 0.6);

      doc.style.setProperty("--af-blur", `${blurAmount}px`);
      doc.style.setProperty("--af-brightness", `${brightnessAmount}`);
    });
  }

  autofocusRafId = requestAnimationFrame(_autofocusStep);
};
window.animateWiper = function animateWiper() {
  if (!wiperMode || !raindrops) return;

  const w = window.innerWidth;
  const speed = 15;
  wiperX += speed * wiperDirection;

  if (wiperX > w + 100) {
    wiperDirection = -1;
  } else if (wiperX < -100) {
    wiperDirection = 1;
  }

  // Clear droplets along a vertical line
  const h = window.innerHeight;
  for (let y = 0; y < h; y += 30) {
    raindrops.clearDroplets(wiperX, y, 60);
    if (fogManager) {
      fogManager.clearFogAt(wiperX, y, 80);
    }
  }

  wiperAnimationId = requestAnimationFrame(animateWiper);
};
window.resetGhostTimer = function resetGhostTimer() {
  if (!ghostMode) return;
  if (focusDepth > 0.1) return; // Don't interfere if focusing on reference

  // Restore opacity on activity
  if (editorEl.style.opacity !== opacitySlider.value) {
    updateFocusVisuals();
  }

  clearTimeout(ghostTimer);
  ghostTimer = setTimeout(() => {
    if (focusDepth < 0.1) {
      editorEl.style.opacity = "0.05";
    }
  }, 4000);
};
window.updateCinematicTarget = function updateCinematicTarget(e) {
  if (!isCinematicAutofocusActive) return;

  // Find element under cursor
  const target = document.elementFromPoint(e.clientX, e.clientY);
  const echoDoc = target ? target.closest(".echo-document") : null;
  const isEditor = target ? target.closest("#editor") : null;

  if (echoDoc) {
    // Determine depth based on index
    const indexStr = echoDoc.style.getPropertyValue("--depth-index") || "0";
    targetCinematicZ = parseInt(indexStr, 10);
  } else if (isEditor) {
    targetCinematicZ = -1; // Editor is foreground
  } else {
    // If not hovering anything, subtly drift focus back to the front
    targetCinematicZ = -0.5;
  }
};
window.animateCinematicFocus = function animateCinematicFocus() {
  if (!isCinematicAutofocusActive) return;

  // Lerp towards target
  currentCinematicZ += (targetCinematicZ - currentCinematicZ) * 0.08;

  // Apply to styles
  applyCinematicStyles();

  cinematicAnimationId = requestAnimationFrame(animateCinematicFocus);
};
window.applyCinematicStyles = function applyCinematicStyles() {
  if (!echoLayerEl) return;

  const echoes = echoLayerEl.querySelectorAll(".echo-document");

  // Apply to editor (foreground)
  const editorDist = Math.abs(currentCinematicZ - -1);
  const editorBlur = editorDist * 2.5; // blur amount
  const editorOpacity = Math.max(0.3, 1 - editorDist * 0.15);

  if (editorEl) {
    editorEl.style.filter = `blur(${editorBlur}px)`;
    editorEl.style.opacity = editorOpacity;
  }

  // Apply to echoes
  echoes.forEach((echo) => {
    const indexStr = echo.style.getPropertyValue("--depth-index") || "0";
    const zIndex = parseInt(indexStr, 10);

    // Distance from focal plane
    const dist = Math.abs(currentCinematicZ - zIndex);

    // Calculate blur and brightness based on distance from focal plane
    const blurAmount = dist * 2.5;
    const brightness = Math.max(0.4, 1 - dist * 0.1);
    const opacity = Math.max(0.2, 0.8 - dist * 0.08);

    echo.style.filter = `blur(${blurAmount}px) brightness(${brightness})`;
    echo.style.opacity = opacity;
  });
};
window.resetCinematicFocus = function resetCinematicFocus() {
  if (editorEl) {
    editorEl.style.filter = "";
    // Opacity is handled by sliders, avoid clobbering completely, but clear inline
    editorEl.style.opacity = opacitySlider ? opacitySlider.value : "";
  }

  if (echoLayerEl) {
    const echoes = echoLayerEl.querySelectorAll(".echo-document");
    echoes.forEach((echo) => {
      echo.style.filter = "";
      echo.style.opacity = "";
    });
  }
};
window.spawnSemanticSpark = function spawnSemanticSpark(startX, startY) {
  if (!echoLayerEl) return;
  const spark = document.createElement("div");
  spark.className = "semantic-spark";
  spark.style.left = `${startX}px`;
  spark.style.top = `${startY}px`;

  // Editor is roughly in the center
  const editorRect = editorEl.getBoundingClientRect();
  const endX =
    editorRect.left + editorRect.width / 2 + (Math.random() - 0.5) * 100;
  const endY =
    editorRect.top + editorRect.height / 2 + (Math.random() - 0.5) * 100;

  const dx = endX - startX;
  const dy = endY - startY;

  spark.style.setProperty("--tx", `${dx}px`);
  spark.style.setProperty("--ty", `${dy}px`);

  echoLayerEl.appendChild(spark);

  setTimeout(() => {
    if (spark.parentNode) {
      spark.parentNode.removeChild(spark);
    }
  }, 1000);
};
window.triggerLightning = function triggerLightning() {
  if (!lightningLayer) return;
  const brightness = 0.6 + Math.random() * 0.4;
  lightningLayer.style.opacity = brightness;
  setTimeout(
    () => {
      lightningLayer.style.opacity = 0;
    },
    50 + Math.random() * 100,
  );
  scheduleLightning();
};
window.scheduleLightning = function scheduleLightning() {
  const delay = 10000 + Math.random() * 20000;
  setTimeout(triggerLightning, delay);
};
window.setFocusDepth = function setFocusDepth(depth) {
  focusDepth = Math.max(0, Math.min(1, depth));
  updateFocusVisuals();
};
window.updateFocusVisuals = function updateFocusVisuals() {
  const maxOpacity = parseFloat(opacitySlider.value) || 1;
  const targetEditorOpacity = maxOpacity * (1 - focusDepth * 0.95);

  // Zoom Calculation
  // When focusDepth = 1 (Reference focused), Reference scale = 1.05 (Zoom In), Editor scale = 0.95 (Zoom Out)
  const refScale = 1 + focusDepth * 0.08;
  const editorScale = 1 - focusDepth * 0.05;

  // Editor and Image Viewer
  const targetOpacity = Math.max(0.02, targetEditorOpacity);
  const filter = `blur(${focusDepth * 8}px)`;
  const transform = `scale(${editorScale}) translateZ(0)`;

  editorEl.style.opacity = targetOpacity;
  editorEl.style.filter = filter;
  editorEl.style.transform = transform;

  if (document.getElementById("image-viewer")) {
    document.getElementById("image-viewer").style.opacity = targetOpacity;
    document.getElementById("image-viewer").style.filter = filter;
    document.getElementById("image-viewer").style.transform = transform;
  }

  // Reference Layer
  if (referenceLayer) {
    // Use translateZ to force GPU acceleration
    referenceLayer.style.transform = `scale(${refScale}) translateZ(0)`;
  }

  // Pointer Events
  if (focusDepth > 0.6) {
    editorEl.style.pointerEvents = "none";
    if (document.getElementById("image-viewer"))
      document.getElementById("image-viewer").style.pointerEvents = "none";
  } else {
    editorEl.style.pointerEvents = "auto";
    if (document.getElementById("image-viewer"))
      document.getElementById("image-viewer").style.pointerEvents = "auto";
  }

  // Reference Overlay
  if (referenceOverlay) {
    referenceOverlay.style.opacity = 1 - focusDepth;
  }

  // Fog
  if (fogLayerEl) {
    fogLayerEl.style.opacity = 1 - focusDepth * 0.5;
  }
};

window.updateAtmosphere = function updateAtmosphere() {
  if (!editor || !monaco) return;
  const model = editor.getModel();
  if (!model) return;

  const markers = monaco.editor.getModelMarkers({ resource: model.uri });
  let errorCount = 0;
  let warningCount = 0;

  markers.forEach((m) => {
    if (m.severity === monaco.MarkerSeverity.Error) errorCount++;
    if (m.severity === monaco.MarkerSeverity.Warning) warningCount++;
  });

  let targetHue = 180; // Cyan (Calm)
  let intensityMod = 0;

  if (errorCount > 0) {
    targetHue = 0; // Red (Danger)
    intensityMod = Math.min(50, errorCount * 10);
  } else if (warningCount > 0) {
    targetHue = 40; // Orange (Warning)
    intensityMod = Math.min(20, warningCount * 5);
  }

  // Smoothly interpolate hue (simple approach via CSS variable)
  // We update --dynamic-hue base, which breathing effect builds upon
  // Current base is set in the interval loop below, we can override it there
  // or set a global modifier.

  window.atmosphereHue = targetHue;
  window.atmosphereIntensity = intensityMod;
};
window.createTypingParticle = function createTypingParticle(x, y) {
  if (!echoLayerEl) return;
  const particle = document.createElement("div");
  particle.className = "typing-particle";
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;

  // Randomize particle target destination slightly
  const dx = (Math.random() - 0.5) * 200;
  const dy = (Math.random() - 0.5) * 200;

  particle.style.setProperty("--px", `${dx}px`);
  particle.style.setProperty("--py", `${dy}px`);

  // Random size
  const size = Math.random() * 4 + 2;
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;

  echoLayerEl.appendChild(particle);

  setTimeout(() => {
    if (particle.parentNode) {
      particle.parentNode.removeChild(particle);
    }
  }, 800);
};
window.triggerZScan = function triggerZScan() {
  const scannerPlane = document.getElementById("z-scanner-plane");
  if (!scannerPlane) return;

  // Reset and start animation
  scannerPlane.classList.remove("scanning");
  void scannerPlane.offsetWidth; // Force reflow
  scannerPlane.classList.add("scanning");

  const echoes = document.querySelectorAll(".echo-document");

  // Approximate depth matching based on CSS structure and vars
  echoes.forEach((echo) => {
    let z = 0;
    const tzStyle = echo.style.getPropertyValue("--tz");

    if (tzStyle && tzStyle.includes("px")) {
      const match = tzStyle.match(/(-?\d+)/);
      if (match && !tzStyle.includes("calc")) {
        z = parseInt(match[0], 10);
      } else {
        const idx = parseInt(echo.dataset.index || 0);
        z = -(idx * 50) + (window.stackZ || 0); // approximation
      }
    }

    // Scan starts at Z=+200, ends at Z=-2000 over 4000ms. Total distance 2200px.
    // It travels at 2200px / 3800ms ≈ 0.57 px/ms.
    // Time to reach Z = (200 - Z) / 0.57
    const totalZDistance = 2200;
    const distFromStart = 200 - z;
    let delayMs = (distFromStart / totalZDistance) * 3800;

    // Clamp to positive, valid timeout bounds
    if (delayMs < 0) delayMs = 100;
    if (delayMs > 4000) delayMs = 4000;

    setTimeout(() => {
      echo.classList.add("z-scan-hit");

      // Highlight text slightly more by playing with tint
      const currentTint = echo.style.getPropertyValue("--echo-tint") || "0deg";
      echo.style.setProperty("--scan-temp-color", "rgba(255, 0, 128, 1)");

      setTimeout(() => {
        echo.classList.remove("z-scan-hit");
      }, 800);
    }, delayMs);
  });

  // Clean up scanner class
  setTimeout(() => {
    scannerPlane.classList.remove("scanning");
  }, 4500);
};
window.triggerSonar = function triggerSonar() {
  sonarActive = true;
  sonarStartTime = Date.now();

  // Get mouse position
  // Use the last known mouse position from global listener if possible,
  // but here we might need to rely on the CSS variables set by mousemove
  const mx =
    parseFloat(document.body.style.getPropertyValue("--mouse-x")) ||
    window.innerWidth / 2;
  const my =
    parseFloat(document.body.style.getPropertyValue("--mouse-y")) ||
    window.innerHeight / 2;

  sonarX = mx;
  sonarY = my;

  editorEl.style.setProperty("--sonar-x", `${sonarX}px`);
  editorEl.style.setProperty("--sonar-y", `${sonarY}px`);

  editorEl.classList.add("sonar-active");

  cachedSonarTargets = [];
  document.querySelectorAll(".note-card").forEach((card) => {
    const rect = card.getBoundingClientRect();
    cachedSonarTargets.push({
      el: card,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    });
  });
  if (echoLayerEl) {
    echoLayerEl.querySelectorAll(".echo-document").forEach((echo) => {
      const rect = echo.getBoundingClientRect();
      cachedSonarTargets.push({
        el: echo,
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
      });
    });
  }

  requestAnimationFrame(animateSonar);
};
window.animateSonar = function animateSonar() {
  if (!sonarActive) return;

  const now = Date.now();
  const elapsed = now - sonarStartTime;
  const duration = 1500;

  if (elapsed > duration) {
    sonarActive = false;
    editorEl.classList.remove("sonar-active");
    // Clear sonar-hit classes
    document
      .querySelectorAll(".sonar-hit")
      .forEach((el) => el.classList.remove("sonar-hit"));
    return;
  }

  // Easing out
  const progress = elapsed / duration;
  const radius =
    Math.max(window.innerWidth, window.innerHeight) *
    1.5 *
    (1 - Math.pow(1 - progress, 3)); // cubic ease out

  editorEl.style.setProperty("--sonar-radius", `${radius}px`);

  // Semantic Sonar: highlight elements as the ring passes over them
  const thickness = 150; // Match the mask thickness

  cachedSonarTargets.forEach((target) => {
    const dist = Math.sqrt(
      Math.pow(target.cx - sonarX, 2) + Math.pow(target.cy - sonarY, 2),
    );
    if (Math.abs(dist - radius) < thickness) {
      target.el.classList.add("sonar-hit");
    } else {
      target.el.classList.remove("sonar-hit");
    }
  });

  // Force update if portals exist (JS mask management active)
  if (portalLines.length > 0) {
    updatePortals();
  }

  requestAnimationFrame(animateSonar);
};
