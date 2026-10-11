/**
 * Runs against a real PostgreSQL when DATABASE_URL is set (e.g. `npm run db:local` + `npm run db:push`);
 * skipped otherwise.
 */
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { botAction } from '@/bots';
import { seatsToAsk } from '@/bots/simulate';
import { applyAction, createGame, viewFor, type GameState } from '@/engine';
import { DEFAULT_KNIGHT } from '@/shared/knight';
import { DEFAULT_ROOM_SETTINGS } from '@/shared/protocol';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('prisma persistence', async () => {
  const { getDb } = await import('../db');
  const { createPrismaPersistence } = await import('../prismaPersistence');
  const db = getDb()!;
  const persistence = createPrismaPersistence(db);

  function setup(humans: string[]) {
    const roomId = randomUUID();
    const code = Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
    const seats = [...humans.map((key) => ({ key, bot: false })), { key: null, bot: true }].map((s, i) => ({
      playerId: randomUUID(),
      identityKey: s.key,
      isBot: s.bot,
      name: `P${i}`,
      color: (['red', 'blue', 'orange'] as const)[i],
      knight: DEFAULT_KNIGHT,
    }));
    const state = createGame({
      seed: 99,
      mode: 'classic',
      players: seats.map((s) => ({ id: s.playerId, name: s.name, color: s.color, isBot: s.isBot })),
    });
    const room = { id: roomId, code, status: 'playing', settings: DEFAULT_ROOM_SETTINGS };
    return { room, seats, state, gameId: randomUUID() };
  }

  /** Plays `steps` bot actions, persisting each like the Room does. */
  function play(g: ReturnType<typeof setup>, steps: number): GameState {
    let s = g.state;
    for (let i = 0; i < steps && s.phase !== 'ended'; i++) {
      const seat = seatsToAsk(s)[0];
      const action = botAction(viewFor(s, seat), seat, { tradeTimedOut: true })!;
      const r = applyAction(s, seat, action);
      if (!r.ok) throw new Error(r.error);
      s = r.state;
      persistence.gameAction(g.gameId, s.seq, g.seats[seat].playerId, action, r.events);
      if (i % 25 === 24) persistence.snapshot(g.gameId, s);
    }
    return s;
  }

  it('stores a finished game with ranks and updates guest stats', async () => {
    const guestId = randomUUID();
    const g = setup([`g:${guestId}`, `g:${randomUUID()}`]);
    persistence.roomCreated(g.room);
    persistence.gameStarted({ gameId: g.gameId, room: g.room, seats: g.seats, state: g.state });
    const final = play(g, 20_000);
    expect(final.phase).toBe('ended');
    persistence.gameEnded({ gameId: g.gameId, room: g.room, seats: g.seats, state: final });
    await persistence.flush();

    const game = await db.game.findUnique({ where: { id: g.gameId }, include: { players: true } });
    expect(game?.status).toBe('finished');
    expect(game?.winnerPlayerId).toBe(g.seats[final.winner!].playerId);
    expect(game?.players.map((p) => p.rank).sort()).toEqual([1, 2, 3]);
    const events = await db.gameEvent.count({ where: { gameId: g.gameId } });
    expect(events).toBeGreaterThan(50);
    const guest = await db.guestSession.findUnique({ where: { id: guestId } });
    expect(guest?.gamesPlayed).toBe(1);
    expect(guest?.gamesWon).toBe(final.winner === 0 ? 1 : 0);
  });

  it('serves a finished game as a replay to the table, and only to the table', async () => {
    const { replayFor } = await import('../historyApi');
    const { buildReplay } = await import('@/engine/replay');
    const guestId = randomUUID();
    const g = setup([`g:${guestId}`]);
    persistence.roomCreated(g.room);
    persistence.gameStarted({ gameId: g.gameId, room: g.room, seats: g.seats, state: g.state });
    const final = play(g, 20_000);
    persistence.gameEnded({ gameId: g.gameId, room: g.room, seats: g.seats, state: final });
    await persistence.flush();

    const identity = (id: string) => ({ key: `g:${id}`, kind: 'guest' as const, id, displayName: null, avatarUrl: null });
    expect(await replayFor(identity(randomUUID()), g.gameId)).toBeNull();
    const data = await replayFor(identity(guestId), g.gameId);
    expect(data).not.toBeNull();
    const replay = buildReplay(data!);
    expect(replay.stopped).toBe(false);
    expect(replay.stateAt(replay.total).buildings).toEqual(final.buildings);
    expect(replay.stateAt(replay.total).winner).toBe(final.winner);
  });

  it('records a game even when a new guest is saved at the same moment', async () => {
    // Joining (rememberProfile) and starting the game both create the guest row, on different queues.
    for (let i = 0; i < 40; i++) {
      const guestId = randomUUID();
      const g = setup([`g:${guestId}`]);
      persistence.roomCreated(g.room);
      await persistence.flush();
      persistence.gameStarted({ gameId: g.gameId, room: g.room, seats: g.seats, state: g.state });
      // Land the guest's own save while the game start is between creating the game and its players.
      await new Promise((r) => setTimeout(r, i % 4));
      persistence.rememberProfile(`g:${guestId}`, { name: 'Racer', color: 'red', knight: DEFAULT_KNIGHT });
      await persistence.flush();
      expect(await db.player.count({ where: { gameId: g.gameId } })).toBe(g.seats.length);
    }
  });

  it('migrates a guest to a profile exactly once', async () => {
    const { migrateGuestToUser, ensureProfile } = await import('../migrateGuest');
    const guestId = randomUUID();
    const g = setup([`g:${guestId}`]);
    persistence.roomCreated(g.room);
    persistence.gameStarted({ gameId: g.gameId, room: g.room, seats: g.seats, state: g.state });
    const final = play(g, 20_000);
    persistence.gameEnded({ gameId: g.gameId, room: g.room, seats: g.seats, state: final });
    persistence.rememberProfile(`g:${guestId}`, { name: 'Alex', color: 'green', knight: DEFAULT_KNIGHT });
    await persistence.flush();

    const user = await db.user.create({ data: { name: 'Alex G.' } });
    await ensureProfile(user.id, user.name);
    expect(await migrateGuestToUser(guestId, user.id, true)).toBe(true);
    expect(await migrateGuestToUser(guestId, user.id, true)).toBe(false);

    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    expect(profile?.gamesPlayed).toBe(1);
    expect(profile?.displayName).toBe('Alex');
    expect(profile?.color).toBe('green');
    const players = await db.player.findMany({ where: { userId: user.id } });
    expect(players).toHaveLength(1);
    expect(players[0].guestSessionId).toBe(guestId);
    const guest = await db.guestSession.findUnique({ where: { id: guestId } });
    expect(guest?.migratedToUserId).toBe(user.id);
  });

  it('restores a running game from snapshot + event replay', async () => {
    const guestId = randomUUID();
    const g = setup([`g:${guestId}`]);
    persistence.roomCreated(g.room);
    persistence.gameStarted({ gameId: g.gameId, room: g.room, seats: g.seats, state: g.state });
    const live = play(g, 60);
    await persistence.flush();
    // The guest saved a frame and title; the bot has none.
    await db.guestSession.update({ where: { id: guestId }, data: { cosmetics: { frame: 'wood', title: 'trader' } } });

    const restored = await persistence.restoreRoom(g.room.code);
    expect(restored).not.toBeNull();
    expect(restored!.gameId).toBe(g.gameId);
    expect(restored!.state.seq).toBe(live.seq);
    expect(restored!.state.rng).toBe(live.rng);
    expect(restored!.state.buildings).toEqual(live.buildings);
    expect(restored!.seats.map((s) => s.playerId)).toEqual(g.seats.map((s) => s.playerId));
    expect(restored!.seats[0].identityKey).toBe(g.seats[0].identityKey);
    expect(restored!.seats[0].cosmetics).toEqual({ frame: 'wood', title: 'trader' });
    expect(restored!.seats.at(-1)!.cosmetics).toBeUndefined();
  });

  it('rates games between signed-in players, and only those', async () => {
    const a = await db.user.create({ data: { name: 'Ann' } });
    const b = await db.user.create({ data: { name: 'Bob' } });
    const g = setup([`u:${a.id}`, `u:${b.id}`]);
    persistence.roomCreated(g.room);
    persistence.gameStarted({ gameId: g.gameId, room: g.room, seats: g.seats, state: g.state });
    const final = play(g, 20_000);
    persistence.gameEnded({ gameId: g.gameId, room: g.room, seats: g.seats, state: final });
    await persistence.flush();

    const [pa, pb] = await Promise.all([db.playerRating.findUnique({ where: { userId_poolKey: { userId: a.id, poolKey: 'classic' } } }), db.playerRating.findUnique({ where: { userId_poolKey: { userId: b.id, poolKey: 'classic' } } })]);
    expect(pa?.ratedGames).toBe(1);
    expect(pb?.ratedGames).toBe(1);
    // Two equal newcomers: one goes up, the other down by as much (unless a bot won and they tied).
    expect(pa!.rating + pb!.rating).toBe(2000);
    const players = await db.player.findMany({ where: { gameId: g.gameId, userId: { not: null } } });
    expect(players.every((p) => p.ratingDelta !== null)).toBe(true);

    // A lone signed-in player against bots isn't rated.
    const solo = setup([`u:${a.id}`]);
    persistence.roomCreated(solo.room);
    persistence.gameStarted({ gameId: solo.gameId, room: solo.room, seats: solo.seats, state: solo.state });
    const soloFinal = play(solo, 20_000);
    persistence.gameEnded({ gameId: solo.gameId, room: solo.room, seats: solo.seats, state: soloFinal });
    await persistence.flush();
    expect((await db.playerRating.findUnique({ where: { userId_poolKey: { userId: a.id, poolKey: 'classic' } } }))?.ratedGames).toBe(1);
  });

  it('handles friend requests, recent players, invites and the leaderboard', async () => {
    const social = await import('../social');
    const me = await db.user.create({ data: { name: 'Me' } });
    const you = await db.user.create({ data: { name: 'You' } });
    const meId = { kind: 'user' as const, id: me.id, key: `u:${me.id}` } as never;
    const youId = { kind: 'user' as const, id: you.id, key: `u:${you.id}` } as never;

    const mine = await social.friendsFor(meId);
    const yours = await social.friendsFor(youId);
    expect(mine.enabled).toBe(true);
    expect(mine.myCode).toMatch(/^[A-Z2-9]{8}$/);

    await expect(social.requestFriend(meId, mine.myCode)).rejects.toThrow(/own code/);
    await expect(social.requestFriend(meId, 'ZZZZZZZZ')).rejects.toThrow();
    await social.requestFriend(meId, yours.myCode);
    expect((await social.friendsFor(meId)).outgoing.map((c) => c.code)).toEqual([yours.myCode]);
    expect((await social.friendsFor(youId)).incoming.map((c) => c.code)).toEqual([mine.myCode]);

    // Asking back accepts.
    await social.requestFriend(youId, mine.myCode);
    const friends = await social.friendsFor(meId);
    expect(friends.friends.map((f) => f.code)).toEqual([yours.myCode]);
    expect(friends.friends[0].status).toBe('offline');
    await expect(social.inviteFriend(meId, yours.myCode)).rejects.toThrow(/room/);

    await social.removeFriend(youId, mine.myCode);
    expect((await social.friendsFor(meId)).friends).toHaveLength(0);

    // Guests can't use friends; the leaderboard only lists rated players.
    expect((await social.friendsFor({ kind: 'guest', id: 'x', key: 'g:x' } as never)).enabled).toBe(false);
    const board = await social.leaderboard(meId);
    expect(board.enabled).toBe(true);
    expect(board.entries.every((e) => e.ratedGames > 0)).toBe(true);
    expect(board.entries.map((e) => e.place)).toEqual(board.entries.map((e) => 1 + board.entries.filter((other) => other.rating > e.rating).length));
  });

  it('only keeps cosmetics a player has unlocked', async () => {
    const { updateProfile } = await import('../profileApi');
    const { cosmeticStateFor, seatCosmetics } = await import('../cosmetics');
    const u = await db.user.create({ data: { name: 'Fancy' } });
    const id = { kind: 'user' as const, id: u.id, key: `u:${u.id}` } as never;

    // A new player can't claim a gold laurel or a rating title, but free ones stick.
    await updateProfile(id, { cosmetics: { frame: 'gold', title: 'legend' } });
    expect((await cosmeticStateFor(id)).chosen).toEqual({ frame: 'none', title: null });
    await updateProfile(id, { cosmetics: { frame: 'wood', title: 'trader' } });
    expect((await cosmeticStateFor(id)).chosen).toEqual({ frame: 'wood', title: 'trader' });

    // Winning unlocks more; the saved choice beats whatever a browser sends.
    await db.profile.update({ where: { userId: u.id }, data: { gamesPlayed: 20, gamesWon: 16 } });
    await updateProfile(id, { cosmetics: { frame: 'gold', title: 'duke' } });
    const state = await cosmeticStateFor(id);
    expect(state.chosen).toEqual({ frame: 'gold', title: 'duke' });
    expect(seatCosmetics({ frame: 'ruby', title: null }, state)).toEqual({ frame: 'gold', title: 'duke' });
    expect(seatCosmetics({ frame: 'ruby', title: 'baron' }, { ...state, chosen: null })).toEqual({ frame: 'none', title: 'baron' });
  });
});
