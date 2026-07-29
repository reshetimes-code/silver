import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest, isSuperAdmin } from '@/lib/auth';

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

  const { id, active, role } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(typeof active === 'boolean' ? { active } : {}),
      ...(role ? { role } : {}),
    },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  return NextResponse.json(updated);
}
