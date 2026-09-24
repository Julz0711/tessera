/**
 * Single-process entry point: serves the Next.js app and the Socket.IO game server on one port,
 * so the browser talks to one origin (cookies authenticate both HTTP and WebSocket traffic).
 */
import './src/server/loadEnv';
import { createServer } from 'node:http';
import next from 'next';
import { APP_NAME } from './src/config/app';
import { getDb } from './src/server/db';
import { handleHttp } from './src/server/http';
import { createPrismaPersistence } from './src/server/prismaPersistence';
import { findFreePort } from './src/server/port';
import { attachRealtime } from './src/server/realtime';

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
  handleHttp(req, res)
    .then((handled) => (handled ? undefined : handle(req, res)))
    .catch((err: unknown) => {
      console.error('[http] unhandled error', err);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Internal Server Error');
    });
});

const db = getDb();
if (db) console.log('> Persistence: PostgreSQL (profiles, history and game recovery enabled)');
else console.log('> Persistence: off (no DATABASE_URL) — games live in memory; sign-in is disabled');
const realtime = attachRealtime(server, { persistence: db ? createPrismaPersistence(db) : undefined });

// Socket.IO handles its own upgrade requests; everything else (e.g. Next.js HMR) goes to Next.
server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/socket.io/')) return;
  nextUpgrade(req, socket, head).catch(() => socket.destroy());
});

server.listen({ port, host: hostname }, () => {
  console.log(`> ${APP_NAME} ready on http://localhost:${port} (${dev ? 'development' : 'production'})`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`> ${signal} received, shutting down`);
    realtime.manager.dispose();
    server.close();
    process.exit(0);
  });
}
