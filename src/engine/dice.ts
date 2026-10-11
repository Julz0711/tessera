/**
 * Balanced dice (the "marble bag"): instead of rolling, draw one of the 36 two-dice combinations
 * from a bag without putting it back, so over a game every total turns up close to its real odds.
 *
 * Version 2 (games with settings.diceVersion = 2, modelled on hexed.gg's "Balanced v2"):
 * - The bag is refilled with all 36 while BAG_REFILL_AT draws are still left in it, so counting
 *   what's left never tells you for sure what comes next. History persists across refills.
 * - Recency: every time a total showed up in the last RECENT_WINDOW rolls, the remaining pairs of
 *   that total lose RECENT_STEP of their weight (100%, 66%, 32%, then 0%).
 * - Sevens are kept fair between players. Once at least as many sevens were rolled as there are
 *   players who have rolled, the roller's balance factor is 2 - (those players x the roller's share
 *   of all sevens): below their share it is above 1, above it below 1. Before that it is 1.
 * - A streak is the latest sevens all rolled by one player (other totals in between don't break
 *   it, a seven by someone else does). Each seven in it moves the streaking player's factor down by
 *   SEVEN_STREAK_STEP and everybody else's up by it.
 *   Choice: the two combine as balance + streak change, clamped to 0..2, and the result multiplies
 *   the weight of the remaining seven pairs for the current roller.
 * - The draw uses those weights; a drawn seven stands (no re-drawing). Points, resources and the
 *   lead play no role. The randomness is still the seeded engine RNG, so replays are deterministic.
 *
 * Version 1 (games without diceVersion, saved before v2 existed) keeps its old rule exactly:
 * a draw that would repeat the previous total counts only REPEAT_WEIGHT as much.
 */
import { random, type RngHolder } from './rng';
import type { DiceBag } from './types';

export const BAG_REFILL_AT = 12;
export const REPEAT_WEIGHT = 0.7;
export const RECENT_WINDOW = 5;
export const RECENT_STEP = 0.34;
export const SEVEN_STREAK_STEP = 0.4;
export const DICE_VERSION = 2;

const FULL_BAG = Array.from({ length: 36 }, (_, i) => i);

const total = (card: number) => Math.floor(card / 6) + (card % 6) + 2;

type DiceHolder = RngHolder & { diceBag?: DiceBag; settings?: { diceVersion?: number } };

/** Cards to draw from now: the bag, or a full one if it is running low. */
export function bagCards(bag: DiceBag | undefined): number[] {
  return bag && bag.cards.length > BAG_REFILL_AT ? bag.cards : [...FULL_BAG];
}

/** Version 2 weight of every card in `cards` for the roller `seat` (not normalised). */
export function balancedWeights(cards: number[], bag: DiceBag | undefined, seat: number): number[] {
  const recent = bag?.recent ?? [];
  const sevens = bag?.sevens ?? [];
  const rolled = new Set(bag?.rolled ?? []);
  rolled.add(seat);
  const allSevens = sevens.reduce((a, n) => a + (n ?? 0), 0);
  const balance = allSevens > 0 && allSevens >= rolled.size ? 2 - (rolled.size * (sevens[seat] ?? 0)) / allSevens : 1;
  const streak = bag?.streak;
  const delta = streak ? (streak.seat === seat ? -1 : 1) * SEVEN_STREAK_STEP * streak.count : 0;
  const sevenFactor = Math.min(2, Math.max(0, balance + delta));
  const weights = cards.map((c) => {
    const t = total(c);
    const seen = recent.reduce((n, r) => n + (r === t ? 1 : 0), 0);
    return Math.max(0, 1 - RECENT_STEP * seen) * (t === 7 ? sevenFactor : 1);
  });
  return weights.some((w) => w > 0) ? weights : cards.map(() => 1);
}

function pick(h: RngHolder, weights: number[]): number {
  let x = random(h) * weights.reduce((a, w) => a + w, 0);
  let i = 0;
  while (i < weights.length - 1 && x >= weights[i]) x -= weights[i++];
  return i;
}

/** Draws the next roll for `seat` from the bag (filling it first when it's running low). */
export function drawBalanced(h: DiceHolder, seat = 0): { red: number; yellow: number } {
  return h.settings?.diceVersion === DICE_VERSION ? drawV2(h, seat) : drawV1(h);
}

function drawV2(h: DiceHolder, seat: number): { red: number; yellow: number } {
  const bag: DiceBag = h.diceBag ?? { cards: [], last: 0 };
  if (bag.cards.length <= BAG_REFILL_AT) bag.cards = [...FULL_BAG];
  const i = pick(h, balancedWeights(bag.cards, bag, seat));
  const [card] = bag.cards.splice(i, 1);
  const t = total(card);
  bag.last = t;
  bag.recent = [...(bag.recent ?? []), t].slice(-RECENT_WINDOW);
  if (!bag.rolled?.includes(seat)) bag.rolled = [...(bag.rolled ?? []), seat];
  if (t === 7) {
    const sevens = [...(bag.sevens ?? [])];
    while (sevens.length <= seat) sevens.push(0);
    sevens[seat]++;
    bag.sevens = sevens;
    bag.streak = bag.streak?.seat === seat ? { seat, count: bag.streak.count + 1 } : { seat, count: 1 };
  }
  h.diceBag = bag;
  return { red: Math.floor(card / 6) + 1, yellow: (card % 6) + 1 };
}

/** The original rule, unchanged in behaviour so saved games replay with the same rolls. */
function drawV1(h: DiceHolder): { red: number; yellow: number } {
  const bag = h.diceBag ?? { cards: [], last: 0 };
  if (bag.cards.length <= BAG_REFILL_AT) bag.cards = [...FULL_BAG];
  const weights = bag.cards.map((c) => (total(c) === bag.last ? REPEAT_WEIGHT : 1));
  const i = pick(h, weights);
  const [card] = bag.cards.splice(i, 1);
  bag.last = total(card);
  h.diceBag = bag;
  return { red: Math.floor(card / 6) + 1, yellow: (card % 6) + 1 };
}
