import { NextRequest, NextResponse } from 'next/server';
import { uploadToDropbox } from '@/lib/dropbox';

export async function POST(request: NextRequest) {
  const { photoIds } = await request.json();

  if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: 'No photos selected' }, { status: 400 });
  }

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const photoId of photoIds) {
    const result = await uploadToDropbox(photoId);
    results.push({ id: photoId, ...result });
  }

  return NextResponse.json({
    total: photoIds.length,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}
