import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

export type Db = PrismaClient;

const globalForDb = globalThis as unknown as { __settlersDb?: PrismaClient | null };

/**
 * The shared Prisma client, or null when no DATABASE_URL is configured (in-memory mode).
 * Stored on globalThis so the custom server and Next.js route handlers share one pool.
 */
export function getDb(): PrismaClient | null {
  if (globalForDb.__settlersDb !== undefined) return globalForDb.__settlersDb;
  const url = process.env.DATABASE_URL;
  globalForDb.__settlersDb = url ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }) : null;
  return globalForDb.__settlersDb;
}

export function dbEnabled(): boolean {
  return !!process.env.DATABASE_URL;
}
