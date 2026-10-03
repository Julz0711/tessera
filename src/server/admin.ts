/**
 * Operator admin panel API (/api/admin/*). Admins are listed in ADMIN_EMAILS (emails or user ids).
 * Deletions run against the live server: any room still in memory is closed first and its queued
 * writes flushed, so nothing gets written back after the rows are gone. Formal privacy erasure
 * (replays, reports, orphaned portraits) stays with `npm run privacy:delete`.
 */
import { getDb, type Db } from './db';
import type { ServerIdentity } from './identity';
import type { RoomManager } from './rooms';
import { UserError } from './room';

export interface AdminContext {
  rooms: RoomManager;
  persistence?: { flush(): Promise<void> };
}

const PAGE = 50;
const CLOSED_REASON = 'An admin closed this table';

function adminList(): Set<string> {
  return new Set((process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
}

/**
 * Signed-in users only. An email counts only when a Google sign-in vouches for it (Discord doesn't
 * report verified emails to us); anyone can always be listed by user id.
 */
export async function isAdmin(db: Db, identity: ServerIdentity | null): Promise<boolean> {
  if (identity?.kind !== 'user') return false;
  const list = adminList();
  if (!list.size) return false;
  if (list.has(identity.id.toLowerCase())) return true;
  const user = await db.user.findUnique({ where: { id: identity.id }, select: { email: true, accounts: { where: { provider: 'google' }, select: { id: true } } } });
  return !!user?.email && user.accounts.length > 0 && list.has(user.email.toLowerCase());
}

/**
 * Development only: `DEV_ADMIN=1` gives every player the in-game admin tools, to test them without a
 * database or a sign-in. Ignored in production builds.
 */
export function devAdmin(): boolean {
  return process.env.DEV_ADMIN === '1' && process.env.NODE_ENV !== 'production';
}

/** Whether a socket's identity gets the in-game admin tools (never throws: no database means no). */
export async function isAdminIdentity(identity: ServerIdentity): Promise<boolean> {
  if (devAdmin()) return true;
  const db = getDb();
  if (!db) return false;
  try {
    return await isAdmin(db, identity);
  } catch (err) {
    console.error('[admin] admin check failed', err);
    return false;
  }
}

const page = (params: URLSearchParams) => Math.max(1, Math.floor(Number(params.get('page')) || 1));
const pages = (total: number) => Math.max(1, Math.ceil(total / PAGE));
const search = (params: URLSearchParams) => (params.get('q') ?? '').trim().slice(0, 100);

function liveRooms(ctx: AdminContext) {
  return [...ctx.rooms.rooms.values()].filter((r) => !r.closed);
}

/** Identity keys (`u:`/`g:`) seated in a live room, and live game ids. */
function liveIndex(ctx: AdminContext) {
  const identities = new Map<string, string>();
  const games = new Map<string, string>();
  for (const room of liveRooms(ctx)) {
    if (room.gameId && room.status === 'playing') games.set(room.gameId, room.code);
    for (const seat of room.seats) if (seat.identityKey && !seat.left) identities.set(seat.identityKey, room.code);
  }
  return { identities, games };
}

/** Closes every live room matching `pick`, then waits for their queued writes to land. */
async function closeRooms(ctx: AdminContext, pick: (room: ReturnType<typeof liveRooms>[number]) => boolean): Promise<string[]> {
  const closed: string[] = [];
  for (const room of liveRooms(ctx)) {
    if (!pick(room)) continue;
    room.close(CLOSED_REASON);
    ctx.rooms.rooms.delete(room.code);
    closed.push(room.code);
  }
  if (closed.length) await ctx.persistence?.flush();
  return closed;
}

export async function adminOverview(db: Db, ctx: AdminContext) {
  const [users, guests, games, finished] = await Promise.all([
    db.user.count(), db.guestSession.count(), db.game.count(), db.game.count({ where: { status: 'finished' } }),
  ]);
  const live = liveRooms(ctx);
  return { users, guests, games, finished, liveRooms: live.length, livePlaying: live.filter((r) => r.status === 'playing').length };
}

export async function adminUsers(db: Db, ctx: AdminContext, params: URLSearchParams) {
  const q = search(params);
  const where = q ? { OR: [
    { id: q }, { email: { contains: q, mode: 'insensitive' as const } }, { name: { contains: q, mode: 'insensitive' as const } },
    { profile: { displayName: { contains: q, mode: 'insensitive' as const } } },
  ] } : {};
  const p = page(params);
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * PAGE, take: PAGE, select: {
      id: true, email: true, name: true, createdAt: true,
      profile: { select: { displayName: true, gamesPlayed: true, gamesWon: true } },
      accounts: { select: { provider: true } },
      ratings: { select: { rating: true, ratedGames: true } },
      sessions: { select: { expires: true }, orderBy: { expires: 'desc' }, take: 1 },
    } }),
  ]);
  const { identities } = liveIndex(ctx);
  return { total, page: p, pages: pages(total), entries: rows.map((u) => ({
    id: u.id, email: u.email, name: u.profile?.displayName ?? u.name ?? '(no name)', createdAt: u.createdAt,
    gamesPlayed: u.profile?.gamesPlayed ?? 0, gamesWon: u.profile?.gamesWon ?? 0,
    rating: Math.max(0, ...u.ratings.filter((r) => r.ratedGames > 0).map((r) => r.rating)) || null,
    providers: [...new Set(u.accounts.map((a) => a.provider))],
    sessionExpires: u.sessions[0]?.expires ?? null,
    liveRoom: identities.get(`u:${u.id}`) ?? null,
  })) };
}

export async function adminGuests(db: Db, ctx: AdminContext, params: URLSearchParams) {
  const q = search(params);
  const where = {
    migratedToUserId: params.get('migrated') === '1' ? undefined : null,
    ...(q ? { OR: [{ id: q }, { displayName: { contains: q, mode: 'insensitive' as const } }] } : {}),
  };
  const p = page(params);
  const [total, rows] = await Promise.all([
    db.guestSession.count({ where }),
    db.guestSession.findMany({ where, orderBy: { lastSeenAt: 'desc' }, skip: (p - 1) * PAGE, take: PAGE, select: {
      id: true, displayName: true, gamesPlayed: true, gamesWon: true, createdAt: true, lastSeenAt: true, expiresAt: true, migratedToUserId: true,
    } }),
  ]);
  const { identities } = liveIndex(ctx);
  return { total, page: p, pages: pages(total), entries: rows.map((g) => ({ ...g, liveRoom: identities.get(`g:${g.id}`) ?? null })) };
}

const GAME_STATUSES = ['playing', 'finished'];

export async function adminGames(db: Db, ctx: AdminContext, params: URLSearchParams) {
  const q = search(params);
  const status = params.get('status');
  const where = {
    ...(status && GAME_STATUSES.includes(status) ? { status } : {}),
    ...(q ? { OR: [
      { id: q }, { room: { code: { equals: q.toUpperCase() } } },
      { players: { some: { displayName: { contains: q, mode: 'insensitive' as const } } } },
    ] } : {}),
  };
  const p = page(params);
  const [total, rows] = await Promise.all([
    db.game.count({ where }),
    db.game.findMany({ where, orderBy: [{ startedAt: 'desc' }, { id: 'desc' }], skip: (p - 1) * PAGE, take: PAGE, select: {
      id: true, mode: true, status: true, turns: true, startedAt: true, endedAt: true, settings: true,
      room: { select: { code: true } },
      players: { orderBy: { seat: 'asc' }, select: { displayName: true, isBot: true, userId: true, guestSessionId: true, won: true, finalVp: true } },
    } }),
  ]);
  const { games } = liveIndex(ctx);
  return { total, page: p, pages: pages(total), entries: rows.map((g) => ({
    id: g.id, code: g.room.code, mode: g.mode, map: (g.settings as { map?: string } | null)?.map ?? null, status: g.status, turns: g.turns,
    startedAt: g.startedAt, endedAt: g.endedAt, live: games.has(g.id),
    players: g.players.map((pl) => ({ name: pl.displayName, kind: pl.isBot ? 'bot' : pl.userId ? 'user' : pl.guestSessionId ? 'guest' : 'gone', won: pl.won, vp: pl.finalVp })),
  })) };
}

/** Deletes games (events, snapshots and players cascade). Finished games give back the wins and games played they counted. */
export async function adminDeleteGames(db: Db, ctx: AdminContext, ids: string[]) {
  const games = await db.game.findMany({ where: { id: { in: ids } }, select: { id: true, roomId: true } });
  const found = new Set(games.map((g) => g.id));
  const closedRooms = await closeRooms(ctx, (room) => !!room.gameId && found.has(room.gameId));
  const liveCodes = new Set(liveRooms(ctx).map((r) => r.code));
  let statsReverted = 0;
  await db.$transaction(async (tx) => {
    // Re-read inside the transaction: a game may have finished while its room was closing.
    const finished = await tx.player.findMany({ where: { gameId: { in: [...found] }, game: { status: 'finished' }, rank: { not: null } },
      select: { userId: true, guestSessionId: true, won: true } });
    for (const p of finished) {
      const won = p.won ? 1 : 0;
      if (p.userId) {
        statsReverted += (await tx.profile.updateMany({ where: { userId: p.userId, gamesPlayed: { gt: 0 } }, data: { gamesPlayed: { decrement: 1 } } })).count;
        if (won) await tx.profile.updateMany({ where: { userId: p.userId, gamesWon: { gt: 0 } }, data: { gamesWon: { decrement: 1 } } });
      } else if (p.guestSessionId) {
        statsReverted += (await tx.guestSession.updateMany({ where: { id: p.guestSessionId, gamesPlayed: { gt: 0 } }, data: { gamesPlayed: { decrement: 1 } } })).count;
        if (won) await tx.guestSession.updateMany({ where: { id: p.guestSessionId, gamesWon: { gt: 0 } }, data: { gamesWon: { decrement: 1 } } });
      }
    }
    await tx.game.deleteMany({ where: { id: { in: [...found] } } });
    // A room with no games left is only a lobby record: drop it unless it's still open.
    const roomIds = [...new Set(games.map((g) => g.roomId))];
    const empty = await tx.room.findMany({ where: { id: { in: roomIds }, games: { none: {} } }, select: { id: true, code: true } });
    await tx.room.deleteMany({ where: { id: { in: empty.filter((r) => !liveCodes.has(r.code)).map((r) => r.id) } } });
  }, { timeout: 60_000 });
  return { deleted: found.size, closedRooms, statsReverted };
}

const ANONYMOUS = { displayName: 'Deleted player', knightCustomization: { face: null } };

/**
 * Deletes an account: sign-ins, sessions, profile, ratings and friendships cascade; guest sessions
 * it migrated from go too. Its seats in past games stay (other players' history) as "Deleted player".
 */
export async function adminDeleteUser(db: Db, ctx: AdminContext, actor: ServerIdentity, userId: string) {
  if (userId === actor.id) throw new UserError("You can't delete your own account here.");
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!user) throw new UserError('That user no longer exists.');
  const guests = (await db.guestSession.findMany({ where: { migratedToUserId: userId }, select: { id: true } })).map((g) => g.id);
  const keys = new Set([`u:${userId}`, ...guests.map((id) => `g:${id}`)]);
  const closedRooms = await closeRooms(ctx, (room) => room.seats.some((s) => !!s.identityKey && keys.has(s.identityKey)));
  await db.$transaction(async (tx) => {
    await tx.player.updateMany({ where: { OR: [{ userId }, { guestSessionId: { in: guests } }] }, data: { userId: null, guestSessionId: null, ...ANONYMOUS } });
    if (user.email) await tx.verificationToken.deleteMany({ where: { identifier: user.email } });
    await tx.guestSession.deleteMany({ where: { id: { in: guests } } });
    await tx.user.delete({ where: { id: userId } });
  }, { timeout: 60_000 });
  return { deleted: 1, closedRooms };
}

export async function adminDeleteGuest(db: Db, ctx: AdminContext, guestId: string) {
  const guest = await db.guestSession.findUnique({ where: { id: guestId }, select: { id: true } });
  if (!guest) throw new UserError('That guest no longer exists.');
  const closedRooms = await closeRooms(ctx, (room) => room.seats.some((s) => s.identityKey === `g:${guestId}`));
  await db.$transaction([
    db.player.updateMany({ where: { guestSessionId: guestId }, data: { guestSessionId: null, ...ANONYMOUS } }),
    db.guestSession.delete({ where: { id: guestId } }),
  ]);
  return { deleted: 1, closedRooms };
}

export function idsFrom(body: unknown): string[] {
  const ids = (body as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 200 || !ids.every((id) => typeof id === 'string' && id.length <= 64)) {
    throw new UserError('Invalid request');
  }
  return [...new Set(ids as string[])];
}
