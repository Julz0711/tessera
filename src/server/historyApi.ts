import type { Prisma } from '@/generated/prisma/client';
import type { GameReport } from '@/engine/report';
import type { Mode, PlayerColor } from '@/engine/types';
import { MAPS } from '@/engine/maps';
import { isPlayerColor } from '@/shared/colors';
import type { GameSummary, HistoryData } from '@/shared/protocol';
import { isRatingPool } from '@/shared/ratings';
import { getDb } from './db';
import type { ServerIdentity } from './identity';
import { UserError } from './room';
import { normalizeFriendCode } from './social';

const PAGE_SIZE = 20;
const owner = (identity: ServerIdentity) => identity.kind === 'user' ? { userId: identity.id } : { guestSessionId: identity.id };
export function readHistoryCursor(input: string | null): { startedAt: Date; id: string } | null {
  if (!input) return null;
  try {
    if (input.length > 400) throw new Error();
    const [date, id] = JSON.parse(Buffer.from(input, 'base64url').toString('utf8')) as unknown[];
    if (typeof date !== 'string' || !Number.isFinite(Date.parse(date)) || typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw new Error();
    return { startedAt: new Date(date), id };
  } catch { throw new UserError('Invalid history cursor'); }
}
export async function pagedHistory(identity: ServerIdentity, params: URLSearchParams): Promise<HistoryData> {
  const db = getDb();
  if (!db) return { games: [], nextCursor: null, summary: { games: 0, wins: 0, averageVp: null, averagePlace: null } };
  const game: Prisma.GameWhereInput = { status: 'finished' };
  const where: Prisma.PlayerWhereInput = { ...owner(identity), game };
  const mode = params.get('mode');
  if (mode && mode !== 'all') { if (!isRatingPool(mode)) throw new UserError('Invalid mode'); game.mode = mode; }
  const map = params.get('map');
  if (map && map !== 'all') { if (!Object.hasOwn(MAPS, map)) throw new UserError('Invalid map'); game.settings = { path: ['map'], equals: map }; }
  const result = params.get('result');
  if (result === 'win' || result === 'other') where.won = result === 'win';
  const rating = params.get('rating');
  if (rating === 'rated') where.ratingDelta = { not: null };
  if (rating === 'unrated') where.ratingDelta = null;
  const dates: Prisma.DateTimeFilter = {};
  for (const key of ['from', 'to'] as const) {
    const value = params.get(key); if (!value) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new UserError('Invalid date');
    if (key === 'from') dates.gte = new Date(value); else dates.lt = new Date(Date.parse(value) + 86400_000);
  }
  if (dates.gte && dates.lt && new Date(dates.gte).getTime() >= new Date(dates.lt).getTime()) throw new UserError('The end date must follow the start date');
  if (Object.keys(dates).length) game.startedAt = dates;
  const friendCode = params.get('friend');
  if (friendCode) {
    const code = normalizeFriendCode(friendCode);
    const friend = identity.kind === 'user' && code ? await db.profile.findFirst({ where: { friendCode: code, user: { OR: [
      { friendsAsked: { some: { addresseeId: identity.id, status: 'accepted' } } }, { friendsAnswered: { some: { requesterId: identity.id, status: 'accepted' } } },
    ] } }, select: { userId: true } }) : null;
    if (!friend) throw new UserError('Choose an accepted friend');
    game.players = { some: { userId: friend.userId } };
  }
  const cursor = readHistoryCursor(params.get('cursor'));
  const cursorFilter: Prisma.PlayerWhereInput = cursor ? { game: { OR: [
    { startedAt: { lt: cursor.startedAt } }, { startedAt: cursor.startedAt, id: { lt: cursor.id } },
  ] } } : {};
  const [rows, aggregate, wins] = await Promise.all([
    db.player.findMany({ where: { AND: [where, cursorFilter] }, orderBy: [{ game: { startedAt: 'desc' } }, { gameId: 'desc' }], take: PAGE_SIZE + 1,
      include: { game: { select: { mode: true, settings: true, startedAt: true, endedAt: true, turns: true, hasReport: true, players: { orderBy: { seat: 'asc' } } } } } }),
    db.player.aggregate({ where, _count: true, _avg: { finalVp: true, rank: true } }),
    db.player.count({ where: { AND: [where, { won: true }] } }),
  ]);
  const page = rows.slice(0, PAGE_SIZE);
  const games: GameSummary[] = page.map((p) => ({ gameId: p.gameId, mode: p.game.mode as Mode,
    map: (p.game.settings as { map?: string }).map ?? 'standard', turns: p.game.turns, hasReport: p.game.hasReport,
    startedAt: p.game.startedAt.toISOString(), endedAt: p.game.endedAt?.toISOString() ?? null, status: 'finished', won: p.won, rank: p.rank,
    finalVp: p.finalVp, ratingDelta: p.ratingDelta, ratingPool: p.ratingPool, ratingBefore: p.ratingBefore, ratingAfter: p.ratingAfter,
    players: p.game.players.map((other) => ({ name: other.displayName, color: (isPlayerColor(other.color) ? other.color : 'red') as PlayerColor,
      vp: other.finalVp, won: other.won, isBot: other.isBot, isYou: other.id === p.id })),
  }));
  const last = page.at(-1);
  return { games, nextCursor: rows.length > PAGE_SIZE && last ? Buffer.from(JSON.stringify([last.game.startedAt.toISOString(), last.gameId])).toString('base64url') : null,
    summary: { games: aggregate._count, wins, averageVp: aggregate._avg.finalVp, averagePlace: aggregate._avg.rank } };
}

export async function reportFor(identity: ServerIdentity, gameId: string): Promise<GameReport | null> {
  const db = getDb();
  if (!db || !/^[a-zA-Z0-9-]{1,100}$/.test(gameId)) return null;
  const game = await db.game.findFirst({ where: { id: gameId, status: 'finished', players: { some: owner(identity) } },
    select: { report: true, startedAt: true, endedAt: true } });
  if (!game?.report) return null;
  return { ...(game.report as unknown as GameReport), startedAt: game.startedAt.toISOString(), endedAt: game.endedAt?.toISOString() };
}
