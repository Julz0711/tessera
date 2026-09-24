import { assertRule } from '../errors';
import { cardList } from '../hand';
import { randomInt } from '../rng';
import { emit, type Ctx } from '../state';
import type { Card, Prompt } from '../types';

export function requireActive(ctx: Ctx): void {
  assertRule(ctx.s.phase === 'play', 'The game is not in progress');
  assertRule(ctx.seat === ctx.s.turn.seat, "It's not your turn");
}

export function requireRolled(ctx: Ctx): void {
  requireActive(ctx);
  assertRule(ctx.s.turn.rolled, 'Roll the dice first');
}

export function requireMode(ctx: Ctx, mode: 'classic' | 'ck'): void {
  assertRule(ctx.s.mode === mode, mode === 'ck' ? 'Only in Cities & Knights' : 'Not in Cities & Knights');
}

export function removePrompt(ctx: Ctx, prompt: Prompt): void {
  const i = ctx.s.pending.indexOf(prompt);
  if (i >= 0) ctx.s.pending.splice(i, 1);
}

/** Moves one random card from `victim` to the acting seat; returns the card (or null). */
export function stealRandom(ctx: Ctx, thief: number, victim: number): Card | null {
  const vHand = ctx.s.players[victim].hand;
  const cards = cardList(vHand);
  if (!cards.length) return null;
  const card = cards[randomInt(ctx.s, cards.length)];
  vHand[card]--;
  ctx.s.players[thief].hand[card]++;
  emit(ctx, { type: 'stole', seat: thief, victim }, { data: { card }, to: [thief, victim] });
  return card;
}

export function isInt(n: unknown, min: number, max: number): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;
}
