import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { DEFAULT_ROOM_SETTINGS } from '@/shared/protocol';
import { deletePersonalData } from '../deletePersonalData';
import { acquirePrivacyLock } from '../privacyMaintenance';

let db: PrismaClient;
vi.mock('../db', () => ({ getDb: () => db }));
const url = process.env.TEST_DATABASE_URL;
const localTestDb = url ? new URL(url) : null;
if (localTestDb && (!['127.0.0.1', 'localhost'].includes(localTestDb.hostname) || localTestDb.pathname !== '/privacy_test')) {
  throw new Error('Privacy tests require the disposable local privacy_test database. Run npm run test:privacy.');
}

describe.skipIf(!url)('privacy operations in isolated PostgreSQL', () => {
  beforeAll(() => {
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
    process.env.AUTH_SECRET = 'privacy-tests-only';
  });
  afterAll(async () => { await db?.$disconnect(); });
  beforeEach(async () => {
    await db.room.deleteMany();
    await db.user.deleteMany();
    await db.guestSession.deleteMany();
    await db.faceImage.deleteMany();
    await db.verificationToken.deleteMany();
  });

  async function fixture() {
    const face = 'a'.repeat(64);
    const otherFace = 'b'.repeat(64);
    const orphanFace = 'c'.repeat(64);
    await db.faceImage.createMany({ data: [face, otherFace, orphanFace].map((id) => ({ id, mime: 'image/png', data: new Uint8Array([1, 2, 3]) })) });
    const user = await db.user.create({ data: { name: 'EraseUniqueName', email: 'erase@example.test', profile: { create: {
      displayName: 'EraseUniqueName', knight: { face: null, mighty: { face } },
    } }, accounts: { create: { type: 'oauth', provider: 'test', providerAccountId: 'erase-provider-id' } },
    sessions: { create: { sessionToken: 'erase-session', expires: new Date(Date.now() + 86400_000) } } } });
    const other = await db.user.create({ data: { name: 'KeepName', profile: { create: { displayName: 'KeepName', knight: { face: otherFace } } } } });
    const guest = await db.guestSession.create({ data: { id: randomUUID(), displayName: 'EraseGuestName', migratedToUserId: user.id, expiresAt: new Date(Date.now() + 86400_000) } });
    await db.friendship.create({ data: { requesterId: user.id, addresseeId: other.id, status: 'accepted' } });
    await db.verificationToken.create({ data: { identifier: user.email!, token: 'erase-verification', expires: new Date() } });
    const room = await db.room.create({ data: { code: randomUUID(), status: 'finished', settings: { ...DEFAULT_ROOM_SETTINGS } } });
    const game = await db.game.create({ data: { roomId: room.id, mode: 'classic', status: 'finished', settings: { ...DEFAULT_ROOM_SETTINGS }, turns: 50 } });
    const player = await db.player.create({ data: { id: randomUUID(), gameId: game.id, seat: 0, userId: user.id, guestSessionId: guest.id,
      displayName: 'EraseUniqueName', color: 'red', knightCustomization: { face }, finalVp: 10, rank: 1, won: true } });
    const otherPlayer = await db.player.create({ data: { id: randomUUID(), gameId: game.id, seat: 1, userId: other.id,
      displayName: 'KeepName', color: 'blue', knightCustomization: { face: otherFace }, finalVp: 8, rank: 2 } });
    await db.game.update({ where: { id: game.id }, data: { winnerPlayerId: player.id } });
    await db.gameSnapshot.create({ data: { gameId: game.id, seq: 1, state: { players: [{ name: 'EraseUniqueName' }], legacy: { name: 'EraseGuestName' } } } });
    await db.gameEvent.create({ data: { gameId: game.id, seq: 1, type: 'test', playerId: player.id, payload: { text: 'EraseUniqueName made a move' } } });
    return { user, other, guest, game, player, otherPlayer, face, otherFace, orphanFace };
  }

  it('previews without writes, removes copied personal data, revokes sessions and preserves scores', async () => {
    const f = await fixture();
    const target = { kind: 'user' as const, id: f.user.id };
    const preview = await deletePersonalData(db, target);
    expect(preview.applied).toBe(false);
    expect(preview.counts).toMatchObject({ users: 1, guests: 1, players: 1, sessions: 1, friendships: 1, snapshots: 1, events: 1, unusedPortraitsAcrossDatabase: 2 });
    expect(await db.user.count()).toBe(2);
    expect(await db.gameSnapshot.count()).toBe(1);
    const { resolveIdentity, signGuestId } = await import('../identity');
    expect(await resolveIdentity('authjs.session-token=erase-session')).toMatchObject({ id: f.user.id });
    const result = await deletePersonalData(db, target, { apply: true });
    expect(result.applied).toBe(true);
    expect(await resolveIdentity('authjs.session-token=erase-session')).toBeNull();
    expect(await resolveIdentity(`guest_session=${signGuestId(f.guest.id)}`)).toBeNull();
    const retained = await db.player.findUniqueOrThrow({ where: { id: f.player.id } });
    expect(retained).toMatchObject({ userId: null, guestSessionId: null, displayName: 'Deleted player', knightCustomization: { face: null }, finalVp: 10, rank: 1, won: true });
    expect(await db.player.findUnique({ where: { id: f.otherPlayer.id } })).toEqual(f.otherPlayer);
    expect((await db.game.findUniqueOrThrow({ where: { id: f.game.id } })).winnerPlayerId).toBe(f.player.id);
    const { historyFor } = await import('../profileApi');
    const history = await historyFor({ kind: 'user', id: f.other.id, key: `u:${f.other.id}`, displayName: 'KeepName', avatarUrl: null });
    expect(history[0]).toMatchObject({ finalVp: 8, rank: 2, players: [
      { name: 'Deleted player', vp: 10, won: true }, { name: 'KeepName', vp: 8, isYou: true },
    ] });
    expect(await db.faceImage.findMany({ select: { id: true } })).toEqual([{ id: f.otherFace }]);
    expect(await db.friendship.count()).toBe(0);
    expect(await db.account.count()).toBe(0);
    expect(await db.verificationToken.count()).toBe(0);
    expect(await db.gameSnapshot.count()).toBe(0);
    expect(await db.gameEvent.count()).toBe(0);
    const all = JSON.stringify([await db.user.findMany(), await db.profile.findMany(), await db.guestSession.findMany(), await db.player.findMany()]);
    for (const marker of [f.user.id, f.guest.id, 'EraseUniqueName', 'EraseGuestName', f.face]) expect(all).not.toContain(marker);
    expect(await deletePersonalData(db, target, { apply: true })).toMatchObject({ applied: false, found: false });
  });

  it('removes a standalone guest and prevents reuse of its old signed cookie', async () => {
    const guest = await db.guestSession.create({ data: { id: randomUUID(), expiresAt: new Date(Date.now() + 86400_000) } });
    const { resolveIdentity, signGuestId } = await import('../identity');
    const cookie = `guest_session=${signGuestId(guest.id)}`;
    expect(await resolveIdentity(cookie)).toMatchObject({ id: guest.id });
    expect((await deletePersonalData(db, { kind: 'guest', id: guest.id }, { apply: true })).applied).toBe(true);
    expect(await resolveIdentity(cookie)).toBeNull();
  });

  it('does not change an unrelated game or its replay data', async () => {
    const f = await fixture();
    const room = await db.room.create({ data: { code: randomUUID(), status: 'playing', settings: { ...DEFAULT_ROOM_SETTINGS } } });
    const unrelated = await db.game.create({ data: { roomId: room.id, mode: 'classic', status: 'playing', settings: { ...DEFAULT_ROOM_SETTINGS } } });
    const snapshot = await db.gameSnapshot.create({ data: { gameId: unrelated.id, seq: 1, state: { marker: 'Keep this replay' } } });
    const event = await db.gameEvent.create({ data: { gameId: unrelated.id, seq: 1, type: 'test', payload: { marker: 'Keep this event' } } });
    await deletePersonalData(db, { kind: 'user', id: f.user.id }, { apply: true });
    expect(await db.game.findUnique({ where: { id: unrelated.id } })).toEqual(unrelated);
    expect(await db.gameSnapshot.findUnique({ where: { id: snapshot.id } })).toEqual(snapshot);
    expect(await db.gameEvent.findUnique({ where: { id: event.id } })).toEqual(event);
  });

  it('blocks migrated-guest requests, unfinished games and shared portraits without changes', async () => {
    const f = await fixture();
    expect((await deletePersonalData(db, { kind: 'guest', id: f.guest.id }, { apply: true })).blockers.join()).toContain('migrated');
    await db.game.update({ where: { id: f.game.id }, data: { status: 'playing' } });
    await db.profile.update({ where: { userId: f.other.id }, data: { knight: { face: f.face } } });
    const report = await deletePersonalData(db, { kind: 'user', id: f.user.id }, { apply: true });
    expect(report).toMatchObject({ applied: false, counts: { unfinishedGames: 1, sharedPortraits: 1 } });
    expect(report.blockers).toHaveLength(2);
    expect(await db.user.count()).toBe(2);
    expect(await db.gameSnapshot.count()).toBe(1);
  });

  it('refuses maintenance while any server holds the shared lock and blocks server startup during maintenance', async () => {
    const f = await fixture();
    const server = await acquirePrivacyLock(url!, 'server', () => {});
    const secondServer = await acquirePrivacyLock(url!, 'server', () => {});
    try {
      await expect(deletePersonalData(db, { kind: 'user', id: f.user.id }, { apply: true })).rejects.toThrow('game server');
    } finally {
      await server.release();
      await secondServer.release();
    }
    const maintenance = await acquirePrivacyLock(url!, 'deletion', () => {});
    try {
      await expect(acquirePrivacyLock(url!, 'server', () => {})).rejects.toThrow('maintenance');
    } finally { await maintenance.release(); }
  });

  it('rolls back all deletions if a later write fails', async () => {
    const f = await fixture();
    await db.$executeRawUnsafe("CREATE FUNCTION privacy_test_fail() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RAISE EXCEPTION ''test failure''; END'");
    await db.$executeRawUnsafe('CREATE TRIGGER privacy_test_fail BEFORE DELETE ON face_images FOR EACH ROW EXECUTE FUNCTION privacy_test_fail()');
    try {
      await expect(deletePersonalData(db, { kind: 'user', id: f.user.id }, { apply: true })).rejects.toThrow();
      expect(await db.user.count()).toBe(2);
      expect(await db.session.count()).toBe(1);
      expect(await db.guestSession.count()).toBe(1);
      expect(await db.gameSnapshot.count()).toBe(1);
      expect((await db.player.findUniqueOrThrow({ where: { id: f.player.id } })).displayName).toBe('EraseUniqueName');
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER privacy_test_fail ON face_images');
      await db.$executeRawUnsafe('DROP FUNCTION privacy_test_fail()');
    }
  });
});
