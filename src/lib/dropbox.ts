import { prisma } from './db';
import sharp from 'sharp';

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
  const dropboxToken = process.env.DROPBOX_ACCESS_TOKEN;
  if (!dropboxToken) {
    return { success: false, error: 'Dropbox not configured' };
  }

  let dropboxFolder = process.env.DROPBOX_FOLDER || '/BeautifulPhotobooth/SelphieBooth/Computer1';
  if (!dropboxFolder.startsWith('/')) dropboxFolder = '/' + dropboxFolder;

  try {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { event: true, overlay: true },
    });

    if (!photo) return { success: false, error: 'Photo not found' };

    const finalBuffer = await compositePhotoWithOverlay(
      photo.photoUrl,
      photo.overlay?.url || null
    );

    const safeName = photo.event.name.replace(/[^\x20-\x7E]/g, '').replace(/[/\\:*?"<>|]/g, '_').trim() || 'photo';
    const fileName = `${safeName}_${photo.id.slice(0, 8)}_${Date.now()}.jpg`;
    const filePath = `${dropboxFolder}/${fileName}`;

    const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxToken}`,
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
