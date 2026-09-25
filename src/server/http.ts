import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PlayerColor } from '@/engine';
import { isPlayerColor } from '@/shared/colors';
import { isFaceId, sanitizeKnight } from '@/shared/knight';
import { discordConfigured, googleConfigured, handleAuth } from './auth';
import { FACE_MAX_BYTES, FaceError, loadFace, storeFace } from './faces';
import type { ProfileData, SessionInfo } from '@/shared/protocol';
import { favoriteMode, historyFor, linkedProviders, preferencesFor, ratingFor, sanitizePreferences, updateProfile } from './profileApi';
import { cosmeticStateFor } from './cosmetics';
import { dbEnabled, getDb } from './db';
import { GUEST_TTL_DAYS, newGuestId, resolveIdentity, setGuestCookie, type ServerIdentity } from './identity';
import { limits } from './rateLimit';
import { clientIp, originAllowed } from './realtime';
import { UserError } from './room';
import { acceptFriend, friendsFor, inviteFriend, leaderboard, removeFriend, requestFriend } from './social';

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

export function authProviders(): SessionInfo['auth'] {
  const db = dbEnabled();
  return { google: db && googleConfigured(), discord: db && discordConfigured() };
}

async function sessionInfo(identity: ServerIdentity | null): Promise<SessionInfo> {
  const base: SessionInfo = {
    kind: identity?.kind ?? 'none',
    displayName: identity?.displayName ?? null,
    avatarUrl: identity?.avatarUrl ?? null,
    color: null,
    knight: null,
    stats: null,
    cosmetics: null,
    unlocks: null,
    auth: authProviders(),
    persistence: dbEnabled(),
  };
  const db = getDb();
  if (!identity || !db) return base;
  const cos = await cosmeticStateFor(identity);
  base.cosmetics = cos.chosen;
  base.unlocks = cos.unlocks;
  try {
    if (identity.kind === 'user') {
      const profile = await db.profile.findUnique({ where: { userId: identity.id } });
      if (profile) {
        const prefs = sanitizePreferences(profile.preferences);
        base.displayName = profile.displayName;
        base.avatarUrl = prefs.useProviderAvatar === false ? null : (profile.avatarUrl ?? base.avatarUrl);
        base.color = isPlayerColor(profile.color) ? (profile.color as PlayerColor) : null;
        base.knight = profile.knight ? sanitizeKnight(profile.knight) : null;
        base.stats = { gamesPlayed: profile.gamesPlayed, gamesWon: profile.gamesWon };
      }
    } else {
      const guest = await db.guestSession.findUnique({ where: { id: identity.id } });
      if (guest) {
        base.displayName = guest.displayName;
        base.color = isPlayerColor(guest.color) ? (guest.color as PlayerColor) : null;
        base.knight = guest.knight ? sanitizeKnight(guest.knight) : null;
        base.stats = { gamesPlayed: guest.gamesPlayed, gamesWon: guest.gamesWon };
      }
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

/** Reads a request body, refusing anything larger than `limit` bytes. */
function readBody(req: IncomingMessage, limit: number): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function uploadFace(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!originAllowed(req)) return json(res, 403, { error: 'Bad origin' });
  const identity = await resolveIdentity(req.headers.cookie);
  if (!identity) return json(res, 401, { error: 'Start a session first' });
  if (!limits.faceUpload.take(identity.key)) return json(res, 429, { error: 'Too many uploads — try again in a minute' });
  const body = await readBody(req, FACE_MAX_BYTES);
  if (!body) return json(res, 413, { error: 'Image is too large (max 64 KB after resizing)' });
  try {
    json(res, 200, { id: await storeFace(body) });
  } catch (err) {
    if (err instanceof FaceError) return json(res, 400, { error: err.message });
    throw err;
  }
}

async function serveFace(res: ServerResponse, id: string): Promise<void> {
  const face = isFaceId(id) ? await loadFace(id) : null;
  if (!face) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
    return;
  }
  res.writeHead(200, {
    'content-type': face.mime,
    'content-length': face.data.length,
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'",
    'cross-origin-resource-policy': 'same-origin',
  });
  res.end(face.data);
}

/** GET: your friends, requests and recent players. POST {action, code}: request / accept / remove / invite. */
async function friendsRoute(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const identity = await resolveIdentity(req.headers.cookie);
  if (req.method === 'POST') {
    if (!originAllowed(req)) return json(res, 403, { error: 'Bad origin' });
    if (!identity) return json(res, 401, { error: 'No session' });
    if (!limits.friends.take(identity.key)) return json(res, 429, { error: 'Slow down a little' });
    const body = await readBody(req, 4 * 1024);
    let parsed: { action?: unknown; code?: unknown } = {};
    try {
      parsed = body ? JSON.parse(body.toString('utf8')) : {};
    } catch {
      return json(res, 400, { error: 'Invalid request' });
    }
    const actions = { request: requestFriend, accept: acceptFriend, remove: removeFriend, invite: inviteFriend } as const;
    const act = actions[parsed.action as keyof typeof actions];
    if (!act) return json(res, 400, { error: 'Invalid request' });
    try {
      await act(identity, parsed.code);
    } catch (err) {
      if (err instanceof UserError) return json(res, 400, { error: err.message });
      throw err;
    }
  }
  json(res, 200, await friendsFor(identity));
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
  if (path === '/api/auth' || path.startsWith('/api/auth/')) {
    await handleAuth(req, res);
    return true;
  }
  if (path === '/api/face' && req.method === 'POST') {
    await uploadFace(req, res);
    return true;
  }
  if (path.startsWith('/api/face/') && req.method === 'GET') {
    await serveFace(res, path.slice('/api/face/'.length));
    return true;
  }
  if (path === '/api/session' && req.method === 'GET') {
    json(res, 200, await sessionInfo(await resolveIdentity(req.headers.cookie)));
    return true;
  }
  if (path === '/api/leaderboard' && req.method === 'GET') {
    json(res, 200, await leaderboard(await resolveIdentity(req.headers.cookie)));
    return true;
  }
  if (path === '/api/friends' && (req.method === 'GET' || req.method === 'POST')) {
    await friendsRoute(req, res);
    return true;
  }
  if (path === '/api/profile' && (req.method === 'GET' || req.method === 'PATCH')) {
    const identity = await resolveIdentity(req.headers.cookie);
    if (!identity) {
      json(res, 401, { error: 'No session' });
      return true;
    }
    if (req.method === 'PATCH') {
      if (!originAllowed(req)) {
        json(res, 403, { error: 'Bad origin' });
        return true;
      }
      const body = await readBody(req, 16 * 1024);
      let parsed: unknown = null;
      try {
        parsed = body ? JSON.parse(body.toString('utf8')) : null;
      } catch {
        parsed = null;
      }
      if (!parsed) {
        json(res, 400, { error: 'Invalid request' });
        return true;
      }
      await updateProfile(identity, parsed);
    }
    const [session, history, providers, preferences, rating] = await Promise.all([
      sessionInfo(identity),
      historyFor(identity),
      linkedProviders(identity),
      preferencesFor(identity),
      ratingFor(identity),
    ]);
    const data: ProfileData = { session, history, providers, preferences, favoriteMode: favoriteMode(history), rating };
    json(res, 200, data);
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
