import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { createGame } from '@/engine';
import type { MapId, Mode } from '@/engine/types';
import { DEFAULT_KNIGHT } from '@/shared/knight';
import { DEFAULT_ROOM_SETTINGS } from '@/shared/protocol';
import { finalizeGame } from '../finalizeGame';
import { friendProfileFor, leaderboard } from '../social';
import { pagedHistory, reportFor } from '../historyApi';
import type { ServerIdentity } from '../identity';
import { deletePersonalData } from '../deletePersonalData';

let db: PrismaClient;
vi.mock('../db', () => ({ getDb: () => db }));
const url = process.env.TEST_SOCIAL_DATABASE_URL;
if (url && (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname) || new URL(url).pathname !== '/social_test')) throw new Error('Use npm run test:social with its disposable database.');

describe.skipIf(!url)('social and reports with PostgreSQL', () => {
  beforeAll(() => { db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) }); });
  afterAll(async () => { await db?.$disconnect(); });
  const identity = (id: string): ServerIdentity => ({ kind: 'user', id, key: `u:${id}`, displayName: 'Test', avatarUrl: null });
  async function users() {
    return Promise.all(['Alice', 'Bob', 'Carol'].map((name) => db.user.create({ data: { name, profile: { create: { displayName: name, rating: 1400, ratedGames: 20 } } } })));
  }
  async function match(ids: string[], mode: Mode = 'classic', map: MapId = 'standard') {
    const room = await db.room.create({ data: { code: randomUUID(), status: 'playing', settings: { ...DEFAULT_ROOM_SETTINGS, mode, map } } });
    const game = await db.game.create({ data: { roomId: room.id, mode, status: 'playing', settings: { ...DEFAULT_ROOM_SETTINGS, mode, map } } });
    const seats = ids.map((userId, seat) => ({ playerId: randomUUID(), identityKey: `u:${userId}`, isBot: false, name: `Player ${seat}`, color: (['red', 'blue', 'green'] as const)[seat], knight: DEFAULT_KNIGHT }));
    await db.player.createMany({ data: seats.map((s, seat) => ({ id: s.playerId, gameId: game.id, seat, userId: ids[seat], displayName: s.name, color: s.color, knightCustomization: { face: null } })) });
    const state = createGame({ seed: 12, mode, settings: { map }, players: seats.map((s) => ({ id: s.playerId, name: s.name, color: s.color, isBot: false })) });
    state.phase = 'ended'; state.winner = 0; state.turn.n = 5;
    return { gameId: game.id, room: { id: room.id, code: room.code, status: 'playing', settings: { ...DEFAULT_ROOM_SETTINGS, mode, map } }, seats, state };
  }

  it('finalizes once, keeps pools independent and preserves legacy ratings', async () => {
    const [a, b] = await users();
    const classic = await match([a.id, b.id]);
    await Promise.all([finalizeGame(db, classic), finalizeGame(db, classic), finalizeGame(db, classic)]);
    const first = await db.playerRating.findUniqueOrThrow({ where: { userId_poolKey: { userId: a.id, poolKey: 'classic' } } });
    expect(first).toMatchObject({ rating: 1024, ratedGames: 1, ratedWins: 1 });
    await finalizeGame(db, await match([a.id, b.id], 'ck'));
    expect(await db.playerRating.findUnique({ where: { userId_poolKey: { userId: a.id, poolKey: 'classic' } } })).toEqual(first);
    expect(await db.profile.findUnique({ where: { userId: a.id } })).toMatchObject({ gamesPlayed: 2, rating: 1400, ratedGames: 20 });
    expect(await db.player.findUnique({ where: { id: classic.seats[0].playerId } })).toMatchObject({ ratingBefore: 1000, ratingAfter: 1024, ratingPool: 'classic', ratingDelta: 24 });
    expect((await reportFor(identity(a.id), classic.gameId))?.players[0].rating?.delta).toBe(24);
  });
  it('rates and filters all four lobby modes without mixing map-based modes into the base ladders', async () => {
    const [a, b] = await users();
    const cases = [
      ['classic', 'standard', 'classic'], ['ck', 'standard', 'ck'],
      ['classic', 'farShores', 'voyagers'], ['ck', 'fourRealms', 'voyagers'],
      ['ck', 'veiledIsles', 'special'], ['ck', 'citadel', 'special'],
    ] as const;
    for (const [mode, map, pool] of cases) {
      const game = await match([a.id, b.id], mode, map);
      await finalizeGame(db, game);
      expect(await db.player.findUnique({ where: { id: game.seats[0].playerId } })).toMatchObject({ ratingPool: pool });
      expect((await reportFor(identity(a.id), game.gameId))?.players[0].rating?.pool).toBe(pool);
    }
    for (const [pool, count] of [['classic', 1], ['ck', 1], ['voyagers', 2], ['special', 2]] as const) {
      const rating = await db.playerRating.findUniqueOrThrow({ where: { userId_poolKey: { userId: a.id, poolKey: pool } } });
      expect(rating.ratedGames).toBe(count);
      const history = await pagedHistory(identity(a.id), new URLSearchParams({ mode: pool }));
      expect(history.summary.games).toBe(count);
      expect(history.games.every((g) => g.ratingPool === pool)).toBe(true);
      const board = await leaderboard(identity(a.id), new URLSearchParams({ mode: pool }));
      expect(board.pool).toBe(pool);
      expect(board.you?.ratedGames).toBe(count);
    }
    expect((await pagedHistory(identity(a.id), new URLSearchParams({ mode: 'classic', map: 'farShores' }))).games).toEqual([]);
    // Historical records without map metadata still belong to the base ruleset.
    await db.game.create({ data: { roomId: (await match([a.id, b.id])).room.id, mode: 'classic', status: 'finished', settings: {},
      players: { create: { id: randomUUID(), seat: 0, userId: a.id, displayName: 'A', color: 'red', knightCustomization: {} } } } });
    expect((await pagedHistory(identity(a.id), new URLSearchParams({ mode: 'classic' }))).summary.games).toBe(2);
  });
  it('serializes concurrent results for the same players', async () => {
    const [a, b] = await users();
    const games = await Promise.all([match([a.id, b.id]), match([b.id, a.id])]);
    await Promise.all(games.map((g) => finalizeGame(db, g)));
    const ratings = await db.playerRating.findMany({ where: { userId: { in: [a.id, b.id] } } });
    expect(ratings.map((r) => r.ratedGames)).toEqual([2, 2]);
    expect(ratings.reduce((n, r) => n + r.rating, 0)).toBe(2000);
    expect((await db.profile.findUniqueOrThrow({ where: { userId: a.id } })).gamesPlayed).toBe(2);
  });
  it('restricts friend profiles in both directions and never grants friends match-report access', async () => {
    const [a, b, c] = await users();
    await db.profile.update({ where: { userId: b.id }, data: { friendCode: 'ABCD2345', preferences: { useProviderAvatar: false } } });
    await db.friendship.create({ data: { requesterId: b.id, addresseeId: a.id, status: 'pending' } });
    expect(await friendProfileFor(identity(a.id), 'ABCD2345')).toBeNull();
    await db.friendship.updateMany({ where: { requesterId: b.id, addresseeId: a.id }, data: { status: 'accepted' } });
    const g = await match([b.id, c.id]); await finalizeGame(db, g);
    const profile = await friendProfileFor(identity(a.id), 'ABCD2345');
    expect(profile?.friend.avatarUrl).toBeNull();
    expect(profile?.recentGames).toHaveLength(1);
    expect(profile?.ratings.find((r) => r.pool === 'classic')?.ratedGames).toBe(1);
    expect(await reportFor(identity(a.id), g.gameId)).toBeNull();
    expect(await reportFor(identity(b.id), g.gameId)).not.toBeNull();
    await db.friendship.deleteMany({ where: { requesterId: b.id, addresseeId: a.id } });
    expect(await friendProfileFor(identity(a.id), 'ABCD2345')).toBeNull();
  });
  it('uses shared competition ranks and excludes pending friends', async () => {
    const [a, b, c] = await users();
    await db.playerRating.createMany({ data: [a, b, c].map((u) => ({ userId: u.id, poolKey: 'ck', rating: 1234, ratedGames: 5, ratedWins: 2 })) });
    await db.friendship.createMany({ data: [{ requesterId: a.id, addresseeId: b.id, status: 'accepted' }, { requesterId: a.id, addresseeId: c.id, status: 'pending' }] });
    const board = await leaderboard(identity(a.id), new URLSearchParams({ mode: 'ck', scope: 'friends' }));
    expect(board.entries).toHaveLength(2);
    expect(board.entries.map((e) => e.place)).toEqual([1, 1]);
    expect(board.you?.place).toBe(1);
    expect(board.entries.every((e) => e.gamesWon === 2)).toBe(true);
    expect((await leaderboard(null, new URLSearchParams({ scope: 'friends' }))).signInRequired).toBe(true);
  });
  it('paginates beyond 25 games with identical dates and aggregates the full filtered history', async () => {
    const [a, b] = await users();
    const g = await match([a.id, b.id]); await finalizeGame(db, g);
    const date = new Date('2026-01-01T12:00:00Z');
    for (let i = 0; i < 27; i++) {
      await db.game.create({ data: { roomId: g.room.id, mode: 'ck', status: 'finished', settings: { map: 'standard' }, startedAt: date,
        players: { create: { id: randomUUID(), seat: 0, userId: a.id, displayName: 'A', color: 'red', knightCustomization: {}, finalVp: 7, rank: 2 } } } });
    }
    const filters = new URLSearchParams({ mode: 'ck', map: 'standard' });
    const first = await pagedHistory(identity(a.id), filters);
    expect(first.games).toHaveLength(20); expect(first.summary).toMatchObject({ games: 27, wins: 0, averageVp: 7 });
    filters.set('cursor', first.nextCursor!);
    const second = await pagedHistory(identity(a.id), filters);
    expect(second.games).toHaveLength(7); expect(second.nextCursor).toBeNull();
    expect(new Set([...first.games, ...second.games].map((x) => x.gameId)).size).toBe(27);
    await expect(pagedHistory(identity(a.id), new URLSearchParams({ from: '2026-02-30' }))).rejects.toThrow('Invalid date');
    await expect(pagedHistory(identity(a.id), new URLSearchParams({ cursor: 'garbage' }))).rejects.toThrow('Invalid history cursor');
  });
  it('removes copied report data and mode ratings during account deletion', async () => {
    const [a, b] = await users(); const g = await match([a.id, b.id]); await finalizeGame(db, g);
    const deleted = await deletePersonalData(db, { kind: 'user', id: a.id }, { apply: true });
    expect(deleted.applied).toBe(true);
    expect(await db.playerRating.count({ where: { userId: a.id } })).toBe(0);
    expect(await reportFor(identity(b.id), g.gameId)).toBeNull();
    expect((await pagedHistory(identity(b.id), new URLSearchParams())).games[0].players[0].name).toBe('Deleted player');
  });
});
