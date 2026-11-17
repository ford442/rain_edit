// @ts-check

/**
 * The single main-thread frame clock.
 *
 * Every per-frame animation on the main thread registers here instead of
 * owning a private `requestAnimationFrame` loop. One root RAF drives all
 * tasks in a fixed two-phase order (every `update`, then every `render`), so
 * the rain pass, the cabinet texture upload, fog, matrix, dust, and the
 * interaction effects can never interleave or double-schedule. The clock:
 *
 *  - pauses the root RAF while `document.hidden` (no GPU work in hidden tabs)
 *    and resumes without a giant `dt` spike;
 *  - runs one-shot `nextFrame()` callbacks at the start of the next tick, for
 *    "coalesce until next frame" patterns that used to call RAF directly;
 *  - tracks a frame-time EMA (and, where supported, battery state) to choose a
 *    level of detail: under `"low"` LOD, `priority: "decorative"` tasks are
 *    skipped and listeners (e.g. the rain DPR) can scale back.
 *
 * Worker threads (`src/rain/rainSimWorker.js`) keep their own RAF; nothing
 * else in `src/` may call `requestAnimationFrame` (see
 * `tests/architecture.test.js`).
 */

/** @typedef {'essential' | 'decorative'} TaskPriority */
/** @typedef {'high' | 'low'} LodLevel */
/** @typedef {'auto' | LodLevel} LodMode */

/**
 * @typedef {object} ClockTask
 * @property {string} id Unique task id (registering a duplicate throws).
 * @property {(dt: number, t: number) => void} [update] Simulation step; `dt`
 *   is milliseconds since the previous tick (clamped), `t` is the RAF timestamp.
 * @property {(dt: number, t: number) => void} [render] Draw step, run after
 *   every task's `update` for the frame.
 * @property {() => boolean} [active] Skip the task this frame when it returns
 *   false. Cheap to call every frame.
 * @property {TaskPriority} [priority] `"decorative"` tasks are skipped while
 *   the clock is in low LOD. Default `"essential"`.
 */

/**
 * @typedef {object} AppClockOptions
 * @property {((cb: FrameRequestCallback) => number) | null} [raf]
 * @property {((handle: number) => void) | null} [caf]
 * @property {Document | null} [doc] Visibility source; `null` disables pausing.
 * @property {() => number} [now]
 * @property {LodMode} [lodMode]
 * @property {number} [maxDt] Upper clamp for `dt` in ms.
 * @property {number} [lowFrameMs] EMA frame time above which LOD drops.
 * @property {number} [highFrameMs] EMA frame time below which LOD recovers.
 * @property {number} [lodHysteresisFrames] Consecutive frames required to switch.
 * @property {(err: unknown, taskId: string) => void} [onError]
 */

/**
 * @typedef {object} ClockDiagnostics
 * @property {boolean} running
 * @property {boolean} hidden
 * @property {number} frame
 * @property {number} fps
 * @property {number} avgFrameMs
 * @property {LodLevel} lod
 * @property {LodMode} lodMode
 * @property {boolean} batteryLow
 * @property {string[]} tasks
 * @property {string[]} activeTasks
 */

const DEFAULT_MAX_DT = 100;

export class AppClock {
  /** @param {AppClockOptions} [options] */
  constructor({
    raf = typeof requestAnimationFrame === "function"
      ? requestAnimationFrame.bind(globalThis)
      : null,
    caf = typeof cancelAnimationFrame === "function"
      ? cancelAnimationFrame.bind(globalThis)
      : null,
    doc = typeof document !== "undefined" ? document : null,
    now = () =>
      typeof performance !== "undefined" ? performance.now() : Date.now(),
    lodMode = "auto",
    maxDt = DEFAULT_MAX_DT,
    lowFrameMs = 1000 / 40,
    highFrameMs = 1000 / 55,
    lodHysteresisFrames = 90,
    onError = (err, taskId) =>
      console.error(`[AppClock] task "${taskId}" threw`, err),
  } = {}) {
    this._raf = raf;
    this._caf = caf;
    this._doc = doc;
    this._now = now;
    this._maxDt = maxDt;
    this._lowFrameMs = lowFrameMs;
    this._highFrameMs = highFrameMs;
    this._lodHysteresisFrames = lodHysteresisFrames;
    this._onError = onError;

    /** @type {ClockTask[]} */
    this._tasks = [];
    /** @type {Array<(t: number) => void>} */
    this._oneShots = [];
    /** @type {Set<(lod: LodLevel) => void>} */
    this._lodListeners = new Set();

    /** @type {number | null} */
    this._handle = null;
    this._running = false;
    this._hidden = Boolean(doc && doc.hidden);
    /** @type {number | null} */
    this._lastTime = null;
    this.frame = 0;
    this._avgFrameMs = 1000 / 60;
    this._slowFrames = 0;
    this._fastFrames = 0;
    /** @type {LodMode} */
    this._lodMode = lodMode;
    /** @type {LodLevel} */
    this._fpsLod = "high";
    this._batteryLow = false;
    /** @type {LodLevel} */
    this._lod = lodMode === "low" ? "low" : "high";

    this._tick = this._tick.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
  }

  /**
   * Register a per-frame task. Returns an unregister function.
   * @param {ClockTask} task
   * @returns {() => void}
   */
  register(task) {
    if (!task || !task.id) throw new Error("AppClock.register requires an id");
    if (this._tasks.some((t) => t.id === task.id)) {
      throw new Error(`AppClock: duplicate task id "${task.id}"`);
    }
    this._tasks.push(task);
    return () => this.unregister(task.id);
  }

  /** @param {string} id */
  unregister(id) {
    this._tasks = this._tasks.filter((t) => t.id !== id);
  }

  /** @param {string} id */
  has(id) {
    return this._tasks.some((t) => t.id === id);
  }

  /**
   * Run `cb` once at the start of the next tick (before any task update).
   * Replaces ad hoc one-shot `requestAnimationFrame(cb)` calls.
   * @param {(t: number) => void} cb
   * @returns {() => void} cancel
   */
  nextFrame(cb) {
    this._oneShots.push(cb);
    return () => {
      const i = this._oneShots.indexOf(cb);
      if (i !== -1) this._oneShots.splice(i, 1);
    };
  }

  start() {
    if (this._running) return this;
    this._running = true;
    if (this._doc && typeof this._doc.addEventListener === "function") {
      this._doc.addEventListener("visibilitychange", this._onVisibilityChange);
      this._hidden = Boolean(this._doc.hidden);
    }
    this._schedule();
    return this;
  }

  stop() {
    this._running = false;
    this._cancel();
    if (this._doc && typeof this._doc.removeEventListener === "function") {
      this._doc.removeEventListener(
        "visibilitychange",
        this._onVisibilityChange,
      );
    }
    this._lastTime = null;
    return this;
  }

  get running() {
    return this._running;
  }

  /** True while the clock is started but the document is hidden. */
  get paused() {
    return this._running && this._hidden;
  }

  /** @returns {LodLevel} */
  get lod() {
    return this._lod;
  }

  /** @param {LodMode} mode */
  setLodMode(mode) {
    this._lodMode = mode;
    this._recomputeLod();
  }

  /**
   * Feed battery state (from `navigator.getBattery()`); a discharging battery
   * below 20% forces low LOD while `lodMode` is `"auto"`.
   * @param {{ charging: boolean, level: number } | null} battery
   */
  setBatteryState(battery) {
    this._batteryLow = Boolean(
      battery && !battery.charging && battery.level < 0.2,
    );
    this._recomputeLod();
  }

  /**
   * Subscribe to LOD changes. Returns an unsubscribe function.
   * @param {(lod: LodLevel) => void} listener
   */
  onLodChange(listener) {
    this._lodListeners.add(listener);
    return () => this._lodListeners.delete(listener);
  }

  /** @returns {ClockDiagnostics} */
  getDiagnostics() {
    return {
      running: this._running,
      hidden: this._hidden,
      frame: this.frame,
      fps: this._avgFrameMs > 0 ? 1000 / this._avgFrameMs : 0,
      avgFrameMs: this._avgFrameMs,
      lod: this._lod,
      lodMode: this._lodMode,
      batteryLow: this._batteryLow,
      tasks: this._tasks.map((t) => t.id),
      activeTasks: this._tasks
        .filter((t) => this._isTaskActive(t))
        .map((t) => t.id),
    };
  }

  /**
   * Advance one frame. Called by the root RAF; exposed for tests.
   * @param {number} [time]
   */
  tick(time = this._now()) {
    const dt =
      this._lastTime === null
        ? 1000 / 60
        : Math.min(this._maxDt, Math.max(0, time - this._lastTime));
    this._lastTime = time;
    this.frame += 1;
    this._sampleFrameTime(dt);

    if (this._oneShots.length) {
      const shots = this._oneShots;
      this._oneShots = [];
      for (const cb of shots) {
        try {
          cb(time);
        } catch (err) {
          this._onError(err, "nextFrame");
        }
      }
    }

    // Snapshot so tasks may (un)register during the frame.
    const tasks = this._tasks.filter((t) => this._isTaskActive(t));
    for (const task of tasks) {
      if (!task.update) continue;
      try {
        task.update(dt, time);
      } catch (err) {
        this._onError(err, task.id);
      }
    }
    for (const task of tasks) {
      if (!task.render) continue;
      try {
        task.render(dt, time);
      } catch (err) {
        this._onError(err, task.id);
      }
    }
  }

  /** @param {ClockTask} task */
  _isTaskActive(task) {
    if (task.priority === "decorative" && this._lod === "low") return false;
    if (!task.active) return true;
    try {
      return task.active();
    } catch (err) {
      this._onError(err, task.id);
      return false;
    }
  }

  /** @param {number} time */
  _tick(time) {
    this._handle = null;
    if (!this._running || this._hidden) return;
    this.tick(time);
    this._schedule();
  }

  _schedule() {
    if (!this._running || this._hidden || this._handle !== null || !this._raf)
      return;
    this._handle = this._raf(this._tick);
  }

  _cancel() {
    if (this._handle !== null && this._caf) this._caf(this._handle);
    this._handle = null;
  }

  _onVisibilityChange() {
    const hidden = Boolean(this._doc && this._doc.hidden);
    if (hidden === this._hidden) return;
    this._hidden = hidden;
    if (hidden) {
      this._cancel();
    } else {
      // Don't feed the hidden interval into dt or the FPS average.
      this._lastTime = null;
      this._schedule();
    }
  }

  /** @param {number} dt */
  _sampleFrameTime(dt) {
    this._avgFrameMs += (dt - this._avgFrameMs) * 0.05;
    if (this._avgFrameMs > this._lowFrameMs) {
      this._slowFrames += 1;
      this._fastFrames = 0;
    } else if (this._avgFrameMs < this._highFrameMs) {
      this._fastFrames += 1;
      this._slowFrames = 0;
    }
    /** @type {LodLevel} */
    let next = this._fpsLod;
    if (this._slowFrames >= this._lodHysteresisFrames) next = "low";
    else if (this._fastFrames >= this._lodHysteresisFrames) next = "high";
    if (next !== this._fpsLod) {
      this._fpsLod = next;
      this._slowFrames = 0;
      this._fastFrames = 0;
      this._recomputeLod();
    }
  }

  _recomputeLod() {
    /** @type {LodLevel} */
    let lod;
    if (this._lodMode === "low" || this._lodMode === "high") lod = this._lodMode;
    else lod = this._batteryLow || this._fpsLod === "low" ? "low" : "high";
    if (lod === this._lod) return;
    this._lod = lod;
    for (const listener of this._lodListeners) {
      try {
        listener(lod);
      } catch (err) {
        this._onError(err, "onLodChange");
      }
    }
  }
}

/**
 * Resolve the LOD mode from `?lod=` / `localStorage['rain-edit:lod']`.
 * @param {{ search?: string, storage?: Storage | null }} [sources]
 * @returns {LodMode}
 */
export function resolveLodMode({
  search = typeof location !== "undefined" ? location.search : "",
  storage = typeof localStorage !== "undefined" ? localStorage : null,
} = {}) {
  /** @param {string | null | undefined} v @returns {LodMode | null} */
  const parse = (v) => (v === "auto" || v === "low" || v === "high" ? v : null);
  const fromQuery = parse(new URLSearchParams(search).get("lod"));
  if (fromQuery) return fromQuery;
  try {
    const fromStorage = parse(storage?.getItem("rain-edit:lod"));
    if (fromStorage) return fromStorage;
  } catch {
    // storage blocked (private mode); fall through
  }
  return "auto";
}

/** The application's single frame clock. `createApp()` starts it. */
export const appClock = new AppClock();
