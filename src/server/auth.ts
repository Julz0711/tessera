/**
 * Auth.js (@auth/core) served by the custom game server at /api/auth/* — PRD §4–5, §14.
 *
 * Running it here (instead of a Next.js route) keeps all database/auth code in one Node module
 * graph that Next never bundles. What it does:
 * - Google / Discord only when their env vars exist and a database is configured.
 * - Database sessions (the socket server validates the same `sessions` rows).
 * - OAuth access/refresh/id tokens are never stored (tokenless adapter).
 * - The browser session exposes only id, name and image — no email or provider data.
 * - On sign-in, the guest's history/stats migrate to the profile once, then the guest cookie is cleared.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Auth, type AuthConfig } from '@auth/core';
import type { Adapter, AdapterAccount } from '@auth/core/adapters';
import Discord from '@auth/core/providers/discord';
import Google from '@auth/core/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { getDb, type Db } from './db';
import { GUEST_COOKIE, isSecureRequest, parseCookies, verifyGuestToken } from './identity';
import { ensureProfile, migrateGuestToUser } from './migrateGuest';

export function googleConfigured(): boolean {
  return !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
}
export function discordConfigured(): boolean {
  return !!process.env.AUTH_DISCORD_ID && !!process.env.AUTH_DISCORD_SECRET;
}

/** Per-request context so Auth.js event callbacks can read and clear our cookies. */
const requestContext = new AsyncLocalStorage<{ cookies: Record<string, string>; setCookies: string[] }>();

function tokenlessAdapter(db: Db): Adapter {
  const base = PrismaAdapter(db as never);
  return {
    ...base,
    linkAccount: (account: AdapterAccount) =>
      base.linkAccount!({
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        session_state: account.session_state,
      } as AdapterAccount),
  };
}

let cachedConfig: AuthConfig | null = null;

function authConfig(db: Db): AuthConfig {
  if (cachedConfig) return cachedConfig;
  const providers: AuthConfig['providers'] = [];
  if (googleConfigured()) providers.push(Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }));
  if (discordConfigured()) providers.push(Discord({ clientId: process.env.AUTH_DISCORD_ID, clientSecret: process.env.AUTH_DISCORD_SECRET }));
  cachedConfig = {
    basePath: '/api/auth',
    adapter: tokenlessAdapter(db),
    providers,
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    session: { strategy: 'database', maxAge: 30 * 86400, updateAge: 86400 },
    pages: { error: '/profile' },
    callbacks: {
      session({ session, user }) {
        return { ...session, user: { id: user?.id, name: user?.name ?? null, image: user?.image ?? null } } as typeof session;
      },
    },
    events: {
      async createUser({ user }) {
        if (user.id) await ensureProfile(user.id, user.name, user.image);
      },
      async signIn({ user, isNewUser }) {
        if (!user.id) return;
        await ensureProfile(user.id, user.name, user.image);
        const ctx = requestContext.getStore();
        const guestId = verifyGuestToken(ctx?.cookies[GUEST_COOKIE]);
        if (!guestId) return;
        try {
          await migrateGuestToUser(guestId, user.id, isNewUser);
        } catch (err) {
          console.error('[auth] guest migration failed', err);
        } finally {
          // Signing out later starts a fresh guest instead of reusing the migrated one.
          ctx?.setCookies.push(`${GUEST_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
        }
      },
    },
  };
  return cachedConfig;
}

async function toWebRequest(req: IncomingMessage, body: Buffer | undefined): Promise<Request> {
  const proto = isSecureRequest(req) ? 'https' : 'http';
  const host = req.headers.host ?? 'localhost';
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (value !== undefined) headers.set(key, value);
  }
  return new Request(new URL(req.url ?? '/', `${proto}://${host}`), {
    method: req.method,
    headers,
    body: body && body.length ? new Uint8Array(body) : undefined,
  });
}

function readBody(req: IncomingMessage, limit = 64 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Handles /api/auth/*; answers 404 when sign-in isn't configured. */
export async function handleAuth(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const db = getDb();
  if (!db || (!googleConfigured() && !discordConfigured())) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Sign-in is not configured on this server' }));
    return;
  }
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
  const request = await toWebRequest(req, body);
  const ctx = { cookies: parseCookies(req.headers.cookie), setCookies: [] as string[] };
  const response = await requestContext.run(ctx, () => Auth(request, authConfig(db)));

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') res.setHeader(key, value);
  });
  const cookies = [...response.headers.getSetCookie(), ...ctx.setCookies];
  if (cookies.length) res.setHeader('set-cookie', cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}
