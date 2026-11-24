// Shared by Meapri's map worker and its main-thread fallback.
export async function convexEdgeMap({width, height, radius, thickness, pixelRatio, intensity}, specular = false) {
  const shortSide = Math.min(width, height);
  const band = Math.min(shortSide * 0.30, Math.max(2, thickness * 0.48), 24);
  // The maximum shift stays below band / π, including the RGB spread. The
  // sampling coordinates therefore keep their order through the entire bevel.
  const peakShift = band * 0.23;
  const padding = specular ? 0 : Math.ceil(18 + peakShift * 1.35);
  const totalWidth = width + 2 * padding;
  const totalHeight = height + 2 * padding;
  const columns = Math.max(1, Math.round(totalWidth * pixelRatio));
  const rows = Math.max(1, Math.round(totalHeight * pixelRatio));
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(columns, rows) : document.createElement('canvas');
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext('2d');
  const image = context.createImageData(columns, rows);
  const {data} = image;
  const corner = Math.min(shortSide / 2, radius);
  const flatX = width / 2 - corner;
  const flatY = height / 2 - corner;
  const highlightWidth = Math.min(1.6, band / 2);

  for (let y = 0; y < rows; y++) {
    const dy = (y + 0.5) * totalHeight / rows - totalHeight / 2;
    const qy = Math.abs(dy) - flatY;
    for (let x = 0; x < columns; x++) {
      const dx = (x + 0.5) * totalWidth / columns - totalWidth / 2;
      const qx = Math.abs(dx) - flatX;
      const index = (y * columns + x) * 4;
      if (!specular) {
        data[index] = data[index + 1] = data[index + 2] = 128;
        data[index + 3] = 255;
      }
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const length = ox && oy ? Math.hypot(ox, oy) : ox + oy;
      const depth = corner - length - Math.min(Math.max(qx, qy), 0);
      if (depth <= 0 || depth >= (specular ? highlightWidth : band)) continue;
      const nx = (length ? ox / length : Number(qx > qy)) * Math.sign(dx);
      const ny = (length ? oy / length : Number(qy >= qx)) * Math.sign(dy);
      if (specular) {
        const facingLight = Math.max(0, -0.36 * nx - 0.93 * ny);
        const falloff = (1 - depth / highlightWidth) ** 2;
        data[index] = data[index + 1] = data[index + 2] = 255;
        data[index + 3] = Math.min(160, 110 * intensity * falloff * (0.28 + 0.72 * facingLight ** 2));
      } else {
        // Sample inward along the surface normal. The slope joins the flat
        // centre and outer contour smoothly, with a neutral map on both sides.
        const curve = Math.sin(Math.PI * depth / band) ** 2;
        data[index] = 128 - Math.round(nx * curve * 127);
        data[index + 1] = 128 - Math.round(ny * curve * 127);
      }
    }
  }
  context.putImageData(image, 0, 0);
  // Lossless encoding keeps the neutral value and thin bevel intact.
  const url = canvas.toDataURL ? canvas.toDataURL() : await blobDataUrl(await canvas.convertToBlob());
  return specular ? url : {url, padding, peakShift};
}

function blobDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
