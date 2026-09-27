/**
 * Balanced dice (the "marble bag"): instead of rolling, draw one of the 36 two-dice combinations
 * from a bag without putting it back, so over a game every total turns up close to its real odds.
 * Two tweaks keep it from being predictable or streaky:
 * - The bag is refilled with all 36 while BAG_REFILL_AT draws are still left in it, so counting
 *   what's left never tells you for sure what comes next.
 * - A draw that would repeat the previous total counts only REPEAT_WEIGHT as much.
 * Each total still comes up about as often as with real dice: 6, 7 and 8 stay the most common.
 */
import { random, type RngHolder } from './rng';
import type { DiceBag } from './types';

export const BAG_REFILL_AT = 12;
export const REPEAT_WEIGHT = 0.7;

const FULL_BAG = Array.from({ length: 36 }, (_, i) => i);

const total = (card: number) => Math.floor(card / 6) + (card % 6) + 2;

/** Draws the next roll from the bag (filling it first when it's running low). */
export function drawBalanced(h: RngHolder & { diceBag?: DiceBag }): { red: number; yellow: number } {
  const bag = h.diceBag ?? { cards: [], last: 0 };
  if (bag.cards.length <= BAG_REFILL_AT) bag.cards = [...FULL_BAG];
  const weights = bag.cards.map((c) => (total(c) === bag.last ? REPEAT_WEIGHT : 1));
  let x = random(h) * weights.reduce((a, w) => a + w, 0);
  let i = 0;
  while (i < weights.length - 1 && x >= weights[i]) x -= weights[i++];
  const [card] = bag.cards.splice(i, 1);
  bag.last = total(card);
  h.diceBag = bag;
  return { red: Math.floor(card / 6) + 1, yellow: (card % 6) + 1 };
}
