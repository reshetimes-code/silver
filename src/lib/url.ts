/**
 * Base URL to build OAuth redirect URIs from. Prefer an explicit env var
 * (needed behind Cloud Run's proxy, where `request.url` may not reflect the
 * public host) and fall back to deriving it from the incoming request for
 * local dev. Unlike the hardcoded PUBLIC_URL in the Google OAuth callback,
 * this never needs a code change to point at a different environment.
 */
export function getBaseUrl(request: Request): string {
  return process.env.APP_BASE_URL || new URL(request.url).origin;
}
