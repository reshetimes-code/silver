import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// POST /api/leads — public (called from event page and the marketing landing page)
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`leads:post:${ip}`, 8, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

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
    const user = await requireSuperAdmin(req as unknown as Request);
    if (!user) return NextResponse.json({ error: 'Site management is restricted to admins' }, { status: 403 });

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

// GET /api/leads?phone=xxx → public exists check (no auth)
// GET /api/leads        → full list (auth required)
export async function GET(req: NextRequest) {
  try {
    // Public check: does a lead exist for this phone?
    const phone = req.nextUrl.searchParams.get('phone');
    if (phone) {
      const ip = getClientIp(req);
      const limit = checkRateLimit(`leads:phone-check:${ip}`, 30, 10 * 60 * 1000);
      if (!limit.allowed) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
        );
      }
      const existing = await prisma.lead.findFirst({
        where: { phone: phone.trim() },
        select: { id: true },
      });
      return NextResponse.json({ exists: !!existing });
    }

    // Full list is site management — admins only.
    const user = await requireSuperAdmin(req as unknown as Request);
    if (!user) {
      return NextResponse.json({ error: 'Site management is restricted to admins' }, { status: 403 });
    }

    const leads = await prisma.lead.findMany({
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

// DELETE /api/leads — auth required
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireSuperAdmin(req as unknown as Request);
    if (!user) return NextResponse.json({ error: 'Site management is restricted to admins' }, { status: 403 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lead delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
