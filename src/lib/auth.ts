import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { prisma } from './db';

// No fallback: a hardcoded secret here would sit in this repo's public
// GitHub history forever. If it's missing, every login token (including
// super_admin ones) would be forgeable by anyone who read the source —
// fail loudly at the point of use instead of silently signing with a known
// value. (Checked lazily, not at module load, so `next build`'s static
// route analysis — which imports this file without a real request — still
// succeeds even before the env var is configured in that environment.)
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return secret;
}
const TOKEN_EXPIRY = '7d';

export type UserRole = 'super_admin' | 'account_manager';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(user: { id: string; email: string; role: string }, expiresIn: string = TOKEN_EXPIRY): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role } as JWTPayload,
    getJwtSecret(),
    { expiresIn, algorithm: 'HS256' } as jwt.SignOptions
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    // Pin the algorithm explicitly (defense-in-depth): the secret is always
    // a plain HMAC string here, so this doesn't change accepted tokens
    // today, but it forecloses any future algorithm-confusion path if an
    // RS256-verified flow is ever added elsewhere against the same secret.
    return jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  return authHeader;
}

export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization');
  const token = getTokenFromHeader(authHeader);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.active) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
  };
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  return user?.role === 'super_admin';
}

/**
 * Site management (creating/editing/deleting events, frames, photos, leads,
 * users; sending to print) is restricted to super admins only — everyone
 * else gets a read-only personal dashboard of their own events. Every
 * mutating API route should call this first and bail on null.
 */
export async function requireSuperAdmin(request: Request): Promise<AuthUser | null> {
  const user = await getUserFromRequest(request);
  return isSuperAdmin(user) ? user : null;
}

export function isAccountManager(user: AuthUser | null): boolean {
  return user?.role === 'account_manager' || user?.role === 'super_admin';
}
