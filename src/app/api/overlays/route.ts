import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const overlays = await prisma.overlay.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(overlays);
}
