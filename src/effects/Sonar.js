/**
 * Sonar ping (double-tap Shift, Ctrl+Space, or the dock button): an expanding
 * ring from the cursor that tags note cards and echoes with `.sonar-hit` as
 * it passes. Animates on the AppClock `sonar` task for 1.5s per ping.
 */
const DURATION_MS = 1500;
const RING_THICKNESS = 150; // matches the CSS mask thickness

export class Sonar {
  /**
   * @param {{
   *   editorEl: HTMLElement,
   *   echoLayerEl: HTMLElement | null,
   *   clock: import("../runtime/AppClock.js").AppClock,
   *   portals?: import("./PortalMasks.js").PortalMasks | null,
   *   doc?: Document,
   * }} deps
   */
  constructor({ editorEl, echoLayerEl, clock, portals = null, doc = document }) {
    this.editorEl = editorEl;
    this.echoLayerEl = echoLayerEl;
    this.clock = clock;
    this.portals = portals;
    this.doc = doc;
    this.active = false;
    this.startTime = 0;
    this.x = 0;
    this.y = 0;
    /** @type {Array<{ el: Element, cx: number, cy: number }>} */
    this.targets = [];
    this.trigger = this.trigger.bind(this);
  }

  init() {
    this.clock.register({
      id: "sonar",
      active: () => this.active,
      update: () => this._step(),
    });
    return this;
  }

  trigger() {
    this.active = true;
    this.startTime = Date.now();

    const bodyStyle = this.doc.body.style;
    this.x = parseFloat(bodyStyle.getPropertyValue("--mouse-x")) || window.innerWidth / 2;
    this.y = parseFloat(bodyStyle.getPropertyValue("--mouse-y")) || window.innerHeight / 2;

    this.editorEl.style.setProperty("--sonar-x", `${this.x}px`);
    this.editorEl.style.setProperty("--sonar-y", `${this.y}px`);
    this.editorEl.classList.add("sonar-active");

    this.targets = [];
    /** @param {Element} el */
    const addTarget = (el) => {
      const rect = el.getBoundingClientRect();
      this.targets.push({ el, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 });
    };
    this.doc.querySelectorAll(".note-card").forEach(addTarget);
    if (this.echoLayerEl) {
      this.echoLayerEl.querySelectorAll(".echo-document").forEach(addTarget);
    }
  }

  _step() {
    const elapsed = Date.now() - this.startTime;
    if (elapsed > DURATION_MS) {
      this.active = false;
      this.editorEl.classList.remove("sonar-active");
      this.doc.querySelectorAll(".sonar-hit").forEach((el) => el.classList.remove("sonar-hit"));
      return;
    }

    const progress = elapsed / DURATION_MS;
    const radius =
      Math.max(window.innerWidth, window.innerHeight) * 1.5 * (1 - Math.pow(1 - progress, 3));
    this.editorEl.style.setProperty("--sonar-radius", `${radius}px`);

    this.targets.forEach((target) => {
      const dist = Math.hypot(target.cx - this.x, target.cy - this.y);
      target.el.classList.toggle("sonar-hit", Math.abs(dist - radius) < RING_THICKNESS);
    });

    // Inline portal masks must be rebuilt to include the moving ring.
    if (this.portals && this.portals.hasPortals) this.portals.update();
  }
}
