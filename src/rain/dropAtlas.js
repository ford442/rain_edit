import createCanvas from "../vendor/create-canvas.js";

const DROP_SIZE = 64;
const ATLAS_COUNT = 255;

/**
 * Bake the same 255 drop sprites the canvas raindrops engine uses into a
 * contiguous RGBA8 atlas for the WASM blitter.
 *
 * @param {CanvasImageSource} dropAlpha
 * @param {CanvasImageSource} dropColor
 * @returns {Uint8ClampedArray}
 */
export function bakeDropAtlas(dropAlpha, dropColor) {
  const dropBuffer = createCanvas(DROP_SIZE, DROP_SIZE);
  const dropBufferCtx = dropBuffer.getContext("2d");
  const atlas = new Uint8ClampedArray(ATLAS_COUNT * DROP_SIZE * DROP_SIZE * 4);

  for (let i = 0; i < ATLAS_COUNT; i++) {
    const drop = createCanvas(DROP_SIZE, DROP_SIZE);
    const dropCtx = drop.getContext("2d");
    dropBufferCtx.clearRect(0, 0, DROP_SIZE, DROP_SIZE);
    dropBufferCtx.globalCompositeOperation = "source-over";
    dropBufferCtx.drawImage(dropColor, 0, 0, DROP_SIZE, DROP_SIZE);
    dropBufferCtx.globalCompositeOperation = "screen";
    dropBufferCtx.fillStyle = "rgba(0,0," + i + ",1)";
    dropBufferCtx.fillRect(0, 0, DROP_SIZE, DROP_SIZE);
    dropCtx.globalCompositeOperation = "source-over";
    dropCtx.drawImage(dropAlpha, 0, 0, DROP_SIZE, DROP_SIZE);
    dropCtx.globalCompositeOperation = "source-in";
    dropCtx.drawImage(dropBuffer, 0, 0, DROP_SIZE, DROP_SIZE);
    const { data } = dropCtx.getImageData(0, 0, DROP_SIZE, DROP_SIZE);
    atlas.set(data, i * DROP_SIZE * DROP_SIZE * 4);
  }

  return atlas;
}

export { DROP_SIZE, ATLAS_COUNT };
