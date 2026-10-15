import type { GameReport } from '@/engine/report';
import { ratingPoolFor, type RatingPool } from '@/shared/ratings';

/**
 * What one finished game meant for one player: everything XP and feats are worked out from. Built
 * from the stored report and player rows, so progress can always be rebuilt from game history.
 */
export interface GameFacts {
  gameId: string;
  pool: RatingPool;
  map: string;
  /** When the game ended (ISO), for "different days" style feats. */
  endedAt: string | null;
  /** The player gave up their seat before the end (a bot finished for them). */
  abandoned: boolean;
  /** An admin changed the game by hand (testing): recorded, but it earns nothing. */
  adminEdited: boolean;
  won: boolean;
  vp: number;
  /** Other seats people sat in (abandoned ones and since-deleted players included). */
  otherHumans: number;
  longestRoad: boolean;
  largestArmy: boolean;
  /** C&K: Defender of Catan points earned this game. */
  defender: number;
  playerTrades: number;
}

export interface FactsSeat {
  seat: number;
  isBot: boolean;
  /** The seat is on record as a person's (account or guest), even if a bot took it over. */
  owned: boolean;
}

export function gameFacts(
  report: GameReport,
  seat: number,
  seats: FactsSeat[],
  meta: { gameId: string; endedAt: string | null; adminEdited: boolean },
): GameFacts {
  const me = seats.find((s) => s.seat === seat);
  const row = report.players[seat];
  const abandoned = !!me && me.isBot && me.owned;
  return {
    gameId: meta.gameId,
    pool: ratingPoolFor(report.mode, report.map),
    map: report.map,
    endedAt: meta.endedAt,
    abandoned,
    adminEdited: meta.adminEdited || !!report.adminEdited,
    won: report.winner === seat && !abandoned,
    vp: row?.vp ?? 0,
    otherHumans: seats.filter((s) => s.seat !== seat && (!s.isBot || s.owned)).length,
    longestRoad: (row?.points['Longest route'] ?? 0) > 0,
    largestArmy: (row?.points['Largest army'] ?? 0) > 0,
    defender: row?.points.Defender ?? 0,
    playerTrades: report.stats?.playerTrades?.[seat] ?? 0,
  };
}
