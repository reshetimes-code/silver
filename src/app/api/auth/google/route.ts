import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/db';
import { createToken } from '@/lib/auth';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
  const { credential } = await request.json();

  if (!credential) {
    return NextResponse.json({ error: 'No credential provided' }, { status: 400 });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { email, name, sub: googleId } = payload;

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash: `google:${googleId}`,
          name: name || email.split('@')[0],
          phone: '',
          role: 'account_manager',
        },
      });
    }

    const token = createToken(user);

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone },
    });
  } catch (err) {
    console.error('Google auth error:', err);
    return NextResponse.json({ error: 'Google authentication failed' }, { status: 401 });
  }
}
