import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@/generated/prisma/client';

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

export type DbStatus = 'ok' | 'unreachable' | 'no-schema' | 'outdated';

function errorText(err: unknown): string {
  const e = err as { message?: string; code?: string; cause?: { message?: string; code?: string; originalCode?: string } };
  return [e?.message, e?.code, e?.cause?.message, e?.cause?.code, e?.cause?.originalCode].filter(Boolean).join(' · ') || String(err);
}

/**
 * The database is there but not taking queries yet: still starting up or recovering (57P03, e.g.
 * `npm run db:local` started together with the server), or not listening yet.
 */
export function isDbStarting(err: unknown): boolean {
  return /57P03|not yet accepting connections|starting up|in recovery mode|ECONNREFUSED/i.test(errorText(err));
}

/**
 * One short line for a database that can't be reached right now (starting up, or down: the reason
 * says which); the full error for anything else.
 */
export function logDbError(what: string, err: unknown): void {
  if (!isDbStarting(err)) return console.error(`[db] ${what} failed`, err);
  // Refused means it's down, not merely busy: say so as an error, just without the stack.
  if (/ECONNREFUSED/i.test(errorText(err))) console.error(`[db] ${what} failed: the database is not reachable (ECONNREFUSED)`);
  else console.warn(`[db] ${what} skipped: the database is starting up`);
}

/** Rejects with 'timed out' after `ms`; the timer is cleared either way. */
async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error('timed out')), ms)))]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verifies the database answers and has our tables. A database that is still starting up gets
 * `waitMs` to come up, one that isn't listening yet `refusedMs` (it may not be running at all, and
 * then play should fall back to memory soon); any other failure is reported after one try.
 */
export async function checkDatabase(db: PrismaClient, timeoutMs = 5000, waitMs = 30_000, refusedMs = 10_000): Promise<{ status: DbStatus; detail?: string }> {
  const started = Date.now();
  let waiting = false;
  for (;;) {
    try {
      await withTimeout(db.$queryRawUnsafe('SELECT 1 FROM "users" LIMIT 1'), timeoutMs);
      return (await withTimeout(schemaCurrent(db), timeoutMs)) ? { status: 'ok' } : { status: 'outdated' };
    } catch (err) {
      const text = errorText(err);
      if (/relation .* does not exist|42P01/i.test(text)) return { status: 'no-schema', detail: text };
      const patience = /ECONNREFUSED/i.test(text) ? refusedMs : waitMs;
      if (isDbStarting(err) && Date.now() - started < patience) {
        if (!waiting) console.log('> Waiting for the database to start…');
        waiting = true;
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      return { status: 'unreachable', detail: text.split('\n')[0].slice(0, 160) };
    }
  }
}

/**
 * Whether the database has every table and column of the schema (`db push` not run since the schema
 * grew, e.g. after pulling). Reads one row of each model, all columns, so it keeps up with schema
 * changes by itself; anything but a missing table or column counts as current.
 */
async function schemaCurrent(db: PrismaClient): Promise<boolean> {
  const models = Object.values(Prisma.ModelName).map((name) => name[0].toLowerCase() + name.slice(1));
  const delegates = db as unknown as Record<string, { findFirst(): Promise<unknown> }>;
  try {
    await Promise.all(models.map((m) => delegates[m].findFirst()));
    return true;
  } catch (err) {
    return !/P2021|P2022|(table|relation|column) .* does not exist|42P01|42703/i.test(errorText(err));
  }
}
