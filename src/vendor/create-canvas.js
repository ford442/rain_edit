/** Create a canvas usable on the main thread or in a Worker. */
export default function createCanvas(width, height) {
  const w = Math.max(1, width | 0);
  const h = Math.max(1, height | 0);
  if (typeof document !== "undefined" && document.createElement) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(w, h);
  }
  throw new Error("No canvas implementation available in this environment");
}
