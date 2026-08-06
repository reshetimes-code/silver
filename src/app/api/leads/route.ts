import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// POST /api/leads — public (called from event page)
export async function POST(req: NextRequest) {
  try {
    const { name, phone, eventDate, eventId } = await req.json();

    if (!phone || !eventDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Look up the event to get ownerId
    let ownerId: string | null = null;
    if (eventId) {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { ownerId: true },
      });
      ownerId = event?.ownerId ?? null;
    }

    const lead = await prisma.lead.create({
      data: {
        name: (name || '').trim(),
        phone: phone.trim(),
        eventDate: eventDate.trim(),
        sourceEventId: eventId || null,
        ownerId,
      },
    });

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error('Lead creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/leads — auth required, update handled status
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req as unknown as Request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, handled } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const lead = await prisma.lead.update({
      where: { id },
      data: { handled: Boolean(handled) },
    });

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error('Lead update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/leads — auth required
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req as unknown as Request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = user.role === 'super_admin';

    const leads = await prisma.lead.findMany({
      where: isSuperAdmin ? {} : { ownerId: user.id },
      include: {
        owner: { select: { name: true, email: true } },
        sourceEvent: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error('Leads fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
