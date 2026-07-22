import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { photoIds } = await request.json();

  if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: 'No photos selected' }, { status: 400 });
  }

  const dropboxToken = process.env.DROPBOX_ACCESS_TOKEN;
  const dropboxFolder = process.env.DROPBOX_FOLDER || '/HotFolderPrints';

  if (!dropboxToken) {
    return NextResponse.json({ error: 'Dropbox not configured' }, { status: 500 });
  }

  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds } },
    include: { event: true },
  });

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const photo of photos) {
    try {
      // Convert base64 to binary
      const base64Data = photo.photoUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const fileName = `${photo.event.name}_${photo.id.slice(0, 8)}_${Date.now()}.jpg`;
      const filePath = `${dropboxFolder}/${fileName}`;

      // Upload to Dropbox
      const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dropboxToken}`,
          'Dropbox-API-Arg': JSON.stringify({
            path: filePath,
            mode: 'add',
            autorename: true,
            mute: false,
          }),
          'Content-Type': 'application/octet-stream',
        },
        body: buffer,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        throw new Error(err);
      }

      // Mark as sent
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
