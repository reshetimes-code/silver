import { NextResponse } from 'next/server';
import { prisma, ensureDropboxAccountTable } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// PATCH /api/dropbox/select-folder { path } — persists the manager's chosen
// destination folder (existing or newly created) as their upload root.
export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { path } = await request.json();
  if (!path || typeof path !== 'string') {
    return NextResponse.json({ error: 'Folder path required' }, { status: 400 });
  }

  await ensureDropboxAccountTable();
  const existing = await prisma.dropboxAccount.findUnique({ where: { userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: 'Dropbox not connected' }, { status: 409 });
  }

  await prisma.dropboxAccount.update({
    where: { userId: user.id },
    data: { rootFolderPath: path },
  });

  return NextResponse.json({ rootFolderPath: path });
}
