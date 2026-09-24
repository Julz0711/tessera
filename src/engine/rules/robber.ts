import { assertRule } from '../errors';
import { handTotal, parseHand, transfer } from '../hand';
import { hexNeighbours, isHex, robberTargets, robberVictims } from '../queries';
import { emit, type Ctx } from '../state';
import type { PartialHand, Prompt } from '../types';
import { publicVictoryPoints } from '../vp';
import { removePrompt, stealRandom } from './common';

export function discard(ctx: Ctx, prompt: Extract<Prompt, { kind: 'discard' }>, input: PartialHand): void {
  const cards = parseHand(input);
  assertRule(handTotal(cards) === prompt.count, `Discard exactly ${prompt.count} cards`);
  transfer(ctx.s.players[ctx.seat].hand, ctx.s.bank, cards, "You don't have those cards");
  emit(ctx, { type: 'discarded', seat: ctx.seat, cards });
  removePrompt(ctx, prompt);
}

/**
 * Moves the robber for the acting seat and resolves the theft: one chosen victim, or (Bishop)
 * one random card from everyone with a building on the hex.
 */
export function relocateRobber(ctx: Ctx, hex: number, victim: number | null, everyone = false): void {
  const s = ctx.s;
  assertRule(isHex(s, hex), 'Unknown hex');
  assertRule(hex !== s.robber, 'The robber must move to a different hex');
  const allowed = robberTargets(s, ctx.seat, (seat) => publicVictoryPoints(s, seat));
  assertRule(allowed.includes(hex), 'Friendly robber: that hex only touches players with 2 or fewer points');
  s.robber = hex;
  emit(ctx, { type: 'robberMoved', seat: ctx.seat, hex });

  if (everyone) {
    for (const other of hexNeighbours(s, ctx.seat, hex).sort((a, b) => a - b)) stealRandom(ctx, ctx.seat, other);
    return;
  }
  const victims = robberVictims(s, ctx.seat, hex);
  if (victims.length) {
    assertRule(victim !== null && victims.includes(victim), 'Choose a player to steal from');
    stealRandom(ctx, ctx.seat, victim);
  }
}

export function moveRobber(ctx: Ctx, prompt: Extract<Prompt, { kind: 'robber' }>, hex: number, victim: number | null): void {
  relocateRobber(ctx, hex, victim, prompt.reason === 'bishop');
  removePrompt(ctx, prompt);
}
