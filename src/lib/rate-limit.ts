/**
 * Lightweight in-memory sliding-window rate limiter for auth endpoints
 * (login/register brute-force protection).
 *
 * This is intentionally simple rather than Redis-backed: Cloud Run runs at
 * most a handful of instances for this app (max-instances=10, frequently
 * scaled to 0-1), so an in-memory limiter still meaningfully throttles a
 * single attacker (each new cold-start instance resets their count, but it
 * costs them a fresh request round-trip each time) without adding an
 * external dependency. If this app scales out significantly, replace with
 * a shared store (Postgres table or Redis) — the call sites won't change.
 */

const buckets = new Map<string, number[]>();

// Periodically forget keys with no recent activity so this map can't grow
// unbounded over the life of a long-running instance.
const MAX_TRACKED_KEYS = 5000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  let hits = buckets.get(key);
  if (!hits) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      // Cheap eviction under memory pressure: drop the oldest-inserted key.
      const oldestKey = buckets.keys().next().value;
      if (oldestKey !== undefined) buckets.delete(oldestKey);
    }
    hits = [];
    buckets.set(key, hits);
  }

  // Drop timestamps outside the current window.
  while (hits.length > 0 && hits[0] < windowStart) hits.shift();

  if (hits.length >= max) {
    const retryAfterMs = hits[0] + windowMs - now;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  hits.push(now);
  return { allowed: true };
}

/** Best-effort client IP behind Cloud Run's proxy (falls back to a constant so all
 *  unidentifiable requests share one bucket rather than bypassing the limit). */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return 'unknown';
}
