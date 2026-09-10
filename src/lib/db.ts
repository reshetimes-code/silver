import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrisma();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// The production database was missing the DropboxAccount table (added to
// schema.prisma after the last time `prisma db push` was actually run
// against it — the Docker build deliberately skips `db push`, see the
// Dockerfile comment, so a schema addition like this silently never
// reaches the live DB until someone runs it by hand). Rather than require
// a manual one-off command against production, self-heal on first use:
// this mirrors exactly what `prisma db push` would create for that model,
// is idempotent (IF NOT EXISTS), and only ever runs its CREATE TABLE once
// per warm instance thanks to the cached promise below.
let dropboxAccountTableReady: Promise<void> | null = null;
export function ensureDropboxAccountTable(): Promise<void> {
  if (!dropboxAccountTableReady) {
    dropboxAccountTableReady = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DropboxAccount" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "dropboxAccountId" TEXT NOT NULL,
        "accountEmail" TEXT NOT NULL,
        "accountName" TEXT NOT NULL DEFAULT '',
        "refreshToken" TEXT NOT NULL,
        "rootFolderPath" TEXT,
        "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "DropboxAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `).then(() => undefined).catch((err) => {
      // Don't cache a failure — let the next call retry instead of being
      // permanently stuck if this errored transiently (e.g. a cold-start
      // race between two requests).
      dropboxAccountTableReady = null;
      throw err;
    });
  }
  return dropboxAccountTableReady;
}
