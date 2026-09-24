// Side-effect module: must be the first import of server.ts so every other module sees .env values.
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

// AUTH_SECRET signs guest cookies and Auth.js sessions. Without one configured we persist a random
// secret under .data/ so sessions survive restarts in development.
if (!process.env.AUTH_SECRET) {
  const dir = join(process.cwd(), '.data');
  const file = join(dir, 'auth-secret');
  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, randomBytes(32).toString('base64url'), { mode: 0o600 });
  }
  process.env.AUTH_SECRET = readFileSync(file, 'utf8').trim();
  if (process.env.NODE_ENV === 'production') {
    console.warn('> AUTH_SECRET is not set; using a generated secret from .data/auth-secret. Set AUTH_SECRET in production.');
  }
}
