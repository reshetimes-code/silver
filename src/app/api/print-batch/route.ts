import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import sharp from 'sharp';

async function compositePhotoWithOverlay(photoBase64: string, overlayBase64: string | null): Promise<Buffer> {
  // Decode photo
  const photoData = photoBase64.replace(/^data:image\/\w+;base64,/, '');
  const photoBuffer = Buffer.from(photoData, 'base64');

  if (!overlayBase64) {
    // No overlay - just return the photo as JPG
    return sharp(photoBuffer).jpeg({ quality: 92 }).toBuffer();
  }

  // Decode overlay
  const overlayData = overlayBase64.replace(/^data:image\/\w+;base64,/, '');
  const overlayBuffer = Buffer.from(overlayData, 'base64');

  // Get overlay dimensions (overlay defines the final size)
  const overlayMeta = await sharp(overlayBuffer).metadata();
  const width = overlayMeta.width || 1080;
  const height = overlayMeta.height || 1440;

  // Resize photo to match overlay dimensions, covering the full area
  const resizedPhoto = await sharp(photoBuffer)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .toBuffer();

  // Composite: photo on bottom, overlay PNG on top
  const composite = await sharp(resizedPhoto)
    .composite([{ input: overlayBuffer, top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toBuffer();

  return composite;
}

export async function POST(request: NextRequest) {
  const { photoIds } = await request.json();

  if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: 'No photos selected' }, { status: 400 });
  }

  const dropboxToken = process.env.DROPBOX_ACCESS_TOKEN;
  let dropboxFolder = process.env.DROPBOX_FOLDER || '/BeautifulPhotobooth/SelphieBooth/Computer1';
  if (dropboxFolder.includes('Program Files')) {
    dropboxFolder = '/BeautifulPhotobooth/SelphieBooth/Computer1';
  }
  if (!dropboxFolder.startsWith('/')) {
    dropboxFolder = '/' + dropboxFolder;
  }

  if (!dropboxToken) {
    return NextResponse.json({ error: 'Dropbox not configured' }, { status: 500 });
  }

  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds } },
    include: { event: true, overlay: true },
  });

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const photo of photos) {
    try {
      // Composite photo + overlay into final image
      const finalBuffer = await compositePhotoWithOverlay(
        photo.photoUrl,
        photo.overlay?.url || null
      );

      // Sanitize filename to ASCII only
      const safeName = photo.event.name.replace(/[^\x20-\x7E]/g, '').replace(/[/\\:*?"<>|]/g, '_').trim() || 'photo';
      const fileName = `${safeName}_${photo.id.slice(0, 8)}_${Date.now()}.jpg`;
      const filePath = `${dropboxFolder}/${fileName}`;

      const apiArg = JSON.stringify({
        path: filePath,
        mode: 'add',
        autorename: true,
        mute: false,
      });

      const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dropboxToken}`,
          'Dropbox-API-Arg': apiArg,
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(finalBuffer),
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        throw new Error(err);
      }

      await prisma.photo.update({
        where: { id: photo.id },
        data: { printStatus: 'sent' },
      });

      results.push({ id: photo.id, success: true });
    } catch (error) {
      console.error(`Dropbox upload failed for ${photo.id}:`, error);
      results.push({ id: photo.id, success: false, error: String(error) });
    }
  }

  return NextResponse.json({
    total: photos.length,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}
