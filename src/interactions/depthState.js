// @ts-check

/**
 * Small shared helpers for the depth/reveal/lens gesture classes in this
 * directory. Several gestures independently re-implemented "find the closest
 * echo-document to the cursor", "compute mouse position local to an echo",
 * and "batch-set a handful of CSS custom properties" — this module is the
 * single place those live now.
 */

/**
 * @param {HTMLElement | null | undefined} echoLayerEl
 * @returns {HTMLElement[]}
 */
export function queryEchoes(echoLayerEl) {
  if (!echoLayerEl) return [];
  return Array.from(echoLayerEl.querySelectorAll(".echo-document"));
}

/**
 * @param {DOMRect} rect
 * @returns {{ cx: number, cy: number }}
 */
export function rectCenter(rect) {
  return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
}

/**
 * Euclidean distance from a client point to an element's bounding-rect center.
 * @param {HTMLElement} el
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{ rect: DOMRect, cx: number, cy: number, dx: number, dy: number, dist: number }}
 */
export function distanceToCenter(el, clientX, clientY) {
  const rect = el.getBoundingClientRect();
  const { cx, cy } = rectCenter(rect);
  const dx = clientX - cx;
  const dy = clientY - cy;
  return { rect, cx, cy, dx, dy, dist: Math.sqrt(dx * dx + dy * dy) };
}

/**
 * Finds the echo-document whose bounding-rect center is closest to a client
 * point (used by spotlight/hologram-preview targeting, lens, wormhole, …).
 * @param {HTMLElement[]} echoes
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{ echo: HTMLElement, dist: number } | null}
 */
export function closestEcho(echoes, clientX, clientY) {
  let closest = null;
  let minDistance = Infinity;
  for (const echo of echoes) {
    const { dist } = distanceToCenter(echo, clientX, clientY);
    if (dist < minDistance) {
      minDistance = dist;
      closest = echo;
    }
  }
  return closest ? { echo: closest, dist: minDistance } : null;
}

/**
 * Mouse position local to an element (used for holographic glare / mask
 * positioning), plus the element's rect since callers usually need both.
 * @param {HTMLElement} el
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{ rect: DOMRect, localX: number, localY: number }}
 */
export function localMouse(el, clientX, clientY) {
  const rect = el.getBoundingClientRect();
  return { rect, localX: clientX - rect.left, localY: clientY - rect.top };
}

/**
 * Cursor position normalized to [-1, 1] within an element's bounding rect.
 * Shared by the background/foreground rain parallax and the echo-layer
 * orbit/solar-system/helix rotation, both of which key off the same
 * editor-relative coordinate space.
 * @param {HTMLElement} el
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{ x: number, y: number }}
 */
export function normalizedPointerInRect(el, clientX, clientY) {
  const rect = el.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: ((clientY - rect.top) / rect.height) * 2 - 1,
  };
}

/**
 * Batch-applies CSS custom properties to an element's inline style.
 * @param {HTMLElement} el
 * @param {Record<string, string | number>} vars
 */
export function setVars(el, vars) {
  for (const name in vars) {
    el.style.setProperty(name, String(vars[name]));
  }
}

/**
 * Removes a set of CSS custom properties from an element's inline style.
 * @param {HTMLElement} el
 * @param {string[]} names
 */
export function clearVars(el, names) {
  for (const name of names) {
    el.style.removeProperty(name);
  }
}
