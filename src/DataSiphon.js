/**
 * DataSiphon Class
 * Handles the visual effect of data flowing from background tabs to the active editor cursor.
 */
export default class DataSiphon {
  /**
   * @param {Object} editor - The active Monaco Editor instance
   */
  constructor(editor) {
    this.editor = editor;
    this.particleContainer = document.createElement('div');
    this.particleContainer.id = 'siphon-container';
    // Ensure the container covers the screen but captures no clicks
    this.particleContainer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9999;';
    document.body.appendChild(this.particleContainer);

    this.bindEvents();
  }

  bindEvents() {
    // Listen to typing events in Monaco
    this.editor.onDidChangeModelContent((e) => {
      // Throttle or random chance to prevent overwhelming the DOM if typing fast
      if (Math.random() > 0.3) {
        this.spawnParticle();
      }
    });
  }

  spawnParticle() {
    // 1. Find a source (a random background .echo-document)
    const echoes = document.querySelectorAll('.echo-document');
    if (!echoes || echoes.length === 0) return; // Exit if no background docs

    const randomEcho = echoes[Math.floor(Math.random() * echoes.length)];
    const sourceRect = randomEcho.getBoundingClientRect();

    // Pick a random starting point within the source document
    const startX = sourceRect.left + (Math.random() * sourceRect.width);
    const startY = sourceRect.top + (Math.random() * sourceRect.height);

    // 2. Find the destination (Monaco Cursor pixel position)
    const position = this.editor.getPosition();
    if (!position) return;

    const editorNode = this.editor.getDomNode();
    const editorRect = editorNode.getBoundingClientRect();
    const cursorCoords = this.editor.getScrolledVisiblePosition(position);

    if (!cursorCoords) return; // Cursor might be scrolled out of view

    const targetX = editorRect.left + cursorCoords.left;
    const targetY = editorRect.top + cursorCoords.top;

    // 3. Create and animate the particle
    const particle = document.createElement('div');
    particle.className = 'data-particle';
    this.particleContainer.appendChild(particle);

    // Use the Web Animations API for high performance
    const animation = particle.animate([
      { transform: `translate(${startX}px, ${startY}px) scale(0.5)`, opacity: 0 },
      { transform: `translate(${startX}px, ${startY}px) scale(1)`, opacity: 1, offset: 0.2 },
      // Arc effect by adding a slight curve to the trajectory
      { transform: `translate(${(startX + targetX)/2 + 50}px, ${(startY + targetY)/2 - 50}px) scale(1.5)`, opacity: 0.8, offset: 0.5 },
      { transform: `translate(${targetX}px, ${targetY}px) scale(0.2)`, opacity: 0 }
    ], {
      duration: 600 + Math.random() * 400, // 600ms - 1000ms duration
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)', // Smooth deceleration into the cursor
      fill: 'forwards'
    });

    // Cleanup DOM node after animation finishes
    animation.onfinish = () => {
      particle.remove();
    };
  }
}
