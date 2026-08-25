import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ overlayId: string }> }) {
  const { overlayId } = await params;
  const body = await request.json();
  const overlay = await prisma.overlay.update({
    where: { id: overlayId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      // eventId: null means "global — usable by every event"
      ...(body.eventId !== undefined ? { eventId: body.eventId || null } : {}),
    },
  });
  return NextResponse.json(overlay);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ overlayId: string }> }) {
  const { overlayId } = await params;
  await prisma.overlay.delete({ where: { id: overlayId } });
  return NextResponse.json({ success: true });
}
