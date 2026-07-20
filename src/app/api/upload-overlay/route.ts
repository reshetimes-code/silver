import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const OVERLAYS_FOLDER = path.join(process.cwd(), 'public', 'overlays');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('overlay') as File;
    const eventId = formData.get('eventId') as string;

    if (!file || !eventId) {
      return NextResponse.json({ error: 'Missing file or eventId' }, { status: 400 });
    }

    await mkdir(OVERLAYS_FOLDER, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${eventId}.${ext}`;
    const filepath = path.join(OVERLAYS_FOLDER, filename);

    await writeFile(filepath, buffer);

    return NextResponse.json({
      success: true,
      url: `/overlays/${filename}`,
    });
  } catch (error) {
    console.error('Overlay upload error:', error);
    return NextResponse.json({ error: 'Failed to upload overlay' }, { status: 500 });
  }
}
