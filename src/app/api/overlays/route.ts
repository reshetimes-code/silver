import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get('eventId');

  // If eventId provided, return overlays for that event + global overlays
  if (eventId) {
    const overlays = await prisma.overlay.findMany({
      where: { OR: [{ eventId }, { eventId: null }] },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(overlays);
  }

  // Otherwise return all
  const overlays = await prisma.overlay.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(overlays);
}
