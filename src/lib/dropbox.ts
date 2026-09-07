import { prisma } from './db';
import sharp from 'sharp';
import { detectTransparentArea } from './overlay-fit';
import { asciiSafeJson, sanitizeFolderName, refreshDropboxToken, getAccessTokenForUser } from './dropbox-oauth';

// Cache the shared account's access token in memory (used for events whose
// owner hasn't connected their own Dropbox account).
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
    try {
      const { accessToken, expiresIn } = await refreshDropboxToken(refreshToken);
      cachedAccessToken = accessToken;
      tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;
      return cachedAccessToken;
    } catch (error) {
      console.error('Dropbox refresh token failed:', error);
    }
  }

  const staticToken = process.env.DROPBOX_ACCESS_TOKEN;
  if (staticToken) return staticToken;
  throw new Error('No Dropbox credentials configured');
}

/**
 * Creates a Dropbox folder for a new event right away (instead of waiting for
 * the first photo upload to lazily create it). Returns the folder path to
 * store on the event so all future photos land in exactly this folder even
 * if the event is later renamed. Returns null (never throws) if Dropbox
 * isn't reachable — event creation should still succeed either way.
 *
 * If the event's owner has connected their own Dropbox account and picked a
 * destination folder, the subfolder is created there (under their chosen
 * root) using their own access token. Otherwise falls back to today's
 * shared-account behavior unchanged, so events with no connected owner keep
 * working exactly as before.
 */
export async function createEventDropboxFolder(eventName: string, ownerId?: string | null): Promise<string | null> {
  try {
    const ownerAccount = await getAccessTokenForUser(ownerId);
    const usingOwnAccount = !!ownerAccount?.rootFolderPath;

    const accessToken = usingOwnAccount ? ownerAccount!.accessToken : await getAccessToken();

    let dropboxFolder = usingOwnAccount
      ? ownerAccount!.rootFolderPath!
      : process.env.DROPBOX_FOLDER || '/BeautifulPhotobooth/SelphieBooth/Computer1';
    if (!dropboxFolder.startsWith('/')) dropboxFolder = '/' + dropboxFolder;

    const safeEventName = sanitizeFolderName(eventName, 'Event');
    const eventFolder = `${dropboxFolder}/${safeEventName}`;

    const res = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: eventFolder, autorename: false }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.metadata.path_display || eventFolder;
    }

    // Folder already exists (e.g. duplicate event name) — that's fine, reuse it.
    const err = await res.json().catch(() => null);
    if (err?.error?.['.tag'] === 'path' && err.error.path?.['.tag'] === 'conflict') {
      return eventFolder;
    }

    console.error('Dropbox create_folder_v2 failed:', err || (await res.text()));
    return null;
  } catch (error) {
    console.error('Failed to create Dropbox folder for event:', error);
    return null;
  }
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
  const overlayW = overlayMeta.width || 1240;
  const overlayH = overlayMeta.height || 1844;

  // Detect transparent window in the overlay
  const transparentArea = await detectTransparentArea(overlayBuffer);

  // Create blur-filled background
  const blurBg = await sharp(photoBuffer)
    .resize(overlayW, overlayH, { fit: 'cover', position: 'centre' })
    .blur(30)
    .modulate({ brightness: 0.5 })
    .toBuffer();

  if (transparentArea) {
    // Resize photo to fit inside the transparent window
    const resizedPhoto = await sharp(photoBuffer)
      .resize(transparentArea.width, transparentArea.height, { fit: 'cover', position: 'centre' })
      .toBuffer();

    // Composite: blur bg → photo in window → overlay frame on top
    const canvas = await sharp(blurBg)
      .composite([
        { input: resizedPhoto, top: transparentArea.y, left: transparentArea.x },
        { input: overlayBuffer, top: 0, left: 0 },
      ])
      .jpeg({ quality: 95 })
      .toBuffer();

    return canvas;
  }

  // Fallback: contain photo centered on blur bg
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
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { event: true, overlay: true },
    });

    if (!photo) return { success: false, error: 'Photo not found' };

    // Route to the event owner's own connected Dropbox account, but only if
    // this event's stored folder actually lives under that account's chosen
    // root — i.e. the event was created (or its folder assigned) after the
    // owner connected. An event created earlier (shared-account folder, or
    // an owner who connects Dropbox only *after* the fact) must keep using
    // the shared account, since that's where its folder actually exists.
    const ownerAccount = await getAccessTokenForUser(photo.event.ownerId);
    const usingOwnAccount = !!(
      ownerAccount?.rootFolderPath &&
      photo.event.dropboxPath?.startsWith(ownerAccount.rootFolderPath)
    );
    const accessToken = usingOwnAccount ? ownerAccount!.accessToken : await getAccessToken();

    const finalBuffer = await compositePhotoWithOverlay(
      photo.photoUrl,
      photo.overlay?.url || null
    );

    // Use the folder created (and stored) at event-creation time so photos always
    // land together even if the event was renamed since. Older events created
    // before this field existed fall back to computing the path from the name.
    let eventFolder = photo.event.dropboxPath;
    if (!eventFolder) {
      let dropboxFolder = process.env.DROPBOX_FOLDER || '/BeautifulPhotobooth/SelphieBooth/Computer1';
      if (!dropboxFolder.startsWith('/')) dropboxFolder = '/' + dropboxFolder;
      const safeEventName = photo.event.name.replace(/[/\\:*?"<>|]/g, '_').trim() || 'Event';
      eventFolder = `${dropboxFolder}/${safeEventName}`;
    }
    const fileName = `photo_${photo.id.slice(0, 8)}_${Date.now()}.jpg`;
    const filePath = `${eventFolder}/${fileName}`;

    const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': asciiSafeJson({ path: filePath, mode: 'add', autorename: true, mute: false }),
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(finalBuffer),
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(err);
    }

    // Also save the pre-frame original into a "Source Photos" subfolder, so
    // frames can be applied manually later (e.g. in desktop software) — only
    // present when a frame was actually baked into the main upload above.
    // Best-effort: a failure here shouldn't fail the whole upload, since the
    // framed photo (what guests actually see/print) already succeeded.
    if (photo.sourcePhotoUrl) {
      try {
        const sourceData = photo.sourcePhotoUrl.replace(/^data:image\/\w+;base64,/, '');
        const sourceBuffer = Buffer.from(sourceData, 'base64');
        const sourcePath = `${eventFolder}/Source Photos/${fileName}`;
        const sourceRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Dropbox-API-Arg': asciiSafeJson({ path: sourcePath, mode: 'add', autorename: true, mute: false }),
            'Content-Type': 'application/octet-stream',
          },
          body: new Uint8Array(sourceBuffer),
        });
        if (!sourceRes.ok) {
          console.error(`Source photo upload failed for ${photoId}:`, await sourceRes.text());
        }
      } catch (sourceErr) {
        console.error(`Source photo upload failed for ${photoId}:`, sourceErr);
      }
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
