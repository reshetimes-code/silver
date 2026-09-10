import { NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';
import { getJwtSecret } from '@/lib/auth';
import { exchangeCodeForToken, getCurrentAccount } from '@/lib/dropbox-oauth';
import { getBaseUrl } from '@/lib/url';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const baseUrl = getBaseUrl(request);

  if (error || !code || !state) {
    return NextResponse.redirect(`${baseUrl}/dashboard/storage?error=dropbox_cancelled`);
  }

  let userId: string;
  try {
    const payload = jwt.verify(state, getJwtSecret(), { algorithms: ['HS256'] }) as { userId: string };
    userId = payload.userId;
  } catch {
    return NextResponse.redirect(`${baseUrl}/dashboard/storage?error=dropbox_failed`);
  }

  try {
    const redirectUri = `${baseUrl}/api/auth/dropbox/callback`;
    const { accessToken, refreshToken } = await exchangeCodeForToken(code, redirectUri);
    const account = await getCurrentAccount(accessToken);

    // Reconnecting to a *different* Dropbox account than before means the
    // previously chosen folder may not even exist there — clear it so the
    // manager picks again. Re-authorizing the *same* account (e.g. after a
    // revoked/expired session) keeps the folder they already chose.
    const existing = await prisma.dropboxAccount.findUnique({ where: { userId } });
    const keepFolder = existing?.dropboxAccountId === account.accountId;

    await prisma.dropboxAccount.upsert({
      where: { userId },
      create: {
        userId,
        dropboxAccountId: account.accountId,
        accountEmail: account.email,
        accountName: account.name,
        refreshToken,
      },
      update: {
        dropboxAccountId: account.accountId,
        accountEmail: account.email,
        accountName: account.name,
        refreshToken,
        ...(keepFolder ? {} : { rootFolderPath: null }),
      },
    });

    return NextResponse.redirect(`${baseUrl}/dashboard/storage?connected=1`);
  } catch (err) {
    console.error('Dropbox OAuth callback error:', err);
    return NextResponse.redirect(`${baseUrl}/dashboard/storage?error=dropbox_failed`);
  }
}
