import { NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';
import { getUserFromRequest, getJwtSecret } from '@/lib/auth';
import { buildAuthorizeUrl } from '@/lib/dropbox-oauth';
import { getBaseUrl } from '@/lib/url';

/**
 * Returns the Dropbox authorize URL for the logged-in manager to connect
 * (or reconnect/change) their own Dropbox account. Returns JSON rather than
 * redirecting directly — the caller is authenticated via a Bearer header
 * (this app's token lives in localStorage, not a cookie), which only a
 * same-origin fetch can send; the client then does
 * `window.location.href = url` to hand off to Dropbox's own login page.
 *
 * The initiating user's id is carried across that hop in a short-lived
 * signed `state` token (verified in the callback route) since Dropbox's
 * redirect back to us is a plain top-level GET with no Authorization header.
 */
export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const state = jwt.sign({ userId: user.id }, getJwtSecret(), { expiresIn: '10m' });
  const redirectUri = `${getBaseUrl(request)}/api/auth/dropbox/callback`;

  return NextResponse.json({ url: buildAuthorizeUrl(state, redirectUri) });
}
