/**
 * Queued droplet-clearing effects applied once per rain frame: short-lived
 * clear spots (cabinet hover/splash) and horizontal wipes (tab/file open).
 */

/** @typedef {{ x: number, y: number, r: number, life: number }} RainClear */
/** @typedef {{ x0: number, y0: number, x1: number, y1: number, r: number, frame: number, totalFrames: number }} RainWipe */

export function createRainEffects() {
  return {
    /** @type {RainClear[]} life counts down in frames */
    clears: [],
    /** @type {RainWipe[]} */
    wipes: [],

    /**
     * Add (or refresh a nearby) clear spot.
     * @param {number} x @param {number} y @param {number} r @param {number} [life]
     */
    addClear(x, y, r, life = 4) {
      for (const c of this.clears) {
        if (Math.abs(c.x - x) < r * 0.5 && Math.abs(c.y - y) < r * 0.5) {
          c.x = x;
          c.y = y;
          c.r = r;
          c.life = life;
          return;
        }
      }
      this.clears.push({ x, y, r, life });
    },

    /**
     * Sweep a horizontal wipe across a rect.
     * @param {{ left: number, top: number, right: number, bottom: number }} rect
     * @param {number} [totalFrames]
     */
    addWipe(rect, totalFrames = 45) {
      this.wipes.push({
        x0: rect.left,
        y0: rect.top,
        x1: rect.right,
        y1: rect.bottom,
        r: (rect.bottom - rect.top) * 0.55,
        frame: 0,
        totalFrames,
      });
    },

    /** @param {{ clearDroplets(x: number, y: number, r: number): void } | null} drops */
    tick(drops) {
      if (!drops) return;
      this.clears = this.clears.filter((c) => c.life > 0);
      for (const c of this.clears) {
        drops.clearDroplets(c.x, c.y, c.r);
        c.life--;
      }
      this.wipes = this.wipes.filter((w) => w.frame < w.totalFrames);
      for (const w of this.wipes) {
        const t = w.frame / w.totalFrames;
        drops.clearDroplets(w.x0 + (w.x1 - w.x0) * t, (w.y0 + w.y1) / 2, w.r);
        w.frame++;
      }
    },
  };
}

/** @typedef {ReturnType<typeof createRainEffects>} RainEffects */
