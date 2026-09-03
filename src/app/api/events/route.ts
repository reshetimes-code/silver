import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest, isSuperAdmin, requireSuperAdmin } from '@/lib/auth';
import { createEventDropboxFolder } from '@/lib/dropbox';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  // If authenticated admin — return scoped events
  if (user) {
    if (isSuperAdmin(user)) {
      // Super admin sees all events
      const events = await prisma.event.findMany({
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: { name: true, email: true } } },
      });
      return NextResponse.json(events);
    } else {
      // Account manager sees only their events
      const events = await prisma.event.findMany({
        where: { ownerId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(events);
    }
  }

  // Public — only active events (for guest landing page)
  const events = await prisma.event.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, date: true, active: true },
  });
  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin(request);
  if (!user) {
    return NextResponse.json({ error: 'Site management is restricted to admins' }, { status: 403 });
  }
  const body = await request.json();

  const event = await prisma.event.create({
    data: {
      name: body.name,
      date: body.date,
      maxPrintsPerDevice: body.maxPrintsPerDevice || 5,
      active: true,
      ownerId: user.id,
    },
  });

  // Create the Dropbox folder right away so it exists before any photos are
  // taken. Best-effort: if Dropbox is unreachable, the event still gets
  // created and the folder falls back to being created lazily on first upload.
  const dropboxPath = await createEventDropboxFolder(event.name);
  if (dropboxPath) {
    await prisma.event.update({ where: { id: event.id }, data: { dropboxPath } });
    event.dropboxPath = dropboxPath;
  }

  return NextResponse.json(event);
}
