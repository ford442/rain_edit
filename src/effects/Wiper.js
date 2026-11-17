import * as app from "../appContext.js";

/**
 * Windshield-wiper mode: a vertical band sweeps back and forth across the
 * viewport clearing droplets and fog. Runs as the AppClock `wiper` task.
 */
export class Wiper {
  /** @param {{ clock: import("../runtime/AppClock.js").AppClock, ctx?: Partial<typeof app> }} deps */
  constructor({ clock, ctx = app }) {
    this.clock = clock;
    this.ctx = ctx;
    this.enabled = false;
    this.x = 0;
    this.direction = 1;
  }

  init() {
    this.clock.register({
      id: "wiper",
      active: () => this.enabled && Boolean(this.ctx.raindrops),
      update: () => this._step(),
    });
    return this;
  }

  /** @param {boolean} on */
  setEnabled(on) {
    this.enabled = on;
    if (on) this.x = this.direction === 1 ? -100 : window.innerWidth + 100;
  }

  _step() {
    const raindrops = this.ctx.raindrops;
    const fogManager = this.ctx.fogManager;
    if (!raindrops) return;
    this.x += 15 * this.direction;
    if (this.x > window.innerWidth + 100) this.direction = -1;
    else if (this.x < -100) this.direction = 1;

    for (let y = 0; y < window.innerHeight; y += 30) {
      raindrops.clearDroplets(this.x, y, 60);
      if (fogManager) fogManager.clearFogAt(this.x, y, 80);
    }
  }
}
