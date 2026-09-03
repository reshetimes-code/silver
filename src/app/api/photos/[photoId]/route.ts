import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  if (!(await requireSuperAdmin(request))) {
    return NextResponse.json({ error: 'Site management is restricted to admins' }, { status: 403 });
  }
  const { photoId } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.moderationStatus) data.moderationStatus = body.moderationStatus;
  if (body.printStatus) data.printStatus = body.printStatus;

  const photo = await prisma.photo.update({ where: { id: photoId }, data });
  return NextResponse.json(photo);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  if (!(await requireSuperAdmin(request))) {
    return NextResponse.json({ error: 'Site management is restricted to admins' }, { status: 403 });
  }
  const { photoId } = await params;
  await prisma.photo.delete({ where: { id: photoId } });
  return NextResponse.json({ success: true });
}
