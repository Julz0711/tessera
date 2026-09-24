import { RuleError } from './errors';
import { CARDS, COMMODITIES, RESOURCES, isCard, type Card, type Hand, type PartialHand } from './types';

export function emptyHand(): Hand {
  return { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0, paper: 0, cloth: 0, coin: 0 };
}

export function handTotal(h: PartialHand): number {
  let n = 0;
  for (const c of CARDS) n += h[c] ?? 0;
  return n;
}

export function resourceTotal(h: PartialHand): number {
  let n = 0;
  for (const c of RESOURCES) n += h[c] ?? 0;
  return n;
}

export function commodityTotal(h: PartialHand): number {
  let n = 0;
  for (const c of COMMODITIES) n += h[c] ?? 0;
  return n;
}

export function hasCards(h: PartialHand, need: PartialHand): boolean {
  for (const c of CARDS) if ((need[c] ?? 0) > (h[c] ?? 0)) return false;
  return true;
}

export function addCards(h: Hand, delta: PartialHand): void {
  for (const c of CARDS) h[c] += delta[c] ?? 0;
}

export function removeCards(h: Hand, delta: PartialHand, message = 'Not enough cards'): void {
  if (!hasCards(h, delta)) throw new RuleError(message);
  for (const c of CARDS) h[c] -= delta[c] ?? 0;
}

/** Moves cards between two hands (e.g. player → bank). */
export function transfer(from: Hand, to: Hand, cards: PartialHand, message?: string): void {
  removeCards(from, cards, message);
  addCards(to, cards);
}

/** Expands a hand into a flat list of cards, e.g. {wool:2} → ['wool','wool']. */
export function cardList(h: PartialHand): Card[] {
  const out: Card[] = [];
  for (const c of CARDS) for (let i = 0; i < (h[c] ?? 0); i++) out.push(c);
  return out;
}

export function compactHand(h: PartialHand): PartialHand {
  const out: PartialHand = {};
  for (const c of CARDS) if ((h[c] ?? 0) > 0) out[c] = h[c];
  return out;
}

export function sameCardTypes(a: PartialHand, b: PartialHand): boolean {
  return CARDS.some((c) => (a[c] ?? 0) > 0 && (b[c] ?? 0) > 0);
}

/** Validates untrusted input into a PartialHand of non-negative integers. */
export function parseHand(input: unknown, max = 99): PartialHand {
  if (!input || typeof input !== 'object') throw new RuleError('Invalid cards');
  const out: PartialHand = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!isCard(k)) throw new RuleError(`Unknown card: ${k}`);
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > max) throw new RuleError('Invalid card count');
    if (v > 0) out[k] = v;
  }
  return out;
}
