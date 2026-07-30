import { prisma } from './db';
import sharp from 'sharp';
import { detectTransparentArea } from './overlay-fit';

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
 * Smart composite: detects the transparent window in the overlay PNG,
 * then fits the photo INTO that window (not behind the entire frame).
 * This ensures the photo is visible and faces aren't hidden behind opaque borders.
 */
async function compositePhotoWithOverlay(photoBase64: string, overlayBase64: string | null): Promise<Buffer> {
  const photoData = photoBase64.replace(/^data:image\/\w+;base64,/, '');
  const photoBuffer = Buffer.from(photoData, 'base64');

  if (!overlayBase64) {
    return sharp(photoBuffer).jpeg({ quality: 95 }).toBuffer();
  }

  const overlayData = overlayBase64.replace(/^data:image\/\w+;base64,/, '');
  const overlayBuffer = Buffer.from(overlayData, 'base64');

  const overlayMeta = await sharp(overlayBuffer).metadata();
  const overlayW = overlayMeta.width || 1080;
  const overlayH = overlayMeta.height || 1440;

  // Detect transparent window in the overlay
  const transparentArea = await detectTransparentArea(overlayBuffer);

  if (transparentArea) {
    // Resize photo to fit inside the transparent window
    const resizedPhoto = await sharp(photoBuffer)
      .resize(transparentArea.width, transparentArea.height, { fit: 'cover', position: 'centre' })
      .toBuffer();

    // Create blur-filled background (stretched + blurred photo)
    const blurBg = await sharp(photoBuffer)
      .resize(overlayW, overlayH, { fit: 'cover', position: 'centre' })
      .blur(25)
      .modulate({ brightness: 0.5 })
      .toBuffer();

    // Composite: blur bg → photo in window → overlay on top
    const canvas = await sharp(blurBg)
      .composite([
        { input: resizedPhoto, top: transparentArea.y, left: transparentArea.x },
        { input: overlayBuffer, top: 0, left: 0 },
      ])
      .jpeg({ quality: 95 })
      .toBuffer();

    return canvas;
  }

  // Fallback: no transparent area detected — blur bg + contain photo + overlay
  const blurBg = await sharp(photoBuffer)
    .resize(overlayW, overlayH, { fit: 'cover', position: 'centre' })
    .blur(25)
    .modulate({ brightness: 0.5 })
    .toBuffer();

  const containPhoto = await sharp(photoBuffer)
    .resize(overlayW, overlayH, { fit: 'inside', position: 'centre' })
    .toBuffer();

  const containMeta = await sharp(containPhoto).metadata();
  const padX = Math.round((overlayW - (containMeta.width || overlayW)) / 2);
  const padY = Math.round((overlayH - (containMeta.height || overlayH)) / 2);

  const composite = await sharp(blurBg)
    .composite([
      { input: containPhoto, top: padY, left: padX },
      { input: overlayBuffer, top: 0, left: 0 },
    ])
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
