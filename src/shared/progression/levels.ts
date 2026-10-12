/**
 * The level curve. Level 1 → 2 costs `BASE` XP and every level after costs `STEP` more, until
 * `FLAT_FROM`; from there each level costs the same. There is no cap, so levels keep coming.
 * The level is always derived from total XP and never stored, so the curve can be retuned later.
 */
export const LEVEL_CURVE = { BASE: 150, STEP: 25, FLAT_FROM: 30 } as const;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  const { BASE, STEP, FLAT_FROM } = LEVEL_CURVE;
  return BASE + STEP * (Math.min(Math.max(level, 1), FLAT_FROM) - 1);
}

/** Total XP at which `level` is reached (level 1 is 0 XP). */
export function xpForLevel(level: number): number {
  const { BASE, STEP, FLAT_FROM } = LEVEL_CURVE;
  const L = Math.max(1, Math.floor(level));
  const rising = Math.min(L, FLAT_FROM) - 1; // levels 1..rising pay the rising cost
  const sum = rising * BASE + (STEP * rising * (rising - 1)) / 2;
  return sum + Math.max(0, L - FLAT_FROM) * xpToNext(FLAT_FROM);
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
  // The flat part is a division; only the rising part (at most FLAT_FROM steps) is walked.
  let level = 1;
  while (level < LEVEL_CURVE.FLAT_FROM && xpForLevel(level + 1) <= total) level++;
  if (level === LEVEL_CURVE.FLAT_FROM) level += Math.floor((total - xpForLevel(level)) / xpToNext(level));
  return { level, into: total - xpForLevel(level), need: xpToNext(level), xp: total };
}
