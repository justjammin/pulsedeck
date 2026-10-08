export const MAX_WIDTH = 128;
export const MAX_HEIGHT = 48;

export function createRaster() {
  const buffers = [
    new Uint8Array(MAX_WIDTH * MAX_HEIGHT * 4),
    new Uint8Array(MAX_WIDTH * MAX_HEIGHT * 4)
  ];
  let width = 1, height = 1, index = 0;
  let views = buffers.map(buffer => buffer.subarray(0, 4));
  const dimension = (n, max) => Number.isFinite(n)
    ? Math.max(1, Math.min(max, Math.floor(n)))
    : (n === Infinity ? max : 1);

  return {
    advance() { index = 1 - index; },
    /** Borrowed view: clear/pixel/render operations can overwrite it immediately. */
    resize(w, h) {
      width = dimension(w, MAX_WIDTH);
      height = dimension(h, MAX_HEIGHT);
      if (views[0].length !== width * height * 4) {
        views = buffers.map(buffer => buffer.subarray(0, width * height * 4));
      }
      return {width, height, rgba: views[index]};
    },
    clear() {
      const view = views[index];
      view.fill(0);
      for (let i = 3; i < view.length; i += 4) view[i] = 255;
    },
    pixel(x, y, r, g, b) {
      x = Math.floor(x);
      y = Math.floor(y);
      if (x < 0 || y < 0 || x >= width || y >= height || !Number.isFinite(x + y)) return;
      const offset = (y * width + x) * 4;
      const rgba = buffers[index];
      rgba[offset] = r;
      rgba[offset + 1] = g;
      rgba[offset + 2] = b;
    },
    get width() { return width; },
    get height() { return height; },
    ownedBinaryBytes: buffers[0].byteLength + buffers[1].byteLength
  };
}
