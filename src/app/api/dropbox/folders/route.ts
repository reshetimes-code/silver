import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getAccessTokenForUser, listDropboxFolder, createDropboxFolder, DropboxPathNotFoundError } from '@/lib/dropbox-oauth';

// GET /api/dropbox/folders?path=/Some/Path — list subfolders of `path` in
// the logged-in manager's own connected Dropbox ("" / omitted = root).
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const account = await getAccessTokenForUser(user.id);
  if (!account) {
    return NextResponse.json({ error: 'Dropbox not connected' }, { status: 409 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';

  try {
    const folders = await listDropboxFolder(account.accessToken, path);
    return NextResponse.json({ folders });
  } catch (err) {
    if (err instanceof DropboxPathNotFoundError) {
      // Not a real failure — most often the browser was mid-way through
      // browsing a path that only existed in a previously connected
      // account. 404 + this code lets the client fall back to root
      // instead of showing a scary "check your connection" error.
      return NextResponse.json({ error: 'path_not_found' }, { status: 404 });
    }
    console.error('List Dropbox folders failed:', err);
    return NextResponse.json({ error: 'Failed to list Dropbox folders' }, { status: 502 });
  }
}

// POST /api/dropbox/folders { parentPath, name } — create a new folder under
// parentPath in the logged-in manager's own connected Dropbox.
export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const account = await getAccessTokenForUser(user.id);
  if (!account) {
    return NextResponse.json({ error: 'Dropbox not connected' }, { status: 409 });
  }

  const { parentPath, name } = await request.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Folder name required' }, { status: 400 });
  }

  try {
    const path = await createDropboxFolder(account.accessToken, parentPath || '', name);
    return NextResponse.json({ path });
  } catch (err) {
    console.error('Create Dropbox folder failed:', err);
    return NextResponse.json({ error: 'Failed to create Dropbox folder' }, { status: 502 });
  }
}
