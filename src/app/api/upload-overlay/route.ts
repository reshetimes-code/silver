import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!(await requireSuperAdmin(request))) {
    return NextResponse.json({ error: 'Site management is restricted to admins' }, { status: 403 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get('overlay') as File;
    const name = (formData.get('name') as string) || file?.name?.replace(/\.[^.]+$/, '') || 'Overlay';

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    // Convert to base64 data URL for storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/png';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const eventId = formData.get('eventId') as string | null;

    const overlay = await prisma.overlay.create({
      data: { name, url: dataUrl, eventId: eventId || null },
    });

    return NextResponse.json({ success: true, overlay });
  } catch (error) {
    console.error('Overlay upload error:', error);
    return NextResponse.json({ error: 'Failed to upload overlay' }, { status: 500 });
  }
}
