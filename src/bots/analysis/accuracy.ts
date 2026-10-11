/**
 * Turning "win chance lost" into chess-style verdicts and a 1–100 accuracy, and the small Elo nudge
 * a finished analysis gives rated players. Pure functions: shared by the analysis, the server and the
 * client (labels, colours).
 */

/**
 * Win-chance loss (percentage points against the best candidate, levelled win chances: analyse.ts) from
 * which a move is flagged. Rollout noise alone stays well under the inaccuracy line for most moves; ending
 * the turn on an affordable city or settlement costs 20–45 (a blunder), skipping a knight or a road usually
 * under 10 (more when the road would have taken the Longest Road).
 * Bot self-play averages about half a blunder per seat and game (mostly real: a road built where a
 * settlement was affordable, a settlement held back to save for a city).
 */
export const LOSS_THRESHOLDS = { inaccuracy: 5, mistake: 10, blunder: 20 } as const;

export type Verdict = keyof typeof LOSS_THRESHOLDS;

export const VERDICT_LABEL: Record<Verdict, string> = { inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' };

/** The verdict for a move that lost `loss` win% (null: fine). */
export function classify(loss: number): Verdict | null {
  if (loss >= LOSS_THRESHOLDS.blunder) return 'blunder';
  if (loss >= LOSS_THRESHOLDS.mistake) return 'mistake';
  if (loss >= LOSS_THRESHOLDS.inaccuracy) return 'inaccuracy';
  return null;
}

/**
 * Lichess grades every move of a game, most of them easy; so does this, but a Catan game has more
 * forced-looking choices (bank trades, ending the turn), so the average loss runs small. It is scaled
 * up before lichess's curve: on bot self-play (classic, C&K, sea and fog maps) the bots average
 * 0.2–2.5% lost per decision (a few games up to ~4), which this maps to roughly 96–64 (~52), typically
 * ~84; a player who ends the turn instead of every other build loses 3–13% per decision: 55 down to 7.
 */
export const ACCURACY_LOSS_SCALE = 4;

/**
 * Lichess's accuracy curve applied to the (scaled) average win% lost per decision:
 * 103.1668 · e^(−0.04354 · 4 · avgLoss) − 3.1669, clamped to 1..100 and rounded to one decimal.
 * No loss is 100; an average of 1% lost is about 84, 2.5% about 64, 5% about 40, 10% about 15.
 */
export function accuracyFromLoss(avgLoss: number): number {
  const raw = 103.1668 * Math.exp(-0.04354 * ACCURACY_LOSS_SCALE * Math.max(0, avgLoss)) - 3.1669;
  return Math.round(Math.min(100, Math.max(1, raw)) * 10) / 10;
}

/**
 * Rated games: accuracy moves the rating a little, on top of the result. (accuracy − 75) / 10 points,
 * rounded, capped at ±3, so it can never outweigh the game's own result.
 */
export const ACCURACY_ELO = { pivot: 75, per: 10, cap: 3 } as const;

export function accuracyEloNudge(accuracy: number): number {
  const raw = Math.round((accuracy - ACCURACY_ELO.pivot) / ACCURACY_ELO.per);
  // `+ 0` turns a rounded −0 into 0.
  return Math.max(-ACCURACY_ELO.cap, Math.min(ACCURACY_ELO.cap, raw)) + 0;
}

/** Fewest analysed decisions for an accuracy to count towards the rating. */
export const MIN_RATED_DECISIONS = 8;
