import { randomInt } from 'node:crypto';
import { isPlayerColor } from '@/shared/colors';
import { sanitizeKnight } from '@/shared/knight';
import type { FriendInfo, FriendsData, LeaderboardData, LeaderboardEntry, PlayerCard } from '@/shared/protocol';
import { getDb } from './db';
import type { ServerIdentity } from './identity';
import { presenceOf, sendInvite } from './presence';
import { UserError } from './room';

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
  avatarUrl: true,
  rating: true,
  ratedGames: true,
  gamesWon: true,
  friendCode: true,
  user: { select: { image: true } },
} as const;

type CardRow = {
  userId: string;
  displayName: string;
  color: string | null;
  knight: unknown;
  avatarUrl: string | null;
  rating: number;
  ratedGames: number;
  gamesWon: number;
  friendCode: string | null;
  user: { image: string | null };
};

async function cardsFor(db: Db, userIds: string[]): Promise<Map<string, PlayerCard>> {
  if (!userIds.length) return new Map();
  for (const id of userIds) await ensureCode(db, id);
  const rows = (await db.profile.findMany({ where: { userId: { in: userIds } }, select: cardSelect })) as CardRow[];
  return new Map(rows.map((r) => [r.userId, toCard(r)]));
}

function toCard(r: CardRow): PlayerCard {
  return {
    code: r.friendCode ?? '',
    name: r.displayName,
    color: isPlayerColor(r.color) ? r.color : 'red',
    knight: sanitizeKnight(r.knight),
    avatarUrl: r.avatarUrl ?? r.user.image ?? null,
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

export async function leaderboard(identity: ServerIdentity | null): Promise<LeaderboardData> {
  const db = getDb();
  if (!db) return { enabled: false, entries: [], you: null };
  const rows = (await db.profile.findMany({
    where: { ratedGames: { gt: 0 } },
    orderBy: [{ rating: 'desc' }, { ratedGames: 'desc' }],
    take: LEADERBOARD_SIZE,
    select: cardSelect,
  })) as CardRow[];
  const me = identity?.kind === 'user' ? identity.id : null;
  for (const r of rows) if (!r.friendCode) r.friendCode = await ensureCode(db, r.userId);
  const entries: LeaderboardEntry[] = rows.map((r, i) => ({ ...toCard(r), place: i + 1, gamesWon: r.gamesWon, isYou: r.userId === me }));
  let you: LeaderboardEntry | null = null;
  if (me && !entries.some((e) => e.isYou)) {
    const mine = (await db.profile.findUnique({ where: { userId: me }, select: cardSelect })) as CardRow | null;
    if (mine && mine.ratedGames > 0) {
      const above = await db.profile.count({ where: { ratedGames: { gt: 0 }, rating: { gt: mine.rating } } });
      if (!mine.friendCode) mine.friendCode = await ensureCode(db, me);
      you = { ...toCard(mine), place: above + 1, gamesWon: mine.gamesWon, isYou: true };
    }
  }
  return { enabled: true, entries, you };
}

