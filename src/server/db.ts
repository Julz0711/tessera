import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

export type Db = PrismaClient;

const globalForDb = globalThis as unknown as { __settlersDb?: PrismaClient | null };

/**
 * The shared Prisma client, or null when no DATABASE_URL is configured (in-memory mode) or the
 * database turned out to be unusable at startup (see `checkDatabase`).
 */
export function getDb(): PrismaClient | null {
  if (globalForDb.__settlersDb !== undefined) return globalForDb.__settlersDb;
  const url = process.env.DATABASE_URL;
  globalForDb.__settlersDb = url ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }) : null;
  return globalForDb.__settlersDb;
}

export function dbEnabled(): boolean {
  return getDb() !== null;
}

/** Switches the server to in-memory mode (e.g. the configured database is unreachable). */
export async function disableDb(): Promise<void> {
  const db = globalForDb.__settlersDb;
  globalForDb.__settlersDb = null;
  await db?.$disconnect().catch(() => undefined);
}

export type DbStatus = 'ok' | 'unreachable' | 'no-schema';

/** Verifies the database answers and has our tables (within a few seconds). */
export async function checkDatabase(db: PrismaClient, timeoutMs = 5000): Promise<{ status: DbStatus; detail?: string }> {
  try {
    await Promise.race([
      db.$queryRawUnsafe('SELECT 1 FROM "users" LIMIT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), timeoutMs)),
    ]);
    return { status: 'ok' };
  } catch (err) {
    const e = err as { message?: string; code?: string; cause?: { message?: string; code?: string; originalCode?: string } };
    const text = [e.message, e.code, e.cause?.message, e.cause?.code, e.cause?.originalCode].filter(Boolean).join(' · ') || String(err);
    if (/relation .* does not exist|42P01/i.test(text)) return { status: 'no-schema', detail: text };
    return { status: 'unreachable', detail: text.split('\n')[0].slice(0, 160) };
  }
}
