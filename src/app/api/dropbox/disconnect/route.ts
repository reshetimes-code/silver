import { NextResponse } from 'next/server';
import { prisma, ensureDropboxAccountTable } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { getAccessTokenForUser, revokeDropboxToken, invalidateUserTokenCache } from '@/lib/dropbox-oauth';

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await ensureDropboxAccountTable();

  // Best-effort revoke with Dropbox — the local disconnect proceeds either way.
  try {
    const account = await getAccessTokenForUser(user.id);
    if (account) await revokeDropboxToken(account.accessToken);
  } catch (err) {
    console.error('Dropbox revoke-on-disconnect failed:', err);
  }

  await prisma.dropboxAccount.deleteMany({ where: { userId: user.id } });
  invalidateUserTokenCache(user.id);

  return NextResponse.json({ success: true });
}
