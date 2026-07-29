import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get('eventId');
  const full = request.nextUrl.searchParams.get('full') === 'true';

  const selectFields = full
    ? undefined // return everything including url (for guest overlay rendering)
    : { id: true, name: true, eventId: true, createdAt: true }; // admin list — no base64

  if (eventId) {
    const overlays = await prisma.overlay.findMany({
      where: { OR: [{ eventId }, { eventId: null }] },
      orderBy: { createdAt: 'desc' },
      ...(selectFields ? { select: selectFields } : {}),
    });
    return NextResponse.json(overlays);
  }

  const overlays = await prisma.overlay.findMany({
    orderBy: { createdAt: 'desc' },
    ...(selectFields ? { select: selectFields } : {}),
  });
  return NextResponse.json(overlays);
}
