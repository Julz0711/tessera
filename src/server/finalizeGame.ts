import { buildReport, standings } from '@/engine/report';
import { ratingPoolFor } from '@/shared/ratings';
import type { Db } from './db';
import type { PersistGame } from './persistence';
import { ratingChanges } from './rating';

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
    // Persisted identities also cover guests who linked their account while the match was running.
    const identityKeys = [...new Set(players.flatMap((p) => p.userId ? [`user:${p.userId}`] : p.guestSessionId ? [`guest:${p.guestSessionId}`] : []))].sort();
    for (const id of identityKeys) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`rating:${id}`}, 0))::text`;
    for (const p of players) {
      const won = p.seat === game.state.winner;
      report.players[p.seat].rating = { pool, before: null, after: null, delta: null, reason: p.isBot ? 'Bot' : !p.userId ? 'Guest player' : 'Needs two signed-in players' };
      if (p.userId) await tx.profile.upsert({ where: { userId: p.userId },
        create: { userId: p.userId, displayName: p.displayName, gamesPlayed: 1, gamesWon: won ? 1 : 0 },
        update: { gamesPlayed: { increment: 1 }, gamesWon: { increment: won ? 1 : 0 } } });
      else if (p.guestSessionId) await tx.guestSession.update({ where: { id: p.guestSessionId }, data: { gamesPlayed: { increment: 1 }, gamesWon: { increment: won ? 1 : 0 } } });
      await tx.player.update({ where: { id: p.id }, data: { finalVp: report.players[p.seat].vp, rank: places[p.seat], won,
        ratingPool: pool, ratingVersion: 1, unratedReason: p.isBot ? 'Bot' : !p.userId ? 'Guest player' : 'Needs two signed-in players' } });
    }
    const rated = players.filter((p) => p.userId && !p.isBot);
    if (rated.length >= 2) {
      const ratings = [];
      for (const p of rated) ratings.push(await tx.playerRating.upsert({ where: { userId_poolKey: { userId: p.userId!, poolKey: pool } },
        create: { userId: p.userId!, poolKey: pool }, update: {} }));
      const deltas = ratingChanges(ratings.map((r, i) => ({ rating: r.rating, games: r.ratedGames, place: places[rated[i].seat] })));
      for (const [i, p] of rated.entries()) {
        const before = ratings[i].rating;
        const after = before + deltas[i];
        await tx.playerRating.update({ where: { userId_poolKey: { userId: p.userId!, poolKey: pool } },
          data: { rating: after, ratedGames: { increment: 1 }, ratedWins: { increment: p.seat === game.state.winner ? 1 : 0 }, peakRating: Math.max(after, ratings[i].peakRating) } });
        await tx.player.update({ where: { id: p.id }, data: { ratingBefore: before, ratingAfter: after, ratingDelta: deltas[i], unratedReason: null } });
        report.players[p.seat].rating = { pool, before, after, delta: deltas[i], reason: null };
      }
    }
    const endedAt = new Date();
    await tx.game.update({ where: { id: game.gameId }, data: { winnerPlayerId: game.state.winner === null ? null : players.find((p) => p.seat === game.state.winner)?.id,
      endedAt, turns: game.state.turn.n, hasReport: true, report: JSON.parse(JSON.stringify(report)) } });
  }, { timeout: 30_000 });
}
