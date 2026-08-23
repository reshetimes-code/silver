import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/db';
import { createToken } from '@/lib/auth';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=google_cancelled', request.url));
  }

  try {
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/auth/google/callback`;

    const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, redirectUri);
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    const { email, name, sub: googleId } = payload;

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

    // Redirect to dashboard with token
    const response = NextResponse.redirect(new URL('/auth/google-callback', request.url));
    response.cookies.set('auth-token', token, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes — bridge page will move it to localStorage
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('Google callback error:', err);
    return NextResponse.redirect(new URL('/login?error=google_failed', request.url));
  }
}
