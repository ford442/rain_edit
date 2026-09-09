// @ts-check
import { InputRegistry } from "./InputRegistry.js";
import { localMouse, normalizedPointerInRect, queryEchoes } from "./depthState.js";

/**
 * The always-on, no-modifier-required part of the depth cursor field: global
 * mouse CSS variables, parallax edge fanning, dock/tabs magnetic gravity +
 * tilt, editor parallax, per-echo hover tilt, and the fog "wiping" trail.
 * None of this is gated by a keybinding — every discrete Alt/Shift/Ctrl
 * gesture builds on top of the `--mouse-*` variables this class maintains.
 */
export class AmbientCursorField {
  /**
   * @param {{ doc?: Document, win?: Window, body?: HTMLElement }} [options]
   */
  constructor({
    doc = typeof document !== "undefined" ? document : null,
    win = typeof window !== "undefined" ? window : null,
    body = typeof document !== "undefined" ? document.body : null,
  } = {}) {
    this.doc = doc;
    this.win = win;
    this.body = body;
    this.registry = new InputRegistry();
    this._handleMouseMove = this._handleMouseMove.bind(this);
  }

  init() {
    if (!this.doc) return this;
    this.registry.listen(this.doc, "mousemove", this._handleMouseMove);
    return this;
  }

  destroy() {
    this.registry.dispose();
  }

  /** @param {MouseEvent} e */
  _handleMouseMove(e) {
    const { body, win } = this;
    if (!body || !win) return;
    const mx = e.clientX;
    const my = e.clientY;

    body.style.setProperty("--mouse-x", `${mx}px`);
    body.style.setProperty("--mouse-y", `${my}px`);

    const nx = (mx / win.innerWidth) * 2 - 1;
    const ny = (my / win.innerHeight) * 2 - 1;
    body.style.setProperty("--mouse-nx", String(nx));
    body.style.setProperty("--mouse-ny", String(ny));

    const echoLayerEl = /** @type {HTMLElement | undefined} */ (win.echoLayerEl);
    this._applyEdgeFanning(echoLayerEl, nx, ny);
    this._applyUiTilt(nx, ny);
    this._applyLocalHoverTilt(echoLayerEl, mx, my);
    this._applyUiGravity(mx, my);
    this._applyEditorParallax(e);
    this._applyBackgroundParallax(mx, my);
    this._applyFogWipe(mx, my);

    const neonScatterLayer = /** @type {HTMLElement | undefined} */ (win.neonScatterLayer);
    if (neonScatterLayer) {
      neonScatterLayer.style.setProperty("--mouse-x", `${mx}px`);
      neonScatterLayer.style.setProperty("--mouse-y", `${my}px`);
    }
  }

  /**
   * "Parallax Edge Fanning" — pushes documents outwards when the mouse
   * nears the viewport edges.
   * @param {HTMLElement | undefined} echoLayerEl
   */
  _applyEdgeFanning(echoLayerEl, nx, ny) {
    if (!echoLayerEl) return;
    const edgeFanMagnitude = 50; // pixels to push
    const edgeFanX = Math.abs(nx) > 0.6 ? nx * edgeFanMagnitude : 0;
    const edgeFanY = Math.abs(ny) > 0.6 ? ny * edgeFanMagnitude : 0;

    queryEchoes(echoLayerEl).forEach((echo, index) => {
      const depthMultiplier = (index + 1) * 0.5;
      echo.style.setProperty("--edge-fan-tx", `${edgeFanX * depthMultiplier}px`);
      echo.style.setProperty("--edge-fan-ty", `${edgeFanY * depthMultiplier}px`);
    });
  }

  /** Localized 3D tilt for the dock and tabs based on normalized cursor position. */
  _applyUiTilt(nx, ny) {
    const uiDockEl = this.doc.getElementById("dock");
    const uiTabsEl = this.doc.getElementById("tabs-container");
    const transform = `perspective(1000px) rotateX(${ny * -10}deg) rotateY(${nx * 10}deg) translateZ(10px)`;
    if (uiDockEl) uiDockEl.style.transform = transform;
    if (uiTabsEl) uiTabsEl.style.transform = transform;
  }

  /**
   * Local mouse coords + holographic glare 3D tilt for magnetic-edge effects.
   * @param {HTMLElement | undefined} echoLayerEl
   */
  _applyLocalHoverTilt(echoLayerEl, mx, my) {
    if (!echoLayerEl) return;
    queryEchoes(echoLayerEl).forEach((echo) => {
      const { rect, localX, localY } = localMouse(echo, mx, my);
      echo.style.setProperty("--mouse-local-x", `${localX}px`);
      echo.style.setProperty("--mouse-local-y", `${localY}px`);

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const hoverRotY = ((localX - centerX) / centerX) * 5; // max 5deg tilt
      const hoverRotX = -((localY - centerY) / centerY) * 5;

      echo.style.setProperty("--hover-rot-x", `${hoverRotX}deg`);
      echo.style.setProperty("--hover-rot-y", `${hoverRotY}deg`);
    });
  }

  /** Gravitational cursor tracking for the dock and tabs container. */
  _applyUiGravity(mx, my) {
    const dockEl = this.doc.getElementById("dock");
    const tabsEl = this.doc.getElementById("tabs-container");
    this._pullTowardCursor(dockEl, mx, my, 300, 0.05); // 300px radius, weak pull
    this._pullTowardCursor(tabsEl, mx, my, 200, 0.03); // 200px radius, weaker pull
  }

  /** @param {HTMLElement | null} element */
  _pullTowardCursor(element, mx, my, maxDist, strength) {
    if (!element) return;

    // Cache original rect to avoid layout thrashing and feedback loops.
    if (!element._origRect) {
      const currentTransform = element.style.transform;
      element.style.transform = "none";
      element._origRect = element.getBoundingClientRect();
      element.style.transform = currentTransform;
    }

    const cx = element._origRect.left + element._origRect.width / 2;
    const cy = element._origRect.top + element._origRect.height / 2;
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < maxDist) {
      const pullX = (dx / dist) * (maxDist - dist) * strength;
      const pullY = (dy / dist) * (maxDist - dist) * strength;
      element.style.transform = `translate(${pullX}px, ${pullY}px)`;
      element.style.boxShadow = `0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 ${maxDist - dist}px rgba(0, 229, 255, 0.3)`;
    } else {
      element.style.transform = `translate(0px, 0px)`;
      element.style.boxShadow = "";
    }
  }

  /** 3D parallax on the active editor (and a lighter echo on the dock). */
  _applyEditorParallax(e) {
    const activeEditorEl = this.doc.getElementById("editor");
    if (!activeEditorEl) return;
    const dockEl = this.doc.getElementById("dock");

    const activeViewsClasses = Array.from(this.body.classList).filter((c) =>
      c.endsWith("-active"),
    );

    if (activeViewsClasses.length === 0) {
      const xOffset = (e.clientX / this.win.innerWidth - 0.5) * 20; // max +/- 10px shift
      const yOffset = (e.clientY / this.win.innerHeight - 0.5) * 20;
      const rotateX = (e.clientY / this.win.innerHeight - 0.5) * -5; // max +/- 2.5 deg tilt
      const rotateY = (e.clientX / this.win.innerWidth - 0.5) * 5;

      activeEditorEl.style.setProperty("--px", `${xOffset}px`);
      activeEditorEl.style.setProperty("--py", `${yOffset}px`);
      activeEditorEl.style.setProperty("--rx", `${rotateX}deg`);
      activeEditorEl.style.setProperty("--ry", `${rotateY}deg`);

      if (dockEl) {
        dockEl.style.setProperty("--rx", `${rotateX * 0.5}deg`);
        dockEl.style.setProperty("--ry", `${rotateY * 0.5}deg`);
      }
    } else {
      activeEditorEl.style.removeProperty("--px");
      activeEditorEl.style.removeProperty("--py");
      activeEditorEl.style.removeProperty("--rx");
      activeEditorEl.style.removeProperty("--ry");

      if (dockEl) {
        dockEl.style.removeProperty("--rx");
        dockEl.style.removeProperty("--ry");
      }
    }
  }

  /** Background/foreground rain-layer parallax, relative to the editor viewport. */
  _applyBackgroundParallax(mx, my) {
    const editorEl = /** @type {HTMLElement | undefined} */ (this.win.editorEl);
    if (!editorEl) return;
    const { x, y } = normalizedPointerInRect(editorEl, mx, my);

    const bgLayer = /** @type {any} */ (this.win.bgLayer);
    const fgLayer = /** @type {any} */ (this.win.fgLayer);
    if (bgLayer) bgLayer.setParallax(x * 0.4, y * 0.4);
    if (fgLayer) fgLayer.setParallax(x, y);
  }

  /** Continuous small fog clear that follows the cursor. */
  _applyFogWipe(mx, my) {
    const fogManager = /** @type {any} */ (this.win.fogManager);
    if (fogManager) fogManager.clearFogAt(mx, my, 60);
  }
}
