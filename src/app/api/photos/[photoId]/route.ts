import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await params;
  await prisma.photo.delete({ where: { id: photoId } });
  return NextResponse.json({ success: true });
}
