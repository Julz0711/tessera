import { randomInt } from 'node:crypto';
import { isPlayerColor } from '@/shared/colors';
import { clampCosmetics } from '@/shared/cosmetics';
import { sanitizeKnight } from '@/shared/knight';
import type { FriendInfo, FriendProfileData, FriendsData, LeaderboardData, LeaderboardEntry, PlayerCard } from '@/shared/protocol';
import type { Mode } from '@/engine/types';
import { getDb } from './db';
import type { ServerIdentity } from './identity';
import { presenceOf, sendInvite } from './presence';
import { UserError } from './room';
import { modeRatingsFor } from './modeRatings';
import { type RatingPool, isRatingPool } from '@/shared/ratings';

/**
 * Friends and the leaderboard. Both need an account (and a database): a friend is a person, not a
 * browser. Players are only ever identified to each other by their public friend code.
 */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LEADERBOARD_SIZE = 50;

export function normalizeFriendCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-HJ-NP-Z2-9]{8}$/.test(code) ? code : null;
}

function newCode(): string {
  return Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}

type Db = NonNullable<ReturnType<typeof getDb>>;

/** Makes sure a user has a profile and a friend code; returns the code. */
async function ensureCode(db: Db, userId: string): Promise<string> {
  const profile = await db.profile.findUnique({ where: { userId }, select: { friendCode: true } });
  if (profile?.friendCode) return profile.friendCode;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      await db.profile.upsert({
        where: { userId },
        create: { userId, displayName: 'Player', friendCode: code },
        update: { friendCode: code },
      });
      return code;
    } catch {
      // extremely unlikely collision: try another code
    }
  }
  throw new Error('Could not assign a friend code');
}

const cardSelect = {
  userId: true,
  displayName: true,
  color: true,
  knight: true,
  cosmetics: true,
  avatarUrl: true,
  preferences: true,
  rating: true,
  ratedGames: true,
  gamesWon: true,
  gamesPlayed: true,
  friendCode: true,
  user: { select: { image: true, ratings: { select: { peakRating: true, ratedGames: true } } } },
} as const;

type CardRow = {
  userId: string;
  displayName: string;
  color: string | null;
  knight: unknown;
  cosmetics: unknown;
  avatarUrl: string | null;
  preferences: unknown;
  rating: number;
  ratedGames: number;
  gamesWon: number;
  gamesPlayed: number;
  friendCode: string | null;
  user: { image: string | null; ratings?: { peakRating: number; ratedGames: number }[] };
};

async function cardsFor(db: Db, userIds: string[]): Promise<Map<string, PlayerCard>> {
  if (!userIds.length) return new Map();
  for (const id of userIds) await ensureCode(db, id);
  const rows = (await db.profile.findMany({ where: { userId: { in: userIds } }, select: cardSelect })) as CardRow[];
  return new Map(rows.map((r) => [r.userId, toCard(r)]));
}

function toCard(r: CardRow): PlayerCard {
  const preferences = r.preferences as { useProviderAvatar?: boolean } | null;
  return {
    code: r.friendCode ?? '',
    name: r.displayName,
    color: isPlayerColor(r.color) ? r.color : 'red',
    knight: sanitizeKnight(r.knight),
    avatarUrl: preferences?.useProviderAvatar === false ? null : (r.avatarUrl ?? r.user.image ?? null),
    // Stored cosmetics were checked when saved; re-clamp in case the rules changed since.
    cosmetics: clampCosmetics(r.cosmetics, { gamesPlayed: r.gamesPlayed, gamesWon: r.gamesWon, rating: Math.max(r.ratedGames > 0 ? r.rating : 0, ...(r.user.ratings ?? []).filter((x) => x.ratedGames > 0).map((x) => x.peakRating)) || null }),
    rating: r.rating,
    ratedGames: r.ratedGames,
  };
}

function requireUser(identity: ServerIdentity | null): string {
  if (!identity || identity.kind !== 'user') throw new UserError('Sign in to use friends');
  return identity.id;
}

async function userByCode(db: Db, code: unknown): Promise<string> {
  const c = normalizeFriendCode(code);
  if (!c) throw new UserError('That friend code looks wrong');
  const p = await db.profile.findUnique({ where: { friendCode: c }, select: { userId: true } });
  if (!p) throw new UserError('No player with that friend code');
  return p.userId;
}

export async function friendsFor(identity: ServerIdentity | null): Promise<FriendsData> {
  const db = getDb();
  const empty: FriendsData = { enabled: false, myCode: null, friends: [], incoming: [], outgoing: [], recent: [] };
  if (!db || !identity || identity.kind !== 'user') return empty;
  const me = identity.id;
  const myCode = await ensureCode(db, me);
  const links = await db.friendship.findMany({ where: { OR: [{ requesterId: me }, { addresseeId: me }] } });
  const other = (l: (typeof links)[number]) => (l.requesterId === me ? l.addresseeId : l.requesterId);

  // Signed-in people from my recent games who aren't linked to me yet.
  const recentRows = await db.player.findMany({
    where: { userId: me, game: { status: 'finished' } },
    orderBy: { game: { startedAt: 'desc' } },
    take: 20,
    select: { game: { select: { players: { select: { userId: true } } } } },
  });
  const linked = new Set(links.map(other));
  const recentIds = [...new Set(recentRows.flatMap((r) => r.game.players.map((p) => p.userId)))].filter(
    (id): id is string => !!id && id !== me && !linked.has(id),
  );

  const cards = await cardsFor(db, [...linked, ...recentIds.slice(0, 12)]);
  const card = (id: string) => cards.get(id);
  const friends: FriendInfo[] = links
    .filter((l) => l.status === 'accepted')
    .map((l) => {
      const c = card(other(l));
      if (!c) return null;
      const presence = presenceOf(`u:${other(l)}`);
      return { ...c, status: presence.status, roomCode: presence.roomCode };
    })
    .filter((f): f is FriendInfo => !!f)
    .sort((a, b) => statusOrder(a.status) - statusOrder(b.status) || a.name.localeCompare(b.name));
  return {
    enabled: true,
    myCode,
    friends,
    incoming: links.filter((l) => l.status === 'pending' && l.addresseeId === me).map((l) => card(l.requesterId)).filter((c): c is PlayerCard => !!c),
    outgoing: links.filter((l) => l.status === 'pending' && l.requesterId === me).map((l) => card(l.addresseeId)).filter((c): c is PlayerCard => !!c),
    recent: recentIds.map(card).filter((c): c is PlayerCard => !!c),
  };
}

const statusOrder = (s: FriendInfo['status']) => ({ playing: 1, lobby: 0, online: 2, offline: 3 })[s];

/** Only accepted friends can read this profile, including its recent results and presence. */
export async function friendProfileFor(identity: ServerIdentity, input: unknown): Promise<FriendProfileData | null> {
  const db = getDb();
  const code = normalizeFriendCode(input);
  if (!db || identity.kind !== 'user' || !code) return null;
  const row = await db.profile.findFirst({
    where: {
      friendCode: code,
      user: {
        OR: [
          { friendsAsked: { some: { addresseeId: identity.id, status: 'accepted' } } },
          { friendsAnswered: { some: { requesterId: identity.id, status: 'accepted' } } },
        ],
      },
    },
    select: cardSelect,
  });
  if (!row) return null;
  const games = await db.player.findMany({
    where: { userId: row.userId, game: { status: 'finished' } },
    orderBy: [{ game: { startedAt: 'desc' } }, { gameId: 'desc' }],
    take: 10,
    select: {
      won: true, rank: true, finalVp: true, ratingDelta: true, ratingPool: true,
      game: { select: { mode: true, settings: true, startedAt: true, endedAt: true } },
    },
  });
  const presence = presenceOf(`u:${row.userId}`);
  const shared = { status: 'finished', players: { some: { userId: identity.id } } };
  const [ratings, gamesTogether, yourWins, theirWins] = await Promise.all([
    modeRatingsFor(row.userId),
    db.player.count({ where: { userId: row.userId, game: shared } }),
    db.player.count({ where: { userId: identity.id, won: true, game: { status: 'finished', players: { some: { userId: row.userId } } } } }),
    db.player.count({ where: { userId: row.userId, won: true, game: shared } }),
  ]);
  return {
    ratings, headToHead: { games: gamesTogether, yourWins, theirWins },
    friend: { ...toCard(row), status: presence.status, roomCode: presence.roomCode },
    stats: { gamesPlayed: row.gamesPlayed, gamesWon: row.gamesWon },
    recentGames: games.map((p) => ({
      mode: p.game.mode as Mode, map: (p.game.settings as { map?: string } | null)?.map,
      startedAt: p.game.startedAt.toISOString(),
      endedAt: p.game.endedAt?.toISOString() ?? null,
      won: p.won, rank: p.rank, finalVp: p.finalVp, ratingDelta: p.ratingDelta, ratingPool: p.ratingPool,
    })),
  };
}

/** Sends a friend request — or accepts theirs, if they already asked. */
export async function requestFriend(identity: ServerIdentity | null, code: unknown): Promise<void> {
  const db = getDb();
  if (!db) throw new UserError('Friends need a database');
  const me = requireUser(identity);
  const them = await userByCode(db, code);
  if (them === me) throw new UserError("That's your own code");
  const theirs = await db.friendship.findUnique({ where: { requesterId_addresseeId: { requesterId: them, addresseeId: me } } });
  if (theirs) {
    if (theirs.status !== 'accepted') await db.friendship.update({ where: { id: theirs.id }, data: { status: 'accepted' } });
    return;
  }
  const mine = await db.friendship.findUnique({ where: { requesterId_addresseeId: { requesterId: me, addresseeId: them } } });
  if (mine) return;
  const pending = await db.friendship.count({ where: { requesterId: me, status: 'pending' } });
  if (pending >= 50) throw new UserError('Too many open friend requests');
  await db.friendship.create({ data: { requesterId: me, addresseeId: them, status: 'pending' } });
}

export async function acceptFriend(identity: ServerIdentity | null, code: unknown): Promise<void> {
  const db = getDb();
  if (!db) throw new UserError('Friends need a database');
  const me = requireUser(identity);
  const them = await userByCode(db, code);
  const req = await db.friendship.findUnique({ where: { requesterId_addresseeId: { requesterId: them, addresseeId: me } } });
  if (!req) throw new UserError('No friend request from that player');
  await db.friendship.update({ where: { id: req.id }, data: { status: 'accepted' } });
}

/** Declines a request, cancels your own, or ends a friendship. */
export async function removeFriend(identity: ServerIdentity | null, code: unknown): Promise<void> {
  const db = getDb();
  if (!db) throw new UserError('Friends need a database');
  const me = requireUser(identity);
  const them = await userByCode(db, code);
  await db.friendship.deleteMany({
    where: {
      OR: [
        { requesterId: me, addresseeId: them },
        { requesterId: them, addresseeId: me },
      ],
    },
  });
}

/** Invites a friend to the room you're in right now. */
export async function inviteFriend(identity: ServerIdentity | null, code: unknown): Promise<void> {
  const db = getDb();
  if (!db) throw new UserError('Friends need a database');
  const me = requireUser(identity);
  const them = await userByCode(db, code);
  const link = await db.friendship.findFirst({
    where: {
      status: 'accepted',
      OR: [
        { requesterId: me, addresseeId: them },
        { requesterId: them, addresseeId: me },
      ],
    },
  });
  if (!link) throw new UserError('You can only invite friends');
  const where = presenceOf(`u:${me}`);
  if (!where.roomCode) throw new UserError('Open a room first, then invite');
  const profile = await db.profile.findUnique({ where: { userId: me }, select: { displayName: true } });
  if (!sendInvite(`u:${them}`, { from: profile?.displayName ?? 'A friend', roomCode: where.roomCode })) {
    throw new UserError("They're not online right now");
  }
}

export async function leaderboard(identity: ServerIdentity | null, params = new URLSearchParams()): Promise<LeaderboardData> {
  const pool = isRatingPool(params.get('mode')) ? params.get('mode') as RatingPool : 'classic';
  const scope: 'friends' | 'world' = params.get('scope') === 'friends' ? 'friends' : 'world';
  const pageInput = Number(params.get('page') ?? 1);
  let page = Number.isSafeInteger(pageInput) ? Math.min(10000, Math.max(1, pageInput)) : 1;
  const db = getDb();
  const me = identity?.kind === 'user' ? identity.id : null;
  const empty = { enabled: !!db, entries: [], you: null, pool, scope, page: 1, pages: 1, total: 0 };
  if (!db) return empty;
  if (scope === 'friends' && !me) return { ...empty, signInRequired: true };
  const links = me ? await db.friendship.findMany({ where: { status: 'accepted', OR: [{ requesterId: me }, { addresseeId: me }] } }) : [];
  const friendIds = new Set(links.map((l) => l.requesterId === me ? l.addresseeId : l.requesterId));
  const base = { poolKey: pool, ratedGames: { gt: 0 }, ...(scope === 'friends' ? { userId: { in: [me!, ...friendIds] } } : {}) };
  const search = (params.get('q') ?? '').trim().slice(0, 60);
  const where = { ...base, ...(search ? { user: { profile: { OR: [
    { displayName: { contains: search, mode: 'insensitive' as const } }, { friendCode: { equals: normalizeFriendCode(search) ?? search } },
  ] } } } : {}) };
  const mine = me ? await db.playerRating.findUnique({ where: { userId_poolKey: { userId: me, poolKey: pool } } }) : null;
  const total = await db.playerRating.count({ where });
  const pages = Math.max(1, Math.ceil(total / LEADERBOARD_SIZE));
  if (params.get('around') === 'me' && mine?.ratedGames && !search) {
    const above = await db.playerRating.count({ where: { ...base, OR: [{ rating: { gt: mine.rating } }, { rating: mine.rating, userId: { lt: me! } }] } });
    page = Math.floor(above / LEADERBOARD_SIZE) + 1;
  }
  page = Math.min(page, pages);
  const rows = await db.playerRating.findMany({ where, orderBy: [{ rating: 'desc' }, { userId: 'asc' }], skip: (page - 1) * LEADERBOARD_SIZE, take: LEADERBOARD_SIZE });
  const ids = [...new Set([...rows.map((r) => r.userId), ...(mine?.ratedGames ? [me!] : [])])];
  const cards = await cardsFor(db, ids);
  const ranks = new Map<number, number>();
  await Promise.all([...new Set([...rows.map((r) => r.rating), ...(mine?.ratedGames ? [mine.rating] : [])])].map(async (rating) => {
    ranks.set(rating, 1 + await db.playerRating.count({ where: { ...base, rating: { gt: rating } } }));
  }));
  const entry = (r: typeof rows[number]): LeaderboardEntry | null => {
    const card = cards.get(r.userId); if (!card) return null;
    return { ...card, rating: r.rating, ratedGames: r.ratedGames, gamesWon: r.ratedWins, place: ranks.get(r.rating)!, isYou: r.userId === me, isFriend: friendIds.has(r.userId) };
  };
  return { ...empty, page, pages, total, entries: rows.map(entry).filter((e): e is LeaderboardEntry => !!e), you: mine?.ratedGames ? entry(mine) : null };
}
