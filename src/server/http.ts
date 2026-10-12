import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PlayerColor } from '@/engine';
import { isPickableColor } from '@/shared/colors';
import { isFaceId, sanitizeKnight } from '@/shared/knight';
import { discordConfigured, googleConfigured, handleAuth } from './auth';
import { FACE_MAX_BYTES, FaceError, loadFace, storeFace } from './faces';
import type { ProfileData, SessionInfo } from '@/shared/protocol';
import { accuracyFor, favoriteMode, historyFor, linkedProviders, preferencesFor, ratingFor, sanitizePreferences, updateProfile } from './profileApi';
import { cosmeticStateFor } from './cosmetics';
import { progressDataFor } from './progression';
import { dbEnabled, getDb, logDbError } from './db';
import { GUEST_TTL_DAYS, newGuestId, resolveIdentity, setGuestCookie, type ServerIdentity } from './identity';
import { limits } from './rateLimit';
import { clientIp, originAllowed } from './realtime';
import { UserError } from './room';
import { acceptFriend, friendProfileFor, friendsFor, inviteFriend, leaderboard, removeFriend, requestFriend } from './social';
import { pagedHistory, replayFor, reportFor } from './historyApi';
import { analysisFor } from './gameAnalysis';
import { modeRatingsFor } from './modeRatings';
import { emptyRatings } from '@/shared/ratings';
import { abandonRoom, activeRoomsFor } from './activeRooms';
import { normalizeCode } from './rooms';
import { adminDeleteGames, adminDeleteGuest, adminDeleteUser, adminGames, adminGuests, adminOverview, adminUsers, idsFrom, isAdmin, type AdminContext } from './admin';

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
      const profile = await db.profile.findUnique({
        where: { userId: identity.id },
        select: { displayName: true, avatarUrl: true, color: true, knight: true, preferences: true, gamesPlayed: true, gamesWon: true },
      });
      if (profile) {
        const prefs = sanitizePreferences(profile.preferences);
        base.displayName = profile.displayName;
        base.avatarUrl = prefs.useProviderAvatar === false ? null : (profile.avatarUrl ?? base.avatarUrl);
        base.color = isPickableColor(profile.color) ? (profile.color as PlayerColor) : null;
        base.knight = profile.knight ? sanitizeKnight(profile.knight) : null;
        base.stats = { gamesPlayed: profile.gamesPlayed, gamesWon: profile.gamesWon };
      }
    } else {
      const guest = await db.guestSession.findUnique({
        where: { id: identity.id },
        select: { displayName: true, color: true, knight: true, gamesPlayed: true, gamesWon: true },
      });
      if (guest) {
        base.displayName = guest.displayName;
        base.color = isPickableColor(guest.color) ? (guest.color as PlayerColor) : null;
        base.knight = guest.knight ? sanitizeKnight(guest.knight) : null;
        base.stats = { gamesPlayed: guest.gamesPlayed, gamesWon: guest.gamesWon };
      }
    }
  } catch (err) {
    logDbError('session info', err);
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
      return json(res, 429, { error: 'Too many new sessions. Try again soon.' });
    }
    const id = newGuestId();
    setGuestCookie(req, res, id);
    identity = { key: `g:${id}`, kind: 'guest', id, displayName: null, avatarUrl: null };
    if (db) {
      await db.guestSession.create({ data: { id, expiresAt } }).catch((err: unknown) => logDbError('guest create', err));
    }
  } else if (identity.kind === 'guest') {
    // Sliding expiry.
    setGuestCookie(req, res, identity.id);
    if (db) {
      await db.guestSession
        .upsert({ where: { id: identity.id }, create: { id: identity.id, expiresAt }, update: { lastSeenAt: new Date(), expiresAt } })
        .catch((err: unknown) => logDbError('guest touch', err));
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
  if (!limits.faceUpload.take(identity.key)) return json(res, 429, { error: 'Too many uploads. Try again in a minute.' });
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
    // Uploaded portraits can be removed on request; do not create year-long public copies.
    'cache-control': 'private, no-store',
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

/** /api/admin/*: anyone who isn't an admin gets a plain 404. */
async function adminRoute(req: IncomingMessage, res: ServerResponse, path: string, ctx: AdminContext): Promise<void> {
  const db = getDb();
  const identity = await resolveIdentity(req.headers.cookie);
  if (!db || !identity || !(await isAdmin(db, identity))) return json(res, 404, { error: 'Not found' });
  const params = new URL(req.url!, 'http://localhost').searchParams;
  const lists = { '/api/admin/overview': () => adminOverview(db, ctx), '/api/admin/users': () => adminUsers(db, ctx, params),
    '/api/admin/guests': () => adminGuests(db, ctx, params), '/api/admin/games': () => adminGames(db, ctx, params) } as const;
  try {
    if (req.method === 'GET' && path in lists) return json(res, 200, await lists[path as keyof typeof lists]());
    if (req.method !== 'POST') return json(res, 404, { error: 'Not found' });
    if (!originAllowed(req)) return json(res, 403, { error: 'Bad origin' });
    const body = await readBody(req, 16 * 1024);
    let parsed: unknown = null;
    try {
      parsed = body ? JSON.parse(body.toString('utf8')) : null;
    } catch {
      return json(res, 400, { error: 'Invalid request' });
    }
    const id = (parsed as { id?: unknown } | null)?.id;
    if (path === '/api/admin/games/delete') return json(res, 200, await adminDeleteGames(db, ctx, idsFrom(parsed)));
    if (typeof id !== 'string' || !id || id.length > 64) return json(res, 400, { error: 'Invalid request' });
    if (path === '/api/admin/users/delete') return json(res, 200, await adminDeleteUser(db, ctx, identity, id));
    if (path === '/api/admin/guests/delete') return json(res, 200, await adminDeleteGuest(db, ctx, id));
    json(res, 404, { error: 'Not found' });
  } catch (err) {
    if (err instanceof UserError) return json(res, 400, { error: err.message });
    logDbError('admin', err);
    json(res, 500, { error: 'That failed. Check the server log.' });
  }
}

/**
 * Plain HTTP endpoints owned by the game server (same module graph as the socket server).
 * Returns true when the request was handled here; otherwise Next.js handles it.
 */
export async function handleHttp(req: IncomingMessage, res: ServerResponse, ctx?: AdminContext): Promise<boolean> {
  const path = (req.url ?? '/').split('?')[0];
  if (ctx && path.startsWith('/api/admin/')) {
    await adminRoute(req, res, path, ctx);
    return true;
  }
  if (ctx && path === '/api/rooms/active' && req.method === 'GET') {
    const identity = await resolveIdentity(req.headers.cookie);
    const rooms = identity ? await activeRoomsFor(identity, ctx.rooms, getDb()).catch((err: unknown) => {
      logDbError('active rooms', err);
      return activeRoomsFor(identity, ctx.rooms, null);
    }) : [];
    json(res, 200, { rooms });
    return true;
  }
  if (ctx && path === '/api/rooms/abandon' && req.method === 'POST') {
    const identity = await resolveIdentity(req.headers.cookie);
    if (!originAllowed(req) || !identity) {
      json(res, identity ? 403 : 401, { error: identity ? 'Bad origin' : 'No session' });
      return true;
    }
    const body = await readBody(req, 1024);
    let code: string | null = null;
    try {
      code = normalizeCode((body ? JSON.parse(body.toString('utf8')) : null)?.code);
    } catch {
      code = null;
    }
    if (!code) {
      json(res, 400, { error: 'Invalid request' });
      return true;
    }
    try {
      // Not abandoned: no seat there anymore (the game ended or they already left), so it's gone either way.
      const abandoned = await abandonRoom(identity, code, ctx.rooms, getDb());
      json(res, 200, { ok: true, abandoned });
    } catch (err) {
      logDbError('abandon', err);
      json(res, 503, { error: "Couldn't leave that table right now. Try again in a moment." });
    }
    return true;
  }
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
    json(res, 200, await leaderboard(await resolveIdentity(req.headers.cookie), new URL(req.url!, 'http://localhost').searchParams));
    return true;
  }
  if ((path === '/api/history' || /^\/api\/games\/[^/]+\/(report|replay|analysis)$/.test(path)) && req.method === 'GET') {
    const identity = await resolveIdentity(req.headers.cookie);
    if (!identity) { json(res, 401, { error: 'Sign in or start a guest session first.' }); return true; }
    try {
      const data = path === '/api/history' ? await pagedHistory(identity, new URL(req.url!, 'http://localhost').searchParams)
        : path.endsWith('/replay') ? await replayFor(identity, path.split('/')[3])
        : path.endsWith('/analysis') ? await analysisFor(identity, path.split('/')[3]) : await reportFor(identity, path.split('/')[3]);
      json(res, data ? 200 : 404, data ?? { error: 'This report or replay is unavailable, or you were not at this game.' });
    } catch (err) {
      if (err instanceof UserError) json(res, 400, { error: err.message });
      else { logDbError('game history/report', err); json(res, 503, { error: 'Could not load game data. Please try again.' }); }
    }
    return true;
  }
  if (path === '/api/friends' && (req.method === 'GET' || req.method === 'POST')) {
    await friendsRoute(req, res);
    return true;
  }
  if (path.startsWith('/api/friends/') && req.method === 'GET') {
    const identity = await resolveIdentity(req.headers.cookie);
    if (identity?.kind !== 'user') {
      json(res, 401, { error: 'Sign in to view friend profiles.' });
      return true;
    }
    const data = await friendProfileFor(identity, path.slice('/api/friends/'.length));
    json(res, data ? 200 : 404, data ?? { error: 'Profile unavailable. You can only view accepted friends.' });
    return true;
  }
  if (path === '/api/progress' && req.method === 'GET') {
    const identity = await resolveIdentity(req.headers.cookie);
    if (!identity) {
      json(res, 401, { error: 'No session' });
      return true;
    }
    json(res, 200, await progressDataFor(identity));
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
      try {
        await updateProfile(identity, parsed);
      } catch (err) {
        if (err instanceof UserError) {
          json(res, 400, { error: err.message });
          return true;
        }
        logDbError('profile save', err);
        json(res, 503, { error: "Couldn't save your profile right now. Try again in a moment." });
        return true;
      }
    }
    // A part that can't be read (say, a database behind the schema) is left out, not the whole page.
    const orElse = <T,>(part: Promise<T>, fallback: T, what: string) =>
      part.catch((err: unknown) => {
        logDbError(what, err);
        return fallback;
      });
    const db = getDb();
    const [session, history, providers, preferences, rating, ratings, admin, accuracy] = await Promise.all([
      sessionInfo(identity),
      orElse(historyFor(identity), [], 'game history'),
      orElse(linkedProviders(identity), [], 'linked accounts'),
      orElse(preferencesFor(identity), {}, 'profile preferences'),
      orElse(ratingFor(identity), null, 'rating'),
      identity.kind === 'user' ? orElse(modeRatingsFor(identity.id), emptyRatings(), 'mode ratings') : Promise.resolve(emptyRatings()),
      db ? orElse(isAdmin(db, identity), false, 'admin check') : Promise.resolve(false),
      orElse(accuracyFor(identity), { average: null, games: 0 }, 'accuracy'),
    ]);
    const data: ProfileData = { session, history, providers, preferences, favoriteMode: favoriteMode(history), rating, ratings, isAdmin: admin, accuracy };
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
