import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { moderateImage } from '@/lib/moderation';
import { uploadToDropbox } from '@/lib/dropbox';
import { requireSuperAdmin } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Listing photos (with each guest's phone number) is site management —
// admins only. Only the admin panel's gallery ever calls this.
export async function GET(request: NextRequest) {
  if (!(await requireSuperAdmin(request))) {
    return NextResponse.json({ error: 'Site management is restricted to admins' }, { status: 403 });
  }
  const eventId = request.nextUrl.searchParams.get('eventId');

  const where = eventId && eventId !== 'all' ? { eventId } : {};
  const photos = await prisma.photo.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      eventId: true,
      overlayId: true,
      deviceId: true,
      phoneNumber: true,
      status: true,
      moderationStatus: true,
      moderationReason: true,
      printStatus: true,
      createdAt: true,
      event: { select: { id: true, name: true } },
      overlay: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(photos);
}

// Only real, decodable image data URLs are ever accepted — this is a public,
// unauthenticated endpoint (any photobooth guest can POST here), and the
// stored value is later served back verbatim with its own mime type by
// GET /api/photos/[photoId]/image. Without this check, someone could store
// e.g. a `data:text/html;...` payload and get script execution in this
// origin (and from there steal any visitor's auth token) just by getting
// anyone to open that photo's URL. Keep this ahead of moderation, which is
// not a type check and fails open on unrelated errors.
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/]+=*$/;

export async function POST(request: NextRequest) {
  // Cheap, unauthenticated, guest-facing endpoint that also triggers a paid
  // Gemini moderation call per accepted request — throttle before doing any
  // real work so it can't be used to run up the moderation bill or flood an
  // event's photo feed.
  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`photos:ip:${ip}`, 30, 10 * 60 * 1000);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads. Please try again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
    );
  }

  const body = await request.json();

  if (typeof body.image !== 'string' || !IMAGE_DATA_URL.test(body.image)) {
    return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
  }
  if (body.rawImage !== undefined && body.rawImage !== null && !IMAGE_DATA_URL.test(body.rawImage)) {
    return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
  }
  if (typeof body.eventId !== 'string' || !body.eventId) {
    return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
  }
  if (typeof body.deviceId !== 'string' || !body.deviceId) {
    return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
  }

  // The event must exist and be active — checked before the paid moderation
  // call below so a bogus/inactive eventId can't be used to burn Gemini
  // quota for free (it would only fail at insert time otherwise).
  const event = await prisma.event.findUnique({
    where: { id: body.eventId },
    select: { active: true, maxPrintsPerDevice: true },
  });
  if (!event || !event.active) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // "Max prints per device" is the client's actual paid business rule — the
  // client-side counter in localStorage (src/lib/store.ts) is a UX nicety
  // only and trivially reset (incognito, clearing storage, or calling this
  // API directly), so it must also be enforced here against the real count.
  const existingCount = await prisma.photo.count({
    where: { eventId: body.eventId, deviceId: body.deviceId },
  });
  if (existingCount >= event.maxPrintsPerDevice) {
    return NextResponse.json({ error: 'Print limit reached for this device' }, { status: 403 });
  }

  // AI Moderation
  const moderation = await moderateImage(body.image);

  if (moderation.status === 'rejected') {
    return NextResponse.json(
      { error: 'photo_rejected', reason: moderation.reason },
      { status: 400 }
    );
  }

  const photo = await prisma.photo.create({
    data: {
      eventId: body.eventId,
      overlayId: body.overlayId === 'none' ? null : body.overlayId,
      photoUrl: body.image,
      sourcePhotoUrl: body.rawImage || null,
      deviceId: body.deviceId,
      phoneNumber: body.phoneNumber || '',
      status: 'pending',
      moderationStatus: moderation.status,
      moderationReason: moderation.reason || null,
    },
  });

  // Auto-upload to Dropbox — rejected photos already returned above, so always upload here
  uploadToDropbox(photo.id).catch((err) => {
    console.error('Auto Dropbox upload failed:', err);
  });

  return NextResponse.json(photo);
}
