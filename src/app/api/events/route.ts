import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest, isSuperAdmin } from '@/lib/auth';

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
  const user = await getUserFromRequest(request);
  const body = await request.json();

  const event = await prisma.event.create({
    data: {
      name: body.name,
      date: body.date,
      maxPrintsPerDevice: body.maxPrintsPerDevice || 5,
      active: true,
      ownerId: user?.id || null,
    },
  });
  return NextResponse.json(event);
}
