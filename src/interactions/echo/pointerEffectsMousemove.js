/**
 * Shared pointer-tracking effects: a single mousemove listener that drives
 * CSS custom properties for sonar pulse, depth lens focus, holographic
 * slice, venetian blinds, stepped crater, curtain pull, peel reveal, and
 * fabric tear while their respective body classes are active. Extracted
 * from the original single-file EchoDocumentInteractions.js purely to
 * keep file size down.
 */
export function initPointerEffectsMousemove() {
document.addEventListener("mousemove", (e) => {
  if (document.body.classList.contains("sonar-pulse-active")) {
    document.body.style.setProperty("--sonar-x", `${e.clientX}px`);
    document.body.style.setProperty("--sonar-y", `${e.clientY}px`);

    // Use requestAnimationFrame for smooth UI updates
    if (!window.sonarPulseTicking) {
      window.requestAnimationFrame(() => {
        // Calculate local mouse position and distance for each document for the mask and blur effect
        const echoes = document.querySelectorAll(".echo-document");
        echoes.forEach((doc) => {
          const rect = doc.getBoundingClientRect();
          // Local coordinates relative to the element (for masks/backgrounds)
          const localX = e.clientX - rect.left;
          const localY = e.clientY - rect.top;
          doc.style.setProperty("--sonar-local-x", `${localX}px`);
          doc.style.setProperty("--sonar-local-y", `${localY}px`);

          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dist = Math.sqrt(Math.pow(centerX - e.clientX, 2) + Math.pow(centerY - e.clientY, 2));
          doc.style.setProperty("--sonar-dist", dist);
        });
        window.sonarPulseTicking = false;
      });
      window.sonarPulseTicking = true;
    }
  }

  if (document.body.classList.contains("depth-lens-active")) {
    document.body.style.setProperty("--lens-x", `${e.clientX}px`);
    document.body.style.setProperty("--lens-y", `${e.clientY}px`);

    // Find closest document to lens center
    const lensRadius = 125;
    let closestDoc = null;
    let minDistance = Infinity;

    // Get all echo documents that are visible
    const echoes = window.echoLayerEl ? window.echoLayerEl.querySelectorAll(".echo-document") : document.querySelectorAll(".echo-document");

    echoes.forEach((doc) => {
      doc.classList.remove("depth-lens-focus"); // reset
      const rect = doc.getBoundingClientRect();
      // Calculate center of document
      const docCenterX = rect.left + rect.width / 2;
      const docCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - docCenterX;
      const dy = e.clientY - docCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If within a reasonable radius of the lens (allowing for document size)
      if (dist < lensRadius + Math.max(rect.width, rect.height) / 2) {
         if (dist < minDistance) {
           minDistance = dist;
           closestDoc = doc;
         }
      }
    });

    if (closestDoc) {
      closestDoc.classList.add("depth-lens-focus");
    }
  }

  if (document.body.classList.contains("holographic-slice-active")) {
    document.body.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.body.style.setProperty("--mouse-y", `${e.clientY}px`);
  }

  if (document.body.classList.contains("venetian-blinds-interaction-active")) {
    const blindAngle = (e.clientY / window.innerHeight) * 100;
    document.body.style.setProperty("--blind-angle", `${blindAngle}%`);
  }

  if (document.body.classList.contains("stepped-crater-active")) {
    document.body.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.body.style.setProperty("--mouse-y", `${e.clientY}px`);

    if (window.editorEl) {
      const rect = window.editorEl.getBoundingClientRect();
      window.editorEl.style.setProperty("--mouse-local-x", `${e.clientX - rect.left}px`);
      window.editorEl.style.setProperty("--mouse-local-y", `${e.clientY - rect.top}px`);
    }

    if (window.echoLayerEl) {
      const echoes = Array.from(window.echoLayerEl.querySelectorAll(".echo-document"));
      // Map echoes to depth level
      echoes.forEach((doc, idx) => {
        // Calculate crater radius. Larger for closer elements, smaller for deeper.
        // Base is 150px, each deeper level shrinks it by 30px.
        let depth = parseInt(doc.getAttribute("data-index") || idx, 10);
        let radius = Math.max(0, 150 - (depth * 30));
        doc.style.setProperty("--crater-radius", `${radius}px`);

        // Also set local mouse coords for the crater ring glow
        const rect = doc.getBoundingClientRect();
        doc.style.setProperty("--mouse-local-x", `${e.clientX - rect.left}px`);
        doc.style.setProperty("--mouse-local-y", `${e.clientY - rect.top}px`);
      });
    }
  }
  if (document.body.classList.contains("curtain-pull-active")) {
    // Normalize mouse X from -1 to 1 based on screen width
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    document.body.style.setProperty("--mouse-x-norm", normX.toFixed(3));
  }

  if (document.body.classList.contains("peel-reveal-active")) {
    document.body.style.setProperty("--mouse-x", `${e.clientX}px`);
    document.body.style.setProperty("--mouse-y", `${e.clientY}px`);
  }

  if (document.body.classList.contains("fabric-tear-active")) {
    if (editorEl) {
      const mouseX = e.clientX;
      const gradient = `linear-gradient(to right, black 0%, black calc(${mouseX}px - 50px), transparent calc(${mouseX}px - 20px), transparent calc(${mouseX}px + 20px), black calc(${mouseX}px + 50px), black 100%)`;
      editorEl.style.setProperty("--tear-mask", gradient);
    }
  }
});
}
