// The Prisma CLI doesn't auto-load .env for this config-file-based setup the
// way it used to for a plain schema.prisma `env("DATABASE_URL")` datasource
// — this module's process.env access below ran before any .env was loaded,
// so `prisma db push`/`migrate` always saw an empty connection string when
// run locally. No-ops in prod (Cloud Run sets real env vars and ships no
// .env file — see .dockerignore), so this is safe to load unconditionally.
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  datasource: {
    // The CLI (db push/migrate/introspect) needs a direct, non-pooled
    // connection — Supabase's pgbouncer pooler (DATABASE_URL, used by the
    // app's own runtime client in src/lib/db.ts) rejects the schema
    // engine's session with "tenant/user not found". DIRECT_URL is exactly
    // the unpooled connection string Supabase provides for this.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
})
