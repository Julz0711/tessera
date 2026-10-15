import type { Prisma } from '@/generated/prisma/client';
import type { Mode } from '@/engine';
import { buildReport, standings } from '@/engine/report';
import { ratingPoolFor, type RatingPool } from '@/shared/ratings';
import type { Db } from './db';
import type { PersistGame } from './persistence';
import { awardFinishedGame } from './progression';
import { ratingChanges } from './rating';

/** Extra rating an abandoner loses on top of their last-place result (and they never gain from it). */
export const ABANDON_PENALTY = 15;

type PlayerRow = Awaited<ReturnType<Prisma.TransactionClient['player']['findMany']>>[number];

/** A seat its owner gave up mid-game (a bot played on; see ABANDONED_SEAT): it counts as a forfeit. */
const abandoned = (p: PlayerRow) => p.isBot && !!(p.userId || p.guestSessionId);

/** Locks every identity in the game, in a stable order, so concurrent games can't interleave rating updates. */
export async function lockIdentities(tx: Prisma.TransactionClient, players: Pick<PlayerRow, 'userId' | 'guestSessionId'>[]): Promise<void> {
  // Persisted identities also cover guests who linked their account while the match was running.
  const identityKeys = [...new Set(players.flatMap((p) => p.userId ? [`user:${p.userId}`] : p.guestSessionId ? [`guest:${p.guestSessionId}`] : []))].sort();
  for (const id of identityKeys) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`rating:${id}`}, 0))::text`;
}

/**
 * Rates the signed-in players (by seat) from their places, when there are at least two. Abandoners
 * also pay `ABANDON_PENALTY` and never gain. Returns each rated seat's change.
 */
async function applyRatings(tx: Prisma.TransactionClient, pool: RatingPool, players: PlayerRow[], places: number[], winner: number | null) {
  const rated = players.filter((p) => p.userId);
  const out = new Map<number, { before: number; after: number; delta: number }>();
  if (rated.length < 2) return out;
  const ratings = [];
  for (const p of rated) ratings.push(await tx.playerRating.upsert({ where: { userId_poolKey: { userId: p.userId!, poolKey: pool } },
    create: { userId: p.userId!, poolKey: pool }, update: {} }));
  const deltas = ratingChanges(ratings.map((r, i) => ({ rating: r.rating, games: r.ratedGames, place: places[rated[i].seat] })));
  for (const [i, p] of rated.entries()) {
    const delta = abandoned(p) ? Math.min(0, deltas[i]) - ABANDON_PENALTY : deltas[i];
    const before = ratings[i].rating;
    const after = before + delta;
    await tx.playerRating.update({ where: { userId_poolKey: { userId: p.userId!, poolKey: pool } },
      data: { rating: after, ratedGames: { increment: 1 }, ratedWins: { increment: p.seat === winner && !abandoned(p) ? 1 : 0 }, peakRating: Math.max(after, ratings[i].peakRating) } });
    await tx.player.update({ where: { id: p.id }, data: { ratingPool: pool, ratingVersion: 1, ratingBefore: before, ratingAfter: after, ratingDelta: delta, unratedReason: null } });
    out.set(p.seat, { before, after, delta });
  }
  return out;
}

/** One transaction and stable per-user locks cover concurrent games as well as completion retries. */
export async function finalizeGame(db: Db, game: PersistGame): Promise<void> {
  if (game.state.phase !== 'ended') throw new Error('Cannot finalize an unfinished game');
  const report = buildReport(game.state);
  const pool = ratingPoolFor(game.state.mode, game.state.settings.map);
  const places = standings(report.players.map((p) => p.vp), game.state.winner);
  await db.$transaction(async (tx) => {
    // Claim this game first. A duplicate completion waits, then sees finished and does nothing.
    const claimed = await tx.game.updateMany({ where: { id: game.gameId, status: { not: 'finished' } }, data: { status: 'finished' } });
    if (!claimed.count) return;
    const players = await tx.player.findMany({ where: { gameId: game.gameId }, orderBy: { seat: 'asc' } });
    await lockIdentities(tx, players);
    // Forfeits share the bottom places, even when the bot playing the seat won; everyone else moves
    // up past the forfeits they finished behind.
    const forfeits = players.filter(abandoned).map((p) => p.seat);
    const finish = [...places];
    for (const p of players) {
      places[p.seat] = forfeits.includes(p.seat)
        ? players.length - forfeits.length + 1
        : finish[p.seat] - forfeits.filter((s) => finish[s] < finish[p.seat]).length;
      if (forfeits.length) report.players[p.seat].rank = places[p.seat];
      report.players[p.seat].isBot = p.isBot;
    }
    const edited = !!game.state.adminEdited;
    if (edited) report.adminEdited = true;
    for (const p of players) {
      const won = p.seat === game.state.winner && !abandoned(p);
      const unrated = p.isBot && !abandoned(p) ? 'Bot' : !p.userId ? 'Guest player' : edited ? 'Edited by an admin' : 'Needs two signed-in players';
      report.players[p.seat].rating = { pool, before: null, after: null, delta: null, reason: unrated };
      if (p.userId) await tx.profile.upsert({ where: { userId: p.userId },
        create: { userId: p.userId, displayName: p.displayName, gamesPlayed: 1, gamesWon: won ? 1 : 0 },
        update: { gamesPlayed: { increment: 1 }, gamesWon: { increment: won ? 1 : 0 } } });
      else if (p.guestSessionId) await tx.guestSession.update({ where: { id: p.guestSessionId }, data: { gamesPlayed: { increment: 1 }, gamesWon: { increment: won ? 1 : 0 } } });
      await tx.player.update({ where: { id: p.id }, data: { finalVp: report.players[p.seat].vp, rank: places[p.seat], won,
        ratingPool: pool, ratingVersion: 1, unratedReason: unrated } });
    }
    // A game an admin changed by hand (testing) is recorded, but nobody's rating moves.
    if (!edited) {
      for (const [seat, r] of await applyRatings(tx, pool, players, places, game.state.winner)) {
        report.players[seat].rating = { pool, ...r, reason: null };
      }
    }
    const endedAt = new Date();
    await tx.game.update({ where: { id: game.gameId }, data: { winnerPlayerId: game.state.winner === null ? null : players.find((p) => p.seat === game.state.winner)?.id,
      endedAt, turns: game.state.turn.n, hasReport: true, report: JSON.parse(JSON.stringify(report)) } });
    // XP and feats, last: a first-time rebuild from history must already see this game's report.
    await awardFinishedGame(tx, { id: game.gameId, endedAt, adminEdited: edited }, report, players);
  }, { timeout: 30_000 });
}

/**
 * A game that closed before it ended (everyone left, or it expired). There is no result to rate,
 * except for abandoners: when someone gave up their seat, the rated players who stayed share first
 * place and the abandoners share last (plus the penalty), as if they had forfeited on the spot.
 */
export async function finalizeAbandonedGame(db: Db, gameId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const claimed = await tx.game.updateMany({ where: { id: gameId, status: 'playing' }, data: { status: 'abandoned', endedAt: new Date() } });
    if (!claimed.count) return;
    const players = await tx.player.findMany({ where: { gameId }, orderBy: { seat: 'asc' } });
    if (!players.some((p) => abandoned(p) && p.userId)) return;
    await lockIdentities(tx, players);
    const game = await tx.game.findUniqueOrThrow({ where: { id: gameId }, select: { mode: true, settings: true } });
    const pool = ratingPoolFor(game.mode as Mode, (game.settings as { map?: string } | null)?.map);
    const places = players.map((p) => (abandoned(p) ? 2 : 1));
    await applyRatings(tx, pool, players, places, null);
  }, { timeout: 30_000 });
}
