import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';

// Public — guests need this to load the capture page for their event.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!(await requireSuperAdmin(request))) {
    return NextResponse.json({ error: 'Site management is restricted to admins' }, { status: 403 });
  }
  const { eventId } = await params;
  const body = await request.json();
  const event = await prisma.event.update({ where: { id: eventId }, data: body });
  return NextResponse.json(event);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!(await requireSuperAdmin(request))) {
    return NextResponse.json({ error: 'Site management is restricted to admins' }, { status: 403 });
  }
  const { eventId } = await params;
  await prisma.event.delete({ where: { id: eventId } });
  return NextResponse.json({ success: true });
}
