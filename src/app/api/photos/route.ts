import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

  const photo = await prisma.photo.create({
    data: {
      eventId: body.eventId,
      overlayId: body.overlayId === 'none' ? null : body.overlayId,
      photoUrl: body.image,
      deviceId: body.deviceId,
      status: 'pending',
    },
  });

  return NextResponse.json(photo);
}
