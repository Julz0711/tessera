import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { createGame } from '@/engine';
import { DEFAULT_ROOM_SETTINGS } from '@/shared/protocol';
import { finalizeGame } from '../finalizeGame';
import type { ServerIdentity } from '../identity';
import { adminDeleteGames, adminDeleteGuest, adminDeleteUser, adminGames, adminUsers, isAdmin, type AdminContext } from '../admin';

let db: PrismaClient;
vi.mock('../db', () => ({ getDb: () => db }));
const url = process.env.TEST_SOCIAL_DATABASE_URL;
if (url && (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname) || new URL(url).pathname !== '/social_test')) throw new Error('Use npm run test:social with its disposable database.');

/** Just enough of a live room for the admin module: seats, game id and close(). */
function liveRoom(code: string, gameId: string | null, identityKeys: string[]) {
  return { code, gameId, status: 'playing', closed: false, closedWith: '', seats: identityKeys.map((identityKey) => ({ identityKey, left: false })),
    close(reason: string) { this.closed = true; this.closedWith = reason; } };
}
function context(rooms: ReturnType<typeof liveRoom>[] = []) {
  const ctx = { rooms: { rooms: new Map(rooms.map((r) => [r.code, r])) }, persistence: { flush: vi.fn(async () => {}) } };
  return ctx as typeof ctx & AdminContext;
}

describe.skipIf(!url)('admin panel with PostgreSQL', () => {
  beforeAll(() => { db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) }); });
  afterAll(async () => { await db?.$disconnect(); });
  afterEach(() => { delete process.env.ADMIN_EMAILS; });
  const identity = (id: string): ServerIdentity => ({ kind: 'user', id, key: `u:${id}`, displayName: 'Test', avatarUrl: null });
  const user = (name: string) => db.user.create({ data: { name, email: `${name.toLowerCase()}-${randomUUID()}@example.com`, profile: { create: { displayName: name } } } });

  /** A game in the database: finished (and finalized) unless `finished` is false. */
  async function game(seats: { userId?: string; guestId?: string }[], finished = true) {
    const settings = { ...DEFAULT_ROOM_SETTINGS };
    const room = await db.room.create({ data: { code: randomUUID().slice(0, 8).toUpperCase(), status: 'playing', settings } });
    const row = await db.game.create({ data: { roomId: room.id, mode: 'classic', status: 'playing', settings } });
    const players = seats.map((s, seat) => ({ playerId: randomUUID(), identityKey: s.userId ? `u:${s.userId}` : `g:${s.guestId}`, isBot: false, name: `Player ${seat}`,
      color: (['red', 'blue', 'green'] as const)[seat], knight: { face: null } }));
    await db.player.createMany({ data: players.map((p, seat) => ({ id: p.playerId, gameId: row.id, seat, userId: seats[seat].userId, guestSessionId: seats[seat].guestId,
      displayName: p.name, color: p.color, knightCustomization: { face: null } })) });
    await db.gameEvent.create({ data: { gameId: row.id, seq: 1, type: 'roll', payload: {} } });
    const state = createGame({ seed: 3, mode: 'classic', settings: {}, players: players.map((p) => ({ id: p.playerId, name: p.name, color: p.color, isBot: false })) });
    if (finished) {
      state.phase = 'ended'; state.winner = 0; state.turn.n = 4;
      await finalizeGame(db, { gameId: row.id, room: { id: room.id, code: room.code, status: 'playing', settings }, seats: players as never, state });
    }
    return { id: row.id, roomId: room.id, code: room.code, playerIds: players.map((p) => p.playerId) };
  }

  it('admits listed user ids, and listed emails only with a Google sign-in', async () => {
    const [a, b] = await Promise.all([user('Ada'), user('Ben')]);
    process.env.ADMIN_EMAILS = `${a.email!.toUpperCase()}, ${b.id}`;
    expect(await isAdmin(db, identity(a.id))).toBe(false);
    await db.account.create({ data: { userId: a.id, type: 'oidc', provider: 'google', providerAccountId: randomUUID() } });
    expect(await isAdmin(db, identity(a.id))).toBe(true);
    expect(await isAdmin(db, identity(b.id))).toBe(true);
    expect(await isAdmin(db, { kind: 'guest', id: b.id, key: `g:${b.id}`, displayName: null, avatarUrl: null })).toBe(false);
    delete process.env.ADMIN_EMAILS;
    expect(await isAdmin(db, identity(b.id))).toBe(false);
  });

  it('deletes finished games with their records and gives back the stats they counted', async () => {
    const [a, b] = await Promise.all([user('Cleo'), user('Dan')]);
    const guest = await db.guestSession.create({ data: { id: randomUUID(), expiresAt: new Date(Date.now() + 86400_000) } });
    const kept = await game([{ userId: a.id }, { userId: b.id }]);
    const gone = await game([{ userId: a.id }, { userId: b.id }, { guestId: guest.id }]);
    expect(await db.profile.findUnique({ where: { userId: a.id } })).toMatchObject({ gamesPlayed: 2, gamesWon: 2 });
    const rating = await db.playerRating.findUniqueOrThrow({ where: { userId_poolKey: { userId: a.id, poolKey: 'classic' } } });

    const result = await adminDeleteGames(db, context(), [gone.id, 'missing']);
    expect(result).toMatchObject({ deleted: 1, closedRooms: [] });
    expect(await db.profile.findUnique({ where: { userId: a.id } })).toMatchObject({ gamesPlayed: 1, gamesWon: 1 });
    expect(await db.profile.findUnique({ where: { userId: b.id } })).toMatchObject({ gamesPlayed: 1, gamesWon: 0 });
    expect(await db.guestSession.findUnique({ where: { id: guest.id } })).toMatchObject({ gamesPlayed: 0, gamesWon: 0 });
    // Ratings are left alone on purpose.
    expect(await db.playerRating.findUniqueOrThrow({ where: { userId_poolKey: { userId: a.id, poolKey: 'classic' } } })).toEqual(rating);
    expect(await db.game.findUnique({ where: { id: gone.id } })).toBeNull();
    expect(await db.player.count({ where: { gameId: gone.id } })).toBe(0);
    expect(await db.gameEvent.count({ where: { gameId: gone.id } })).toBe(0);
    expect(await db.room.findUnique({ where: { id: gone.roomId } })).toBeNull();
    expect(await db.game.findUnique({ where: { id: kept.id } })).not.toBeNull();
  });

  it('closes a live table before deleting its unfinished game, without touching stats', async () => {
    const [a, b] = await Promise.all([user('Eve'), user('Finn')]);
    const g = await game([{ userId: a.id }, { userId: b.id }], false);
    const room = liveRoom(g.code, g.id, [`u:${a.id}`, `u:${b.id}`]);
    const other = liveRoom('OTHER123', randomUUID(), [`u:${a.id}`]);
    const ctx = context([room, other]);
    expect((await adminGames(db, ctx, new URLSearchParams({ q: g.code }))).entries).toMatchObject([{ id: g.id, live: true, status: 'playing' }]);
    const result = await adminDeleteGames(db, ctx, [g.id]);
    expect(result).toMatchObject({ deleted: 1, closedRooms: [g.code] });
    expect(room.closedWith).toBe('An admin closed this table');
    expect(other.closed).toBe(false);
    expect(ctx.rooms.rooms.has(g.code)).toBe(false);
    expect(ctx.persistence.flush).toHaveBeenCalled();
    expect(await db.profile.findUnique({ where: { userId: a.id } })).toMatchObject({ gamesPlayed: 0 });
    expect(await db.game.findUnique({ where: { id: g.id } })).toBeNull();
  });

  it('deletes a user, anonymizes their seats and keeps the other players\' history', async () => {
    const [admin, a, b] = await Promise.all([user('Root'), user('Gus'), user('Hana')]);
    const migrated = await db.guestSession.create({ data: { id: randomUUID(), expiresAt: new Date(Date.now() + 86400_000), migratedToUserId: a.id } });
    await db.friendship.create({ data: { requesterId: a.id, addresseeId: b.id, status: 'accepted' } });
    const done = await game([{ userId: a.id }, { userId: b.id }]);
    const running = await game([{ userId: b.id }, { userId: a.id }], false);
    const room = liveRoom(running.code, running.id, [`u:${b.id}`, `u:${a.id}`]);
    const ctx = context([room]);
    expect((await adminUsers(db, ctx, new URLSearchParams({ q: 'gus' }))).entries).toMatchObject([{ id: a.id, liveRoom: running.code, gamesPlayed: 1 }]);

    await expect(adminDeleteUser(db, ctx, identity(admin.id), admin.id)).rejects.toThrow("can't delete your own account");
    expect(await adminDeleteUser(db, ctx, identity(admin.id), a.id)).toMatchObject({ deleted: 1, closedRooms: [running.code] });
    expect(room.closed).toBe(true);
    expect(await db.user.findUnique({ where: { id: a.id } })).toBeNull();
    expect(await db.profile.findUnique({ where: { userId: a.id } })).toBeNull();
    expect(await db.guestSession.findUnique({ where: { id: migrated.id } })).toBeNull();
    expect(await db.friendship.count({ where: { OR: [{ requesterId: a.id }, { addresseeId: a.id }] } })).toBe(0);
    expect(await db.player.findUnique({ where: { id: done.playerIds[0] } })).toMatchObject({ userId: null, displayName: 'Deleted player', won: true });
    expect(await db.player.findUnique({ where: { id: done.playerIds[1] } })).toMatchObject({ userId: b.id, displayName: 'Player 1' });
    await expect(adminDeleteUser(db, ctx, identity(admin.id), a.id)).rejects.toThrow('no longer exists');
  });

  it('deletes a guest and anonymizes its seats', async () => {
    const a = await user('Ivy');
    const guest = await db.guestSession.create({ data: { id: randomUUID(), displayName: 'Wanderer', expiresAt: new Date(Date.now() + 86400_000) } });
    const g = await game([{ userId: a.id }, { guestId: guest.id }]);
    expect(await adminDeleteGuest(db, context(), guest.id)).toMatchObject({ deleted: 1, closedRooms: [] });
    expect(await db.guestSession.findUnique({ where: { id: guest.id } })).toBeNull();
    expect(await db.player.findUnique({ where: { id: g.playerIds[1] } })).toMatchObject({ guestSessionId: null, displayName: 'Deleted player' });
  });
});
