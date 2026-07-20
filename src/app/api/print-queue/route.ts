import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Temporary print queue folder (instead of Dropbox)
const PRINT_FOLDER = path.join(process.cwd(), 'public', 'prints');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, image, templateId, overlayText, orientation } = body;

    if (!eventId || !image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure print directory exists
    await mkdir(PRINT_FOLDER, { recursive: true });

    // Create event subdirectory
    const eventFolder = path.join(PRINT_FOLDER, eventId);
    await mkdir(eventFolder, { recursive: true });

    // Extract base64 data and save as file
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const timestamp = Date.now();
    const filename = `photo_${timestamp}.jpg`;
    const filepath = path.join(eventFolder, filename);

    await writeFile(filepath, buffer);

    // Save metadata
    const metadata = {
      eventId,
      templateId,
      overlayText,
      orientation,
      filename,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    const metadataPath = path.join(eventFolder, `photo_${timestamp}.json`);
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      success: true,
      filename,
      message: 'Photo saved to print queue',
    });
  } catch (error) {
    console.error('Print queue error:', error);
    return NextResponse.json({ error: 'Failed to process photo' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { readdir, readFile } = await import('fs/promises');

    const eventDirs = await readdir(PRINT_FOLDER).catch(() => []);
    const allJobs: unknown[] = [];

    for (const dir of eventDirs) {
      const eventPath = path.join(PRINT_FOLDER, dir);
      const files = await readdir(eventPath).catch(() => []);
      const jsonFiles = files.filter((f: string) => f.endsWith('.json'));

      for (const jsonFile of jsonFiles) {
        const content = await readFile(path.join(eventPath, jsonFile), 'utf-8');
        allJobs.push(JSON.parse(content));
      }
    }

    return NextResponse.json({ jobs: allJobs });
  } catch {
    return NextResponse.json({ jobs: [] });
  }
}
