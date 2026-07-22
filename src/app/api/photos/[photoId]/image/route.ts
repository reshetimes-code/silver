import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await params;
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });

  if (!photo) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Convert base64 data URL to binary
  const matches = photo.photoUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    return NextResponse.json({ error: 'Invalid image' }, { status: 500 });
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
