import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest, isSuperAdmin, createToken } from '@/lib/auth';

// POST /api/users/[userId]/impersonate — mint a token for another user so a
// super admin can view the app exactly as that user sees it (support /
// troubleshooting). Super_admin only; the resulting token is a normal 7-day
// session token for the target account, nothing marks it as "borrowed" —
// the frontend is what remembers the original admin session so it can
// switch back (see api.loginAsUser / api.returnToAdmin in src/lib/api.ts).
export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const currentUser = await getUserFromRequest(request);
  if (!isSuperAdmin(currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = await params;
  if (userId === currentUser!.id) {
    return NextResponse.json({ error: 'You are already logged in as yourself' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (!target.active) {
    return NextResponse.json({ error: 'This account is disabled' }, { status: 400 });
  }
  // Impersonating another super_admin would let one admin silently act as
  // (and read anything visible to) another admin's account — not something
  // "view as this account_manager for support" needs.
  if (target.role === 'super_admin') {
    return NextResponse.json({ error: 'Cannot impersonate another super admin' }, { status: 400 });
  }

  // Short-lived — this token grants full access to the target's account, so
  // it shouldn't carry the normal 7-day session lifetime for what's meant
  // to be a brief support session.
  const token = createToken(target, '2h');
  console.log(`[impersonate] super_admin ${currentUser!.email} (${currentUser!.id}) started impersonating ${target.email} (${target.id})`);

  return NextResponse.json({
    token,
    user: { id: target.id, email: target.email, name: target.name, role: target.role },
  });
}
