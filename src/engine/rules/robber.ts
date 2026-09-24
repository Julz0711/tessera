import { assertRule } from '../errors';
import { handTotal, parseHand, transfer } from '../hand';
import { hexNeighbours, robberTargets, robberVictims } from '../queries';
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

/** Moves the robber and resolves the steal (one victim, or everyone next to the hex for Bishop). */
export function moveRobber(
  ctx: Ctx,
  prompt: Extract<Prompt, { kind: 'robber' }>,
  hex: number,
  victim: number | null,
): void {
  const s = ctx.s;
  assertRule(Number.isInteger(hex) && hex >= 0 && hex < s.board.hexes.length, 'Unknown hex');
  assertRule(hex !== s.robber, 'The robber must move to a different hex');
  const allowed = robberTargets(s, ctx.seat, (seat) => publicVictoryPoints(s, seat));
  assertRule(allowed.includes(hex), 'Friendly robber: that hex only touches players with 2 or fewer points');
  s.robber = hex;
  emit(ctx, { type: 'robberMoved', seat: ctx.seat, hex });

  if (prompt.reason === 'bishop') {
    for (const other of hexNeighbours(s, ctx.seat, hex).sort((a, b) => a - b)) stealRandom(ctx, ctx.seat, other);
  } else {
    const victims = robberVictims(s, ctx.seat, hex);
    if (victims.length) {
      assertRule(victim !== null && victims.includes(victim), 'Choose a player to steal from');
      stealRandom(ctx, ctx.seat, victim);
    }
  }
  removePrompt(ctx, prompt);
}
