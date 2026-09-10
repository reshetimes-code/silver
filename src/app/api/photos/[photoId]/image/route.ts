import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await params;
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });

  if (!photo) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Convert base64 data URL to binary. The mime type is never trusted from
  // the stored value as-is — it's only ever allowed to be a real image type,
  // so this can't be turned into an `text/html` (or similar) response that
  // would execute as a page in this origin (POST /api/photos already
  // enforces the same allow-list on the way in; this is defense in depth).
  const matches = photo.photoUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!matches) {
    return NextResponse.json({ error: 'Invalid image' }, { status: 500 });
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Length': buffer.length.toString(),
      'Content-Disposition': 'inline; filename="photo.jpg"',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
