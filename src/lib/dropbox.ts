import { prisma } from './db';
import sharp from 'sharp';

// Cache the access token in memory
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  // If we have a valid cached token, use it
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;

  // If we have refresh token + app credentials, use OAuth refresh
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
      // Expire 5 minutes early to be safe
      tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
      return cachedAccessToken!;
    }

    console.error('Dropbox refresh token failed:', await res.text());
  }

  // Fallback to static access token
  const staticToken = process.env.DROPBOX_ACCESS_TOKEN;
  if (staticToken) return staticToken;

  throw new Error('No Dropbox credentials configured');
}

async function compositePhotoWithOverlay(photoBase64: string, overlayBase64: string | null): Promise<Buffer> {
  const photoData = photoBase64.replace(/^data:image\/\w+;base64,/, '');
  const photoBuffer = Buffer.from(photoData, 'base64');

  if (!overlayBase64) {
    return sharp(photoBuffer).jpeg({ quality: 95 }).toBuffer();
  }

  const overlayData = overlayBase64.replace(/^data:image\/\w+;base64,/, '');
  const overlayBuffer = Buffer.from(overlayData, 'base64');

  const overlayMeta = await sharp(overlayBuffer).metadata();
  const width = overlayMeta.width || 1080;
  const height = overlayMeta.height || 1440;

  const resizedPhoto = await sharp(photoBuffer)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .toBuffer();

  const composite = await sharp(resizedPhoto)
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

    // Create event subfolder
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
