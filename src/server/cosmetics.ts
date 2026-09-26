import { clampCosmetics, DEFAULT_COSMETICS, NO_UNLOCKS, type Cosmetics, type UnlockStats } from '@/shared/cosmetics';
import { getDb, logDbError } from './db';
import type { ServerIdentity } from './identity';

/**
 * What an identity has earned towards cosmetics, and what it picked. Without a database nothing
 * is tracked, so only the free cosmetics are available.
 */
export async function cosmeticStateFor(identity: ServerIdentity): Promise<{ unlocks: UnlockStats; chosen: Cosmetics | null }> {
  const db = getDb();
  if (!db) return { unlocks: NO_UNLOCKS, chosen: null };
  try {
    if (identity.kind === 'user') {
      const p = await db.profile.findUnique({
        where: { userId: identity.id },
        select: { gamesPlayed: true, gamesWon: true, rating: true, ratedGames: true, cosmetics: true },
      });
      if (!p) return { unlocks: NO_UNLOCKS, chosen: null };
      const unlocks = { gamesPlayed: p.gamesPlayed, gamesWon: p.gamesWon, rating: p.ratedGames > 0 ? p.rating : null };
      return { unlocks, chosen: p.cosmetics ? clampCosmetics(p.cosmetics, unlocks) : null };
    }
    const g = await db.guestSession.findUnique({ where: { id: identity.id }, select: { gamesPlayed: true, gamesWon: true, cosmetics: true } });
    if (!g) return { unlocks: NO_UNLOCKS, chosen: null };
    const unlocks = { gamesPlayed: g.gamesPlayed, gamesWon: g.gamesWon, rating: null };
    return { unlocks, chosen: g.cosmetics ? clampCosmetics(g.cosmetics, unlocks) : null };
  } catch (err) {
    logDbError('cosmetics lookup', err);
    return { unlocks: NO_UNLOCKS, chosen: null };
  }
}

/**
 * The cosmetics a seat shows: the saved choice when there is one (it follows the player across
 * devices), else what this browser asked for — always limited to what's unlocked.
 */
export function seatCosmetics(requested: unknown, state: { unlocks: UnlockStats; chosen: Cosmetics | null }): Cosmetics {
  return state.chosen ?? (requested === undefined ? DEFAULT_COSMETICS : clampCosmetics(requested, state.unlocks));
}
