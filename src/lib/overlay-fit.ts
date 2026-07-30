import sharp from 'sharp';

/**
 * Detects the transparent "window" area in an overlay PNG.
 * Returns the bounding box of the transparent region.
 */
export async function detectTransparentArea(overlayBuffer: Buffer): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
  overlayWidth: number;
  overlayHeight: number;
} | null> {
  try {
    const { data, info } = await sharp(overlayBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    if (channels < 4) return null; // No alpha channel

    // Scan for transparent pixels (alpha < 128)
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let foundTransparent = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alphaIndex = (y * width + x) * channels + 3; // Alpha is 4th channel
        if (data[alphaIndex] < 128) {
          foundTransparent = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!foundTransparent) return null;

    // Add small padding (2%) inside the transparent area
    const tw = maxX - minX;
    const th = maxY - minY;
    const padX = Math.round(tw * 0.02);
    const padY = Math.round(th * 0.02);

    return {
      x: minX + padX,
      y: minY + padY,
      width: tw - padX * 2,
      height: th - padY * 2,
      overlayWidth: width,
      overlayHeight: height,
    };
  } catch (error) {
    console.error('Transparent area detection failed:', error);
    return null;
  }
}
