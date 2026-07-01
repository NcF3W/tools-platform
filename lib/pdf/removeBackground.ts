export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const MAX_RGB_DISTANCE = Math.sqrt(255 * 255 * 3);

function colorDistance(a: RgbColor, b: RgbColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Setzt Alpha=0 für alle Pixel, deren Farbe nah genug an bgColor liegt.
// tolerance: 0-100, wird auf die maximale RGB-Distanz skaliert.
export function applyColorKeyTransparency(
  imageData: ImageData,
  bgColor: RgbColor,
  tolerance: number,
): void {
  const maxDistance = MAX_RGB_DISTANCE * (tolerance / 100);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const pixel: RgbColor = { r: data[i], g: data[i + 1], b: data[i + 2] };
    if (colorDistance(pixel, bgColor) <= maxDistance) {
      data[i + 3] = 0;
    }
  }
}
