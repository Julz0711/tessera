/**
 * Single-process entry point: serves the Next.js app and the Socket.IO game server on one port,
 * so the browser talks to one origin (cookies authenticate both HTTP and WebSocket traffic).
 */
import './src/server/loadEnv';
import { createServer } from 'node:http';
import next from 'next';
import { APP_NAME } from './src/config/app';
import { checkDatabase, disableDb, getDb } from './src/server/db';
import { handleHttp } from './src/server/http';
import { createPrismaPersistence } from './src/server/prismaPersistence';
import { findFreePort } from './src/server/port';
import { attachRealtime } from './src/server/realtime';
import { acquirePrivacyLock } from './src/server/privacyMaintenance';

// One stray async error must not end every game on the server: report it and keep serving.
process.on('unhandledRejection', (err) => console.error('[process] unhandled rejection', err));

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || undefined; // default: all interfaces (dual-stack)
const requestedPort = Number(process.env.PORT) || 3000;
// In development, step to the next free port (like `next dev`); in production fail loudly.
const port = await findFreePort(requestedPort, hostname, dev ? 20 : 0);
if (port !== requestedPort) console.log(`> Port ${requestedPort} is in use, using ${port} instead.`);
process.env.PORT = String(port);

const app = next({ dev, port, hostname: 'localhost' });
const handle = app.getRequestHandler();
await app.prepare();
const nextUpgrade = app.getUpgradeHandler();

const server = createServer((req, res) => {
  handleHttp(req, res, { rooms: realtime.manager, persistence })
    .then((handled) => (handled ? undefined : handle(req, res)))
    .catch((err: unknown) => {
      console.error('[http] unhandled error', err);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Internal Server Error');
    });
});

// A configured database must answer (and have our tables); otherwise play continues in memory.
let db = getDb();
if (db) {
  const check = await checkDatabase(db);
  // Behind the schema: keep going (most of it works), but say how to fix what won't.
  if (check.status === 'outdated') {
    console.warn('> Database schema is out of date (profiles, ratings and frames will fail) — run `npm run db:push`, then restart.');
  } else if (check.status !== 'ok') {
    await disableDb();
    db = null;
    console.warn(
      check.status === 'no-schema'
        ? '> Database reachable but not set up — run `npm run db:push`. Running without persistence for now.'
        : `> Database not reachable${check.detail ? ` (${check.detail})` : ''} — start it with \`npm run db:local\` or fix DATABASE_URL. Running without persistence for now.`,
    );
  }
}
if (db) console.log('> Persistence: PostgreSQL (profiles, history and game recovery enabled)');
else if (!process.env.DATABASE_URL) console.log('> Persistence: off (no DATABASE_URL) — games live in memory; sign-in is disabled');
// Keep a direct connection for this session lock, even when Prisma uses a pooled URL.
const privacyLock = db ? await acquirePrivacyLock(process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!, 'server', () => {
  console.error('> Lost the privacy maintenance lock. Stopping to prevent unsafe writes.');
  process.exit(1);
}) : undefined;
const persistence = db ? createPrismaPersistence(db) : undefined;
const realtime = attachRealtime(server, { persistence });

// Socket.IO handles its own upgrade requests; everything else (e.g. Next.js HMR) goes to Next.
server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/socket.io/')) return;
  nextUpgrade(req, socket, head).catch(() => socket.destroy());
});

server.listen({ port, host: hostname }, () => {
  console.log(`> ${APP_NAME} ready on http://localhost:${port} (${dev ? 'development' : 'production'})`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    console.log(`> ${signal} received, shutting down`);
    realtime.manager.dispose();
    server.close();
    // A deploy stops the old server: write out the moves still queued (a few seconds at most), so
    // running games come back exactly where they were on the new one.
    await Promise.race([persistence?.flush(), new Promise((r) => setTimeout(r, 5000))]).catch(() => undefined);
    // Process exit closes the lock connection after all server work has stopped.
    // Do not release it while HTTP requests or timed-out persistence writes can still run.
    void privacyLock;
    process.exit(0);
  });
}
