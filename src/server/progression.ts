import { Prisma } from '@/generated/prisma/client';
import type { GameReport } from '@/engine/report';
import {
  applyGame,
  clampLoadout,
  DEFAULT_LOADOUT,
  EMPTY_PROGRESS,
  FEATS,
  gameFacts,
  ITEMS,
  isUnlocked,
  levelFor,
  readProgress,
  START_STATE,
  unlockState,
  type FactsSeat,
  type GameFacts,
  type Loadout,
  type ProgressRecord,
  type UnlockState,
} from '@/shared/progression';
import type { ProgressData, SeatCrew } from '@/shared/protocol';
import { getDb, logDbError } from './db';
import type { ServerIdentity } from './identity';

/**
 * Progression on the server: XP and feat counters live on the profile (or guest session) and are
 * moved once per finished game, inside `finalizeGame`'s transaction. Game history is the source of
 * truth: a missing or outdated record (`progress` null) is rebuilt from it, which is also how
 * existing players get their XP, how a guest's games join an account, and how deleted games drop out.
 */

type Tx = Prisma.TransactionClient;
export type Owner = { userId: string } | { guestSessionId: string };

export const ownerOf = (identity: ServerIdentity): Owner => (identity.kind === 'user' ? { userId: identity.id } : { guestSessionId: identity.id });

/** Same keys as `lockIdentities` in finalizeGame.ts, so a rebuild never interleaves with a game being scored. */
async function lockOwner(tx: Tx, owner: Owner): Promise<void> {
  const key = 'userId' in owner ? `user:${owner.userId}` : `guest:${owner.guestSessionId}`;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`rating:${key}`}, 0))::text`;
}

const ADMIN_EDITED = 'Edited by an admin';

/** Every finished game of an owner, as facts, oldest first. */
async function historyFacts(tx: Tx, owner: Owner): Promise<{ playerId: string; facts: GameFacts }[]> {
  const rows = await tx.player.findMany({
    where: { ...owner, game: { status: 'finished', hasReport: true } },
    orderBy: [{ game: { endedAt: 'asc' } }, { game: { startedAt: 'asc' } }],
    select: {
      id: true,
      seat: true,
      unratedReason: true,
      game: { select: { id: true, endedAt: true, report: true, players: { select: { seat: true, isBot: true, userId: true, guestSessionId: true } } } },
    },
  });
  return rows.flatMap((r) => {
    const report = r.game.report as unknown as GameReport | null;
    if (!report?.players) return [];
    const facts = gameFacts(report, r.seat, seatsOf(r.game.players), {
      gameId: r.game.id,
      endedAt: r.game.endedAt?.toISOString() ?? null,
      adminEdited: r.unratedReason === ADMIN_EDITED,
    });
    return [{ playerId: r.id, facts }];
  });
}

const seatsOf = (players: { seat: number; isBot: boolean; userId: string | null; guestSessionId: string | null }[]): FactsSeat[] =>
  players.map((p) => ({ seat: p.seat, isBot: p.isBot, owned: !!(p.userId || p.guestSessionId) }));

async function writeProgress(tx: Tx, owner: Owner, xp: number, record: ProgressRecord): Promise<void> {
  const data = { xp, progress: record as unknown as Prisma.InputJsonValue };
  if ('userId' in owner) await tx.profile.updateMany({ where: { userId: owner.userId }, data });
  else await tx.guestSession.updateMany({ where: { id: owner.guestSessionId }, data });
}

/** Rebuilds an owner's XP and feats from their whole game history (and each game's `xpGained`). */
export async function rebuildProgress(tx: Tx, owner: Owner): Promise<{ xp: number; record: ProgressRecord }> {
  let record = EMPTY_PROGRESS;
  let xp = 0;
  for (const { playerId, facts } of await historyFacts(tx, owner)) {
    const award = applyGame(record, xp, facts);
    ({ record, xp } = award);
    await tx.player.update({ where: { id: playerId }, data: { xpGained: award.gameXp + award.featXp } });
  }
  await writeProgress(tx, owner, xp, record);
  return { xp, record };
}

/**
 * Scores one finished game for every person in it. Runs inside finalizeGame's transaction after
 * the report is stored (identities already locked). A player whose record still has to be built
 * gets a full rebuild instead, which already includes this game.
 */
export async function awardFinishedGame(
  tx: Tx,
  game: { id: string; endedAt: Date; adminEdited: boolean },
  report: GameReport,
  players: { id: string; seat: number; isBot: boolean; userId: string | null; guestSessionId: string | null }[],
): Promise<void> {
  const seats = seatsOf(players);
  for (const p of players) {
    const owner: Owner | null = p.userId ? { userId: p.userId } : p.guestSessionId ? { guestSessionId: p.guestSessionId } : null;
    if (!owner) continue;
    const stored = 'userId' in owner
      ? await tx.profile.findUnique({ where: { userId: owner.userId }, select: { xp: true, progress: true } })
      : await tx.guestSession.findUnique({ where: { id: owner.guestSessionId }, select: { xp: true, progress: true } });
    if (!stored) continue;
    const record = readProgress(stored.progress);
    if (!record) {
      await rebuildProgress(tx, owner);
      continue;
    }
    const facts = gameFacts(report, p.seat, seats, { gameId: game.id, endedAt: game.endedAt.toISOString(), adminEdited: game.adminEdited });
    const award = applyGame(record, stored.xp, facts);
    await writeProgress(tx, owner, award.xp, award.record);
    await tx.player.update({ where: { id: p.id }, data: { xpGained: award.gameXp + award.featXp } });
  }
}

/** Drops the stored records so they're rebuilt from history on next use (after games move or disappear). */
export async function invalidateProgress(tx: Tx, owners: Owner[]): Promise<void> {
  const userIds = owners.flatMap((o) => ('userId' in o ? [o.userId] : []));
  const guestIds = owners.flatMap((o) => ('guestSessionId' in o ? [o.guestSessionId] : []));
  if (userIds.length) await tx.profile.updateMany({ where: { userId: { in: userIds } }, data: { progress: Prisma.DbNull } });
  if (guestIds.length) await tx.guestSession.updateMany({ where: { id: { in: guestIds } }, data: { progress: Prisma.DbNull } });
}

export interface ProgressState {
  xp: number;
  record: ProgressRecord;
  unlock: UnlockState;
  /** The saved loadout, limited to what's unlocked (the default when nothing is saved). */
  loadout: Loadout;
}

const START: ProgressState = { xp: 0, record: EMPTY_PROGRESS, unlock: START_STATE, loadout: DEFAULT_LOADOUT };

/** Best rating for rating unlocks: the overall rating and every mode's peak (null: never rated). */
export const bestRating = (p: { rating: number; ratedGames: number; ratings?: { peakRating: number; ratedGames: number }[] }): number | null =>
  Math.max(p.ratedGames > 0 ? p.rating : 0, ...(p.ratings ?? []).filter((r) => r.ratedGames > 0).map((r) => r.peakRating)) || null;

/** An identity's progress. Builds the record from history the first time it's needed. Without a database: level 1. */
export async function progressStateFor(identity: ServerIdentity): Promise<ProgressState> {
  const db = getDb();
  if (!db) return START;
  try {
    const owner = ownerOf(identity);
    let row: { xp: number; progress: unknown; loadout: unknown; rating: number | null } | null;
    if ('userId' in owner) {
      const p = await db.profile.findUnique({ where: { userId: owner.userId },
        select: { xp: true, progress: true, loadout: true, rating: true, ratedGames: true, user: { select: { ratings: true } } } });
      row = p && { xp: p.xp, progress: p.progress, loadout: p.loadout, rating: bestRating({ ...p, ratings: p.user.ratings }) };
    } else {
      const g = await db.guestSession.findUnique({ where: { id: owner.guestSessionId }, select: { xp: true, progress: true, loadout: true } });
      row = g && { ...g, rating: null };
    }
    if (!row) return START;
    let xp = row.xp;
    let record = readProgress(row.progress);
    if (!record) {
      ({ xp, record } = await db.$transaction(async (tx) => {
        await lockOwner(tx, owner);
        return rebuildProgress(tx, owner);
      }, { timeout: 30_000 }));
    }
    const unlock = unlockState(xp, record, row.rating);
    return { xp, record, unlock, loadout: clampLoadout(row.loadout, unlock) };
  } catch (err) {
    logDbError('progress lookup', err);
    return START;
  }
}

/** What a seat shows: level and loadout. Always from the server, never from the client. */
export const crewOf = (s: ProgressState): SeatCrew => ({ level: levelFor(s.xp).level, loadout: s.loadout });

/** GET /api/progress: level, feats, the catalog with what's unlocked, the loadout and recent XP. */
export async function progressDataFor(identity: ServerIdentity): Promise<ProgressData> {
  const db = getDb();
  const s = await progressStateFor(identity);
  const recent = db
    ? await db.player.findMany({
        where: { ...ownerOf(identity), xpGained: { not: null }, game: { status: 'finished' } },
        orderBy: { game: { endedAt: 'desc' } },
        take: 10,
        select: { gameId: true, xpGained: true, won: true, game: { select: { endedAt: true, mode: true, settings: true } } },
      }).catch((err: unknown) => {
        logDbError('recent xp', err);
        return [];
      })
    : [];
  return {
    enabled: !!db,
    level: levelFor(s.xp),
    rating: s.unlock.rating,
    loadout: s.loadout,
    feats: FEATS.map((f) => {
      const c = s.record.feats[f.id];
      return { id: f.id, name: f.name, description: f.description, target: f.target, xp: f.xp, n: c?.n ?? 0, doneAt: c?.doneAt ?? null };
    }),
    items: ITEMS.map((i) => ({ ...i, unlocked: isUnlocked(i.unlock, s.unlock) })),
    recent: recent.map((r) => ({ gameId: r.gameId, endedAt: r.game.endedAt?.toISOString() ?? null, won: r.won, xp: r.xpGained ?? 0 })),
  };
}
