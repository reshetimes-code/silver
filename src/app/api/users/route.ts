import { NextResponse } from 'next/server';
import { prisma, ensureDropboxAccountTable } from '@/lib/db';
import { getUserFromRequest, isSuperAdmin, hashPassword } from '@/lib/auth';

// GET /api/users — list all users (super_admin only)
export async function GET(request: Request) {
  const currentUser = await getUserFromRequest(request);
  if (!isSuperAdmin(currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      phone: true,
      createdAt: true,
      _count: { select: { events: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

// PATCH /api/users — update user (super_admin only)
export async function PATCH(request: Request) {
  const currentUser = await getUserFromRequest(request);
  if (!isSuperAdmin(currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, name, email, phone, password, active, role } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  // Guard against a super admin locking themselves out — disabling their own
  // account or stripping their own super_admin role via this same endpoint
  // they're using to make the change.
  if (id === currentUser!.id) {
    if (active === false) {
      return NextResponse.json({ error: 'You cannot disable your own account' }, { status: 400 });
    }
    if (role && role !== 'super_admin') {
      return NextResponse.json({ error: 'You cannot remove your own super admin role' }, { status: 400 });
    }
  }

  if (email) {
    const normalized = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }
  }

  if (password && password.length < 10) {
    return NextResponse.json({ error: 'Password must be at least 10 characters' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(email ? { email: email.toLowerCase().trim() } : {}),
      ...(typeof phone === 'string' ? { phone } : {}),
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
      ...(typeof active === 'boolean' ? { active } : {}),
      ...(role ? { role } : {}),
    },
    select: { id: true, email: true, name: true, role: true, active: true, phone: true, createdAt: true, _count: { select: { events: true } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/users — remove a user (super_admin only)
export async function DELETE(request: Request) {
  const currentUser = await getUserFromRequest(request);
  if (!isSuperAdmin(currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }
  if (id === currentUser!.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Don't take the user's events/leads/photos down with them — just release
  // the ownership so they fall back to "unassigned" instead of vanishing.
  await ensureDropboxAccountTable();
  await prisma.$transaction([
    prisma.event.updateMany({ where: { ownerId: id }, data: { ownerId: null } }),
    prisma.lead.updateMany({ where: { ownerId: id }, data: { ownerId: null } }),
    prisma.dropboxAccount.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
