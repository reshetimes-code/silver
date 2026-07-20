import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ overlayId: string }> }) {
  const { overlayId } = await params;
  await prisma.overlay.delete({ where: { id: overlayId } });
  return NextResponse.json({ success: true });
}
