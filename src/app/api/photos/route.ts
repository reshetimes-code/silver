import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { moderateImage } from '@/lib/moderation';
import { uploadToDropbox } from '@/lib/dropbox';
import { requireSuperAdmin } from '@/lib/auth';

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

export async function POST(request: NextRequest) {
  const body = await request.json();

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
