import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ overlayId: string }> }) {
  const { overlayId } = await params;

  const overlay = await prisma.overlay.findUnique({
    where: { id: overlayId },
    select: { url: true },
  });

  if (!overlay?.url) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Parse data URL — content type is only ever allowed to be a real image
  // type, never passed through as-is (same reasoning as the photo image
  // route: this must never be able to become an executable response).
  const match = overlay.url.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) {
    return new NextResponse('Invalid format', { status: 500 });
  }

  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline; filename="overlay.png"',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
