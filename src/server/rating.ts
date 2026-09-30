/**
 * Multiplayer Elo. Every pair of rated players in a finished game is a duel decided by final
 * standing (the winner beats everyone; the rest by victory points, equal points a draw). A player's
 * change is the sum of their duels, scaled so a four-player game moves about as much as one
 * two-player game. New players move faster while their rating settles.
 *
 * Only signed-in players are rated, and only in games with at least two of them — so bots and
 * throwaway guests can't be farmed for rating.
 */
export const START_RATING = 1000;

export interface RatedPlayer {
  rating: number;
  /** Rated games played before this one. */
  games: number;
  /** Final standing: 1 = winner. Equal numbers are a draw between those players. */
  place: number;
}

/** K-factor: bigger while a player's rating is still finding its level. */
export function kFactor(games: number): number {
  return games < 10 ? 48 : games < 30 ? 32 : 24;
}

export function expected(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

/** Rating change for each player, rounded to whole points. */
export function ratingChanges(players: RatedPlayer[]): number[] {
  const n = players.length;
  if (n < 2) return players.map(() => 0);
  return players.map((me, i) => {
    let sum = 0;
    players.forEach((other, j) => {
      if (i === j) return;
      const score = me.place < other.place ? 1 : me.place > other.place ? 0 : 0.5;
      sum += score - expected(me.rating, other.rating);
    });
    return Math.round((kFactor(me.games) * sum) / (n - 1));
  });
}

/** Final places from victory points, with the winner (if any) always first. */
export { standings as placesFrom } from '@/engine/report';
