/**
 * Server-side identity: guests carry an HMAC-signed random id in an httpOnly cookie; signed-in
 * users are resolved from their Auth.js database session. Display names are never identity.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getDb } from './db';

export const GUEST_COOKIE = 'guest_session';
export const GUEST_TTL_DAYS = 30;
const AUTH_COOKIES = ['__Secure-authjs.session-token', 'authjs.session-token'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface ServerIdentity {
  /** Stable key: `u:<userId>` or `g:<guestSessionId>` — server-side only. */
  key: string;
  kind: 'user' | 'guest';
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET missing (loadEnv should have set it)');
  return s;
}

function sign(value: string): string {
  return createHmac('sha256', `${secret()}:guest`).update(value).digest('base64url');
}

export function signGuestId(id: string): string {
  return `${id}.${sign(id)}`;
}

export function verifyGuestToken(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!UUID_RE.test(id)) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

export function isSecureRequest(req: IncomingMessage): boolean {
  const proto = req.headers['x-forwarded-proto'];
  return (typeof proto === 'string' && proto.split(',')[0].trim() === 'https') || !!(req.socket as { encrypted?: boolean }).encrypted;
}

export function setGuestCookie(req: IncomingMessage, res: ServerResponse, guestId: string): void {
  const parts = [
    `${GUEST_COOKIE}=${encodeURIComponent(signGuestId(guestId))}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${GUEST_TTL_DAYS * 86400}`,
  ];
  // Secure whenever the page itself is served over HTTPS (directly or via a TLS-terminating proxy);
  // plain-http local runs keep working.
  if (isSecureRequest(req)) parts.push('Secure');
  const prev = res.getHeader('Set-Cookie');
  const list = Array.isArray(prev) ? prev : prev ? [String(prev)] : [];
  res.setHeader('Set-Cookie', [...list, parts.join('; ')]);
}

export function clearGuestCookie(res: ServerResponse): void {
  res.setHeader('Set-Cookie', `${GUEST_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

/** Resolves who is calling from request/handshake cookies: a signed-in user first, else a guest. */
export async function resolveIdentity(cookieHeader: string | undefined): Promise<ServerIdentity | null> {
  const cookies = parseCookies(cookieHeader);
  const db = getDb();
  const sessionToken = AUTH_COOKIES.map((name) => cookies[name]).find(Boolean);
  if (db && sessionToken) {
    try {
      const session = await db.session.findUnique({
        where: { sessionToken },
        include: { user: { include: { profile: true } } },
      });
      if (session && session.expires > new Date()) {
        const user = session.user;
        return {
          key: `u:${user.id}`,
          kind: 'user',
          id: user.id,
          displayName: user.profile?.displayName ?? user.name ?? null,
          avatarUrl: user.profile?.avatarUrl ?? user.image ?? null,
        };
      }
    } catch (err) {
      console.error('[identity] session lookup failed', err);
    }
  }
  const guestId = verifyGuestToken(cookies[GUEST_COOKIE]);
  if (guestId) return { key: `g:${guestId}`, kind: 'guest', id: guestId, displayName: null, avatarUrl: null };
  return null;
}

export function newGuestId(): string {
  return randomUUID();
}
