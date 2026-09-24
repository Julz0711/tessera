#!/usr/bin/env node
/**
 * Runs a local PostgreSQL for development without Docker or a system install
 * (downloads platform binaries via the `embedded-postgres` package on first use).
 *
 *   npm run db:local            # start (keeps running; Ctrl+C to stop)
 *   then in another terminal:   npm run db:push
 *
 * Data lives in .data/pg. Connection string: postgresql://postgres:postgres@localhost:5433/settlers
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const port = Number(process.env.LOCAL_DB_PORT) || 5433;
const databaseDir = join(process.cwd(), '.data', 'pg');
const url = `postgresql://postgres:postgres@localhost:${port}/settlers`;

const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password: 'postgres',
  port,
  persistent: true,
  onLog: () => {},
});

const fresh = !existsSync(join(databaseDir, 'PG_VERSION'));
if (fresh) {
  console.log('> Initialising a new local database in .data/pg …');
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase('settlers');
  console.log('> Created database "settlers"');
} catch {
  // already exists
}
console.log(`> PostgreSQL ready on port ${port}`);
console.log(`> DATABASE_URL="${url}"`);
if (fresh) console.log('> Next: add DATABASE_URL to .env, then run `npm run db:push`.');

const stop = async () => {
  console.log('\n> Stopping PostgreSQL…');
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
// Keep the process alive.
setInterval(() => {}, 1 << 30);
