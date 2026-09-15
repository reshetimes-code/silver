import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Public — this is the endpoint behind the shareable "event gallery" link an
// event owner hands out to their guests (see the "🖼️ גלריה" action in the
// admin panel), so it's deliberately unauthenticated: anyone with the link
// (an unguessable event id, the same access model the capture-page QR link
// already relies on) can list a given event's photos. Only ever returns
// display-safe fields (photo id + when it was taken) — never a guest's
// phone number, moderation notes, or anything else from the admin-only
// GET /api/photos. Actual image bytes are served by the already-public
// GET /api/photos/[photoId]/image.
export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  // A shared gallery link can get hit by many guests behind the same venue
  // Wi-Fi/NAT at once — keep this generous so a real crowd never trips it,
  // while still bounding a single IP scripting through event ids.
  const ip = getClientIp(request);
  const limit = checkRateLimit(`gallery:ip:${ip}`, 120, 5 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  const { eventId } = await params;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true },
  });
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Deliberately not gated on event.active — the whole point of a gallery is
  // browsing it after the event (and its "take a photo" flow) has ended.
  const photos = await prisma.photo.findMany({
    where: { eventId, moderationStatus: 'approved' },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ event, photos });
}
