import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient();

export interface FaceBounds {
  centerX: number; // 0-1 relative position
  centerY: number;
  topY: number;    // top of highest face (0-1)
  bottomY: number; // bottom of lowest face (0-1)
  leftX: number;   // leftmost face edge (0-1)
  rightX: number;  // rightmost face edge (0-1)
  count: number;
}

/**
 * Detect faces and return their center point relative to image dimensions.
 * Returns null if no faces found.
 */
export async function detectFaces(imageBuffer: Buffer, imgWidth: number, imgHeight: number): Promise<FaceBounds | null> {
  try {
    const [result] = await client.faceDetection({ image: { content: imageBuffer } });
    const faces = result.faceAnnotations || [];

    if (faces.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;

    for (const face of faces) {
      const vertices = face.boundingPoly?.vertices || [];
      for (const v of vertices) {
        const x = (v.x || 0) / imgWidth;
        const y = (v.y || 0) / imgHeight;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    // Add padding above heads (20% of face height)
    const faceHeight = maxY - minY;
    const paddedTopY = Math.max(0, minY - faceHeight * 0.3);

    return {
      centerX: (minX + maxX) / 2,
      centerY: (paddedTopY + maxY) / 2,
      topY: paddedTopY,
      bottomY: Math.min(1, maxY + faceHeight * 0.1),
      leftX: Math.max(0, minX - 0.05),
      rightX: Math.min(1, maxX + 0.05),
      count: faces.length,
    };
  } catch (error) {
    console.error('Face detection for centering failed:', error);
    return null;
  }
}
