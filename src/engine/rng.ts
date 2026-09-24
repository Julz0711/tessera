/** Seeded PRNG (mulberry32). The state is a uint32 stored on the game state. */
export interface RngHolder {
  rng: number;
}

export function random(h: RngHolder): number {
  h.rng = (h.rng + 0x6d2b79f5) >>> 0;
  let t = h.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [0, n). */
export function randomInt(h: RngHolder, n: number): number {
  return Math.floor(random(h) * n);
}

export function rollDie(h: RngHolder): number {
  return randomInt(h, 6) + 1;
}

/** In-place Fisher–Yates shuffle; returns the same array. */
export function shuffle<T>(h: RngHolder, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(h, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function normalizeSeed(seed: number): number {
  return (Math.floor(Math.abs(seed)) % 4294967296) >>> 0;
}
