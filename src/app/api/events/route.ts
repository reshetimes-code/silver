import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const events = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const event = await prisma.event.create({
    data: {
      name: body.name,
      date: body.date,
      maxPrintsPerDevice: body.maxPrintsPerDevice || 5,
      active: true,
    },
  });
  return NextResponse.json(event);
}
