import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/db';
import { createToken } from '@/lib/auth';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// Derive the public-facing origin from the incoming request so that the same
// build works on both qrselfie.com and the raw Cloud Run URL. The x-forwarded-host
// header is set by Cloud Run's load-balancer and contains the real domain name
// (e.g. "qrselfie.com"); fall back to the hardcoded primary domain when absent.
function getPublicUrl(request: NextRequest): string {
  const fwdHost = request.headers.get('x-forwarded-host');
  const fwdProto = request.headers.get('x-forwarded-proto') || 'https';
  if (fwdHost) return `${fwdProto}://${fwdHost}`;
  // last-resort fallback — should never be hit in production
  return 'https://qrselfie.com';
}

export async function GET(request: NextRequest) {
  const PUBLIC_URL = getPublicUrl(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${PUBLIC_URL}/login?error=google_cancelled`);
  }

  try {
    const redirectUri = `${PUBLIC_URL}/api/auth/google/callback`;

    const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, redirectUri);
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.redirect(`${PUBLIC_URL}/login?error=invalid_token`);
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
    const response = NextResponse.redirect(`${PUBLIC_URL}/auth/google-callback`);
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
    return NextResponse.redirect(`${PUBLIC_URL}/login?error=google_failed`);
  }
}
