import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { createGame } from '@/engine';
import { DEFAULT_ROOM_SETTINGS } from '@/shared/protocol';
import { DEFAULT_LOADOUT, xpForLevel } from '@/shared/progression';
import { finalizeGame } from '../finalizeGame';
import type { ServerIdentity } from '../identity';
import { adminDeleteGames, type AdminContext } from '../admin';
import { migrateGuestToUser } from '../migrateGuest';
import { progressDataFor, progressStateFor } from '../progression';
import { updateProfile } from '../profileApi';

let db: PrismaClient;
vi.mock('../db', () => ({ getDb: () => db, logDbError: (what: string, err: unknown) => console.error(what, err) }));
const url = process.env.TEST_SOCIAL_DATABASE_URL;
if (url && (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname) || new URL(url).pathname !== '/social_test')) throw new Error('Use npm run test:social with its disposable database.');

describe.skipIf(!url)('progression with PostgreSQL', () => {
  beforeAll(() => { db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) }); });
  afterAll(async () => { await db?.$disconnect(); });
  const userId = (u: { id: string }): ServerIdentity => ({ kind: 'user', id: u.id, key: `u:${u.id}`, displayName: 'Test', avatarUrl: null });
  const guestId = (id: string): ServerIdentity => ({ kind: 'guest', id, key: `g:${id}`, displayName: null, avatarUrl: null });
  const user = (name: string) => db.user.create({ data: { name, email: `${name.toLowerCase()}-${randomUUID()}@example.com`, profile: { create: { displayName: name } } } });
  const guest = () => db.guestSession.create({ data: { id: randomUUID(), expiresAt: new Date(Date.now() + 86400_000) } });

  /** A finished, finalized game; seat 0 wins. */
  async function game(seats: { userId?: string; guestId?: string; bot?: boolean }[]) {
    const settings = { ...DEFAULT_ROOM_SETTINGS };
    const room = await db.room.create({ data: { code: randomUUID().slice(0, 8).toUpperCase(), status: 'playing', settings } });
    const row = await db.game.create({ data: { roomId: room.id, mode: 'classic', status: 'playing', settings } });
    const players = seats.map((s, seat) => ({ playerId: randomUUID(), identityKey: s.userId ? `u:${s.userId}` : s.guestId ? `g:${s.guestId}` : null, isBot: !!s.bot,
      name: `Player ${seat}`, color: (['red', 'blue', 'green'] as const)[seat], knight: { face: null } }));
    await db.player.createMany({ data: players.map((p, seat) => ({ id: p.playerId, gameId: row.id, seat, userId: seats[seat].userId, guestSessionId: seats[seat].guestId,
      isBot: p.isBot, displayName: p.name, color: p.color, knightCustomization: { face: null } })) });
    const state = createGame({ seed: 3, mode: 'classic', settings: {}, players: players.map((p) => ({ id: p.playerId, name: p.name, color: p.color, isBot: p.isBot })) });
    state.phase = 'ended'; state.winner = 0; state.turn.n = 4;
    await finalizeGame(db, { gameId: row.id, room: { id: room.id, code: room.code, status: 'playing', settings }, seats: players as never, state });
    return { id: row.id, playerIds: players.map((p) => p.playerId) };
  }

  const profile = (id: string) => db.profile.findUniqueOrThrow({ where: { userId: id }, select: { xp: true, progress: true } });

  it('pays XP and feats when a game finishes, once', async () => {
    const [a, b] = await Promise.all([user('Ari'), user('Bo')]);
    const g = await game([{ userId: a.id }, { userId: b.id }]);
    // Winner: finish 100 + win 60 (no VP on an empty board) + feats: first landfall 250, knighted 250, self-made 500.
    expect((await profile(a.id)).xp).toBe(1160);
    expect((await profile(b.id)).xp).toBe(350);
    expect(await db.player.findUnique({ where: { id: g.playerIds[0] } })).toMatchObject({ xpGained: 1160 });
    const data = await progressDataFor(userId(a));
    expect(data.level).toMatchObject({ level: 8, xp: 1160 });
    expect(data.feats.find((f) => f.id === 'knighted')).toMatchObject({ n: 1, doneAt: expect.any(String) });
    expect(data.items.find((i) => i.id === 'title.d')).toMatchObject({ unlocked: true });
    expect(data.recent).toEqual([expect.objectContaining({ gameId: g.id, xp: 1160, won: true })]);
  });

  it('pays a quarter for games against bots only', async () => {
    const a = await user('Cy');
    await game([{ userId: a.id }, { bot: true }]);
    expect((await profile(a.id)).xp).toBe(Math.round(160 / 4) + 1000);
  });

  it('builds a missing record from game history, the same as it was built game by game', async () => {
    const [a, b] = await Promise.all([user('Di'), user('Ed')]);
    await game([{ userId: a.id }, { userId: b.id }]);
    await game([{ userId: b.id }, { userId: a.id }]);
    const before = await profile(a.id);
    await db.profile.update({ where: { userId: a.id }, data: { xp: 0 } });
    await db.$executeRaw`UPDATE profiles SET progress = NULL WHERE "userId" = ${a.id}`;
    const state = await progressStateFor(userId(a));
    expect(state.xp).toBe(before.xp);
    expect(await profile(a.id)).toEqual(before);
  });

  it('drops deleted games from XP', async () => {
    const [a, b] = await Promise.all([user('Fay'), user('Gil')]);
    await game([{ userId: a.id }, { userId: b.id }]);
    const gone = await game([{ userId: a.id }, { userId: b.id }]);
    const ctx = { rooms: { rooms: new Map() }, persistence: { flush: vi.fn(async () => {}) } } as unknown as AdminContext;
    await adminDeleteGames(db, ctx, [gone.id]);
    expect((await profile(a.id)).progress).toBeNull();
    expect((await progressStateFor(userId(a))).xp).toBe(1160);
  });

  it('adds a guest\'s games to the account it signs in to', async () => {
    const [a, b] = await Promise.all([user('Hal'), user('Ida')]);
    const g = await guest();
    await game([{ guestId: g.id }, { userId: b.id }]);
    expect((await db.guestSession.findUniqueOrThrow({ where: { id: g.id } })).xp).toBe(1160);
    await game([{ userId: b.id }, { userId: a.id }]);
    expect((await profile(a.id)).xp).toBe(350);
    await migrateGuestToUser(g.id, a.id);
    expect((await progressStateFor(userId(a))).xp).toBe(1160 + 350 - 250); // first landfall counts once
  });

  it('saves only unlocked items to the loadout', async () => {
    const [a, b] = await Promise.all([user('Jo'), user('Kai')]);
    await updateProfile(userId(a), { loadout: { character: 'character.c', banner: 'banner.b', title: 'title.d', surround: 'surround.a' } });
    expect((await progressStateFor(userId(a))).loadout).toEqual(DEFAULT_LOADOUT);
    await game([{ userId: a.id }, { userId: b.id }]);
    await db.profile.update({ where: { userId: a.id }, data: { xp: xpForLevel(4) } });
    await updateProfile(userId(a), { loadout: { character: 'character.c', banner: 'banner.b', title: 'title.d', surround: 'surround.c' } });
    expect((await progressStateFor(userId(a))).loadout).toEqual({ character: 'character.c', banner: 'banner.b', title: 'title.d', surround: 'surround.a' });
  });

  it('starts guests without a record at level 1', async () => {
    const g = await guest();
    expect((await progressDataFor(guestId(g.id))).level).toMatchObject({ level: 1, xp: 0 });
  });
});
