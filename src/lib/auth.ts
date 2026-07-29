import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { prisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'silver-photobooth-secret-2026';
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

export function createToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role } as JWTPayload,
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
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

export function isAccountManager(user: AuthUser | null): boolean {
  return user?.role === 'account_manager' || user?.role === 'super_admin';
}
