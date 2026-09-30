import { emptyRatings, type ModeRating } from '@/shared/ratings';
import { getDb } from './db';

export async function modeRatingsFor(userId: string): Promise<ModeRating[]> {
  const db = getDb();
  if (!db) return emptyRatings();
  const rows = await db.playerRating.findMany({ where: { userId } });
  return Promise.all(emptyRatings().map(async (base) => {
    const row = rows.find((r) => r.poolKey === base.pool);
    if (!row) return base;
    const place = row.ratedGames ? 1 + await db.playerRating.count({ where: { poolKey: base.pool, ratedGames: { gt: 0 }, rating: { gt: row.rating } } }) : null;
    return { ...base, rating: row.rating, ratedGames: row.ratedGames, ratedWins: row.ratedWins, peakRating: row.peakRating, place };
  }));
}
