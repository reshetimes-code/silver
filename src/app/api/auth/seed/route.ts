import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const existing = await prisma.user.findUnique({ where: { email: 'admin@silver.co.il' } });

    if (existing) {
      return NextResponse.json({ message: 'Super admin already exists', email: existing.email });
    }

    const hash = await hashPassword('silver2026');
    const user = await prisma.user.create({
      data: {
        email: 'admin@silver.co.il',
        passwordHash: hash,
        name: 'Silver Admin',
        role: 'super_admin',
        phone: '',
      },
    });

    return NextResponse.json({
      message: 'Super admin created',
      email: user.email,
      hint: 'Login with admin@silver.co.il / silver2026',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
