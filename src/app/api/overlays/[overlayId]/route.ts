import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ overlayId: string }> }) {
  if (!(await requireSuperAdmin(request))) {
    return NextResponse.json({ error: 'Site management is restricted to admins' }, { status: 403 });
  }
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ overlayId: string }> }) {
  if (!(await requireSuperAdmin(request))) {
    return NextResponse.json({ error: 'Site management is restricted to admins' }, { status: 403 });
  }
  const { overlayId } = await params;
  await prisma.overlay.delete({ where: { id: overlayId } });
  return NextResponse.json({ success: true });
}
