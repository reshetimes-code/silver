import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.moderationStatus) data.moderationStatus = body.moderationStatus;
  if (body.printStatus) data.printStatus = body.printStatus;

  const photo = await prisma.photo.update({ where: { id: photoId }, data });
  return NextResponse.json(photo);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await params;
  await prisma.photo.delete({ where: { id: photoId } });
  return NextResponse.json({ success: true });
}
