import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Never returns the stored refresh token — only display/status fields.
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const account = await prisma.dropboxAccount.findUnique({
    where: { userId: user.id },
    select: { accountEmail: true, accountName: true, rootFolderPath: true },
  });

  if (!account) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    accountEmail: account.accountEmail,
    accountName: account.accountName,
    rootFolderPath: account.rootFolderPath,
  });
}
