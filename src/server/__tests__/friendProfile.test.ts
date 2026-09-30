import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerIdentity } from '../identity';

const mocks = vi.hoisted(() => ({
  profile: { findFirst: vi.fn() },
  player: { findMany: vi.fn(), count: vi.fn() },
  playerRating: { findMany: vi.fn() },
  presence: vi.fn(),
  enabled: true,
}));
vi.mock('../db', () => ({ getDb: () => mocks.enabled ? mocks : null }));
vi.mock('../presence', () => ({ presenceOf: mocks.presence, sendInvite: vi.fn() }));
import { friendProfileFor } from '../social';

const identity: ServerIdentity = { id: 'viewer', key: 'u:viewer', kind: 'user', displayName: 'Viewer', avatarUrl: null };
const row = {
  userId: 'private-id', displayName: 'Morgan', color: 'blue', knight: null, cosmetics: null,
  avatarUrl: null, preferences: {}, user: { image: 'https://example.test/avatar.png' },
  rating: 1120, ratedGames: 12, gamesPlayed: 20, gamesWon: 8, friendCode: 'ABCDEFGH',
};

describe('friend profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enabled = true;
    mocks.profile.findFirst.mockResolvedValue(row);
    mocks.player.findMany.mockResolvedValue([]);
    mocks.player.count.mockResolvedValue(0);
    mocks.playerRating.findMany.mockResolvedValue([]);
    mocks.presence.mockReturnValue({ status: 'offline', roomCode: null });
  });

  it('requires an accepted friendship in either direction before reading results or presence', async () => {
    mocks.profile.findFirst.mockResolvedValue(null);
    expect(await friendProfileFor(identity, 'abcd-efgh')).toBeNull();
    expect(mocks.profile.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: {
      friendCode: 'ABCDEFGH', user: { OR: [
        { friendsAsked: { some: { addresseeId: 'viewer', status: 'accepted' } } },
        { friendsAnswered: { some: { requesterId: 'viewer', status: 'accepted' } } },
      ] },
    } }));
    expect(mocks.player.findMany).not.toHaveBeenCalled();
    expect(mocks.presence).not.toHaveBeenCalled();
  });

  it('rejects guests, invalid codes and disabled persistence without querying profiles', async () => {
    expect(await friendProfileFor({ ...identity, kind: 'guest' }, 'ABCDEFGH')).toBeNull();
    expect(await friendProfileFor(identity, '../private')).toBeNull();
    mocks.enabled = false;
    expect(await friendProfileFor(identity, 'ABCDEFGH')).toBeNull();
    expect(mocks.profile.findFirst).not.toHaveBeenCalled();
  });

  it('returns only the friend-facing fields and recent finished results', async () => {
    const date = new Date('2026-09-30T10:00:00Z');
    mocks.player.findMany.mockResolvedValue([{ won: true, rank: 1, finalVp: 10, ratingDelta: 14,
      game: { mode: 'classic', startedAt: date, endedAt: null } }]);
    const result = await friendProfileFor(identity, 'ABCDEFGH');
    expect(result).toMatchObject({ friend: { name: 'Morgan', rating: 1120 }, stats: { gamesPlayed: 20, gamesWon: 8 },
      recentGames: [{ mode: 'classic', startedAt: date.toISOString(), endedAt: null, won: true, finalVp: 10, ratingDelta: 14 }] });
    expect(Object.keys(result!).sort()).toEqual(['friend', 'headToHead', 'ratings', 'recentGames', 'stats']);
    expect(Object.keys(result!.friend).sort()).toEqual(['avatarUrl', 'code', 'color', 'cosmetics', 'knight', 'name', 'ratedGames', 'rating', 'roomCode', 'status']);
    expect(JSON.stringify(result)).not.toContain('private-id');
    expect(mocks.player.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'private-id', game: { status: 'finished' } }, take: 10,
    }));
  });

  it('respects the provider avatar opt-out', async () => {
    mocks.profile.findFirst.mockResolvedValue({ ...row, preferences: { useProviderAvatar: false } });
    expect((await friendProfileFor(identity, 'ABCDEFGH'))?.friend.avatarUrl).toBeNull();
  });
});
