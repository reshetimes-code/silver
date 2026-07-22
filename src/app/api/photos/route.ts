import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { moderateImage } from '@/lib/moderation';

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get('eventId');

  const where = eventId && eventId !== 'all' ? { eventId } : {};
  const photos = await prisma.photo.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { event: true, overlay: true },
  });

  return NextResponse.json(photos);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // AI Moderation - check the image before saving
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
      deviceId: body.deviceId,
      phoneNumber: body.phoneNumber || '',
      status: 'pending',
      moderationStatus: moderation.status,
      moderationReason: moderation.reason || null,
    },
  });

  return NextResponse.json(photo);
}
