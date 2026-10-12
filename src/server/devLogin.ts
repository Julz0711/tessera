/**
 * Development only: `DEV_USER=<name>` signs every new browser in as that player, so a local test
 * server always has a signed-in profile (progress, rating, wardrobe) without setting up OAuth.
 * Needs DATABASE_URL; ignored in production builds.
 *
 * Signing out sticks for that browser (a `dev_guest` cookie), so a second window can still play as
 * a guest. Visiting /api/dev/login signs it back in.
 */
import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getDb } from './db';
import { isSecureRequest, parseCookies, type ServerIdentity } from './identity';

const DEV_GUEST = 'dev_guest';
const SESSION_DAYS = 365;

export function devUserName(): string | null {
  const name = process.env.DEV_USER?.trim();
  return name && process.env.NODE_ENV !== 'production' && getDb() ? name.slice(0, 24) : null;
}

const authCookie = (req: IncomingMessage) => (isSecureRequest(req) ? '__Secure-authjs.session-token' : 'authjs.session-token');

function addCookie(res: ServerResponse, cookie: string): void {
  const prev = res.getHeader('Set-Cookie');
  const list = Array.isArray(prev) ? prev : prev ? [String(prev)] : [];
  res.setHeader('Set-Cookie', [...list, cookie]);
}

/** Whether this browser should be signed in as the dev user (it has no session and never signed out). */
export function wantsDevLogin(req: IncomingMessage): boolean {
  return !!devUserName() && !parseCookies(req.headers.cookie)[DEV_GUEST];
}

/** Creates (once) the dev user and a session for this browser; returns its identity. */
export async function devLogin(req: IncomingMessage, res: ServerResponse): Promise<ServerIdentity | null> {
  const name = devUserName();
  const db = getDb();
  if (!name || !db) return null;
  const id = `dev-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const user = await db.user.upsert({
    where: { id },
    create: { id, name, profile: { create: { displayName: name } } },
    update: {},
    include: { profile: true },
  });
  const sessionToken = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({ data: { sessionToken, userId: id, expires } });
  const secure = isSecureRequest(req) ? '; Secure' : '';
  addCookie(res, `${authCookie(req)}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`);
  addCookie(res, `${DEV_GUEST}=; Path=/; Max-Age=0`);
  return { key: `u:${id}`, kind: 'user', id, displayName: user.profile?.displayName ?? name, avatarUrl: null };
}

/** Dev routes: sign-out that sticks for this browser (works without OAuth too) and sign back in. */
export async function handleDevAuth(req: IncomingMessage, res: ServerResponse, path: string): Promise<boolean> {
  if (!devUserName()) return false;
  if (path === '/api/auth/signout' && req.method === 'POST') {
    const token = parseCookies(req.headers.cookie)[authCookie(req)];
    if (token) await getDb()?.session.deleteMany({ where: { sessionToken: token } });
    addCookie(res, `${authCookie(req)}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    addCookie(res, `${DEV_GUEST}=1; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`);
    res.writeHead(303, { location: '/' }).end();
    return true;
  }
  if (path === '/api/dev/login' && req.method === 'GET') {
    await devLogin(req, res);
    res.writeHead(303, { location: '/' }).end();
    return true;
  }
  return false;
}
