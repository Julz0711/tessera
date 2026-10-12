/**
 * The level curve. Level 1 → 2 costs `BASE` XP and every level after costs `GROWTH` times the one
 * before (2.65% more), rounded to 5 XP. Level 100 is reached at 69,730 XP; from there every level
 * costs the same as level 100 did, so there is no cap and levels keep coming. The level is always
 * derived from total XP and never stored, so the curve can be retuned later.
 */
export const LEVEL_CURVE = { BASE: 150, GROWTH: 1.0265, ROUND: 5, FLAT_FROM: 100 } as const;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  const { BASE, GROWTH, ROUND, FLAT_FROM } = LEVEL_CURVE;
  const n = Math.min(Math.max(Math.floor(level), 1), FLAT_FROM);
  return Math.round((BASE * GROWTH ** (n - 1)) / ROUND) * ROUND;
}

/** TOTALS[n] is the total XP at which level n is reached (index 0 unused; level 1 is 0 XP). */
const TOTALS: number[] = [0, 0];
for (let n = 1; n < LEVEL_CURVE.FLAT_FROM; n++) TOTALS.push(TOTALS[n] + xpToNext(n));

/** Total XP at which `level` is reached. */
export function xpForLevel(level: number): number {
  const L = Math.max(1, Math.floor(level));
  const { FLAT_FROM } = LEVEL_CURVE;
  return L <= FLAT_FROM ? TOTALS[L] : TOTALS[FLAT_FROM] + (L - FLAT_FROM) * xpToNext(FLAT_FROM);
}

export interface LevelInfo {
  level: number;
  /** XP earned since reaching `level`. */
  into: number;
  /** XP this level costs in total (`into` of it is done). */
  need: number;
  xp: number;
}

export function levelFor(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(Number.isFinite(xp) ? xp : 0));
  const { FLAT_FROM } = LEVEL_CURVE;
  let level: number;
  if (total >= TOTALS[FLAT_FROM]) {
    level = FLAT_FROM + Math.floor((total - TOTALS[FLAT_FROM]) / xpToNext(FLAT_FROM));
  } else {
    // Binary search over the 100 totals: the highest level whose total is within reach.
    let lo = 1;
    let hi = FLAT_FROM;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (TOTALS[mid] <= total) lo = mid;
      else hi = mid - 1;
    }
    level = lo;
  }
  return { level, into: total - xpForLevel(level), need: xpToNext(level), xp: total };
}
