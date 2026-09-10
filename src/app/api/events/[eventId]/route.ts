import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';

// Public — guests need this to load the capture page for their event.
// Deliberately scoped to display-only fields: this is reachable by anyone
// with the event's QR-code URL, so it must never leak ownerId (an internal
// user id) or dropboxPath (internal storage layout) the way an unscoped
// findUnique() would.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, date: true, maxPrintsPerDevice: true, active: true },
  });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  if (!(await requireSuperAdmin(request))) {
    return NextResponse.json({ error: 'Site management is restricted to admins' }, { status: 403 });
  }
  const { eventId } = await params;
  const body = await request.json();
  // Allow-list rather than passing the body straight into `data` — keeps
  // internal-only columns (dropboxPath, id, createdAt...) from ever being
  // settable through this endpoint, even by a super admin's client.
  const { name, date, maxPrintsPerDevice, active, ownerId } = body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (date !== undefined) data.date = date;
  if (maxPrintsPerDevice !== undefined) data.maxPrintsPerDevice = maxPrintsPerDevice;
  if (active !== undefined) data.active = active;
  if (ownerId !== undefined) data.ownerId = ownerId;

  const event = await prisma.event.update({ where: { id: eventId }, data });
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
