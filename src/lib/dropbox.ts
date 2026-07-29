import { prisma } from './db';
import sharp from 'sharp';
import { detectFaces } from './face-detect';

// Cache the access token in memory
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;

  if (refreshToken && appKey && appSecret) {
    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: appKey,
        client_secret: appSecret,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      cachedAccessToken = data.access_token;
      tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
      return cachedAccessToken!;
    }
    console.error('Dropbox refresh token failed:', await res.text());
  }

  const staticToken = process.env.DROPBOX_ACCESS_TOKEN;
  if (staticToken) return staticToken;
  throw new Error('No Dropbox credentials configured');
}

/**
 * Smart composite: detects faces and centers the crop so faces are never cut off.
 * Falls back to center crop if no faces detected.
 */
async function compositePhotoWithOverlay(photoBase64: string, overlayBase64: string | null): Promise<Buffer> {
  const photoData = photoBase64.replace(/^data:image\/\w+;base64,/, '');
  const photoBuffer = Buffer.from(photoData, 'base64');

  if (!overlayBase64) {
    return sharp(photoBuffer).jpeg({ quality: 95 }).toBuffer();
  }

  const overlayData = overlayBase64.replace(/^data:image\/\w+;base64,/, '');
  const overlayBuffer = Buffer.from(overlayData, 'base64');

  // Get dimensions
  const overlayMeta = await sharp(overlayBuffer).metadata();
  const targetW = overlayMeta.width || 1080;
  const targetH = overlayMeta.height || 1440;
  const targetRatio = targetW / targetH;

  const photoMeta = await sharp(photoBuffer).metadata();
  const srcW = photoMeta.width || 1080;
  const srcH = photoMeta.height || 1440;
  const srcRatio = srcW / srcH;

  // Detect faces for smart centering
  const faces = await detectFaces(photoBuffer, srcW, srcH);

  let cropX = 0, cropY = 0, cropW = srcW, cropH = srcH;

  if (srcRatio > targetRatio) {
    // Photo is wider than target — need to crop sides
    cropH = srcH;
    cropW = Math.round(srcH * targetRatio);

    if (faces) {
      // Center crop on face center X
      cropX = Math.round(faces.centerX * srcW - cropW / 2);
    } else {
      cropX = Math.round((srcW - cropW) / 2);
    }
    cropX = Math.max(0, Math.min(cropX, srcW - cropW));
  } else {
    // Photo is taller than target — need to crop top/bottom
    cropW = srcW;
    cropH = Math.round(srcW / targetRatio);

    if (faces) {
      // Position so faces are in upper-center, with head room
      const faceTopPx = faces.topY * srcH;
      // Put faces starting at ~25% from top of crop area
      cropY = Math.round(faceTopPx - cropH * 0.2);
    } else {
      cropY = Math.round((srcH - cropH) / 2);
    }
    cropY = Math.max(0, Math.min(cropY, srcH - cropH));
  }

  // Extract the smart-cropped region
  const croppedPhoto = await sharp(photoBuffer)
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .resize(targetW, targetH)
    .toBuffer();

  // Composite: photo on bottom, overlay PNG on top
  const composite = await sharp(croppedPhoto)
    .composite([{ input: overlayBuffer, top: 0, left: 0 }])
    .jpeg({ quality: 95 })
    .toBuffer();

  return composite;
}

export async function uploadToDropbox(photoId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getAccessToken();

    let dropboxFolder = process.env.DROPBOX_FOLDER || '/BeautifulPhotobooth/SelphieBooth/Computer1';
    if (!dropboxFolder.startsWith('/')) dropboxFolder = '/' + dropboxFolder;

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { event: true, overlay: true },
    });

    if (!photo) return { success: false, error: 'Photo not found' };

    const finalBuffer = await compositePhotoWithOverlay(
      photo.photoUrl,
      photo.overlay?.url || null
    );

    const safeEventName = photo.event.name.replace(/[^\x20-\x7E]/g, '').replace(/[/\\:*?"<>|]/g, '_').trim() || 'Event';
    const eventFolder = `${dropboxFolder}/${safeEventName}`;
    const fileName = `photo_${photo.id.slice(0, 8)}_${Date.now()}.jpg`;
    const filePath = `${eventFolder}/${fileName}`;

    const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: filePath, mode: 'add', autorename: true, mute: false }),
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(finalBuffer),
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(err);
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: { printStatus: 'sent' },
    });

    return { success: true };
  } catch (error) {
    console.error(`Dropbox upload failed for ${photoId}:`, error);
    return { success: false, error: String(error) };
  }
}
