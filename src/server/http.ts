import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PlayerColor } from '@/engine';
import { isPlayerColor } from '@/shared/colors';
import { sanitizeKnight } from '@/shared/knight';
import type { SessionInfo } from '@/shared/protocol';
import { dbEnabled, getDb } from './db';
import { GUEST_TTL_DAYS, newGuestId, resolveIdentity, setGuestCookie, type ServerIdentity } from './identity';
import { limits } from './rateLimit';
import { clientIp, originAllowed } from './realtime';

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

export function authProviders(): SessionInfo['auth'] {
  const db = dbEnabled();
  return {
    google: db && !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET,
    discord: db && !!process.env.AUTH_DISCORD_ID && !!process.env.AUTH_DISCORD_SECRET,
  };
}

async function sessionInfo(identity: ServerIdentity | null): Promise<SessionInfo> {
  const base: SessionInfo = {
    kind: identity?.kind ?? 'none',
    displayName: identity?.displayName ?? null,
    avatarUrl: identity?.avatarUrl ?? null,
    color: null,
    knight: null,
    stats: null,
    auth: authProviders(),
    persistence: dbEnabled(),
  };
  const db = getDb();
  if (!identity || !db) return base;
  try {
    if (identity.kind === 'user') {
      const profile = await db.profile.findUnique({ where: { userId: identity.id } });
      if (profile) {
        base.displayName = profile.displayName;
        base.avatarUrl = profile.avatarUrl ?? base.avatarUrl;
        base.color = isPlayerColor(profile.color) ? (profile.color as PlayerColor) : null;
        base.knight = profile.knight ? sanitizeKnight(profile.knight) : null;
        base.stats = { gamesPlayed: profile.gamesPlayed, gamesWon: profile.gamesWon };
      }
    } else {
      const guest = await db.guestSession.findUnique({ where: { id: identity.id } });
      if (guest) base.stats = { gamesPlayed: guest.gamesPlayed, gamesWon: guest.gamesWon };
    }
  } catch (err) {
    console.error('[http] session info failed', err);
  }
  return base;
}

/** Ensures the caller has a guest identity (unless signed in) and returns the session summary. */
async function ensureGuest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let identity = await resolveIdentity(req.headers.cookie);
  const db = getDb();
  const expiresAt = new Date(Date.now() + GUEST_TTL_DAYS * 86400_000);
  if (!identity) {
    if (!limits.guestCreate.take(clientIp({ headers: req.headers, address: req.socket.remoteAddress }))) {
      return json(res, 429, { error: 'Too many new sessions — try again soon' });
    }
    const id = newGuestId();
    setGuestCookie(req, res, id);
    identity = { key: `g:${id}`, kind: 'guest', id, displayName: null, avatarUrl: null };
    if (db) {
      await db.guestSession.create({ data: { id, expiresAt } }).catch((err: unknown) => console.error('[http] guest create failed', err));
    }
  } else if (identity.kind === 'guest') {
    // Sliding expiry.
    setGuestCookie(req, res, identity.id);
    if (db) {
      await db.guestSession
        .upsert({ where: { id: identity.id }, create: { id: identity.id, expiresAt }, update: { lastSeenAt: new Date(), expiresAt } })
        .catch((err: unknown) => console.error('[http] guest touch failed', err));
    }
  }
  json(res, 200, await sessionInfo(identity));
}

/**
 * Plain HTTP endpoints owned by the game server (same module graph as the socket server).
 * Returns true when the request was handled here; otherwise Next.js handles it.
 */
export async function handleHttp(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const path = (req.url ?? '/').split('?')[0];
  if (path === '/api/health') {
    json(res, 200, { ok: true });
    return true;
  }
  if (path === '/api/session' && req.method === 'GET') {
    json(res, 200, await sessionInfo(await resolveIdentity(req.headers.cookie)));
    return true;
  }
  if (path === '/api/session/guest' && req.method === 'POST') {
    if (!originAllowed(req)) {
      json(res, 403, { error: 'Bad origin' });
      return true;
    }
    await ensureGuest(req, res);
    return true;
  }
  return false;
}
