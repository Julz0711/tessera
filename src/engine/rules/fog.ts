import { TERRAIN_RESOURCE } from '../constants';
import { assertRule } from '../errors';
import { handTotal, parseHand, transfer } from '../hand';
import { emit, type Ctx } from '../state';
import { RESOURCES, type PartialHand, type Prompt } from '../types';
import { removePrompt } from './common';

/**
 * Black Forest: lifts the fog from every hex touching these corners (a new road's ends or a new
 * settlement). The builder takes one card of each discovered resource, or a free pick for gold.
 */
export function revealAround(ctx: Ctx, vertices: number[]): void {
  const s = ctx.s;
  const found = [...new Set(vertices.flatMap((v) => ctx.topo.vertices[v].hexes))].filter((h) => s.board.hexes[h].fog);
  if (!found.length) return;
  const gains: PartialHand = {};
  let picks = 0;
  for (const id of found) {
    const hex = s.board.hexes[id];
    delete hex.fog;
    if (hex.terrain === 'gold') picks++;
    const res = TERRAIN_RESOURCE[hex.terrain];
    if (res && s.bank[res] > 0) {
      s.bank[res]--;
      s.players[ctx.seat].hand[res]++;
      gains[res] = (gains[res] ?? 0) + 1;
    }
  }
  emit(ctx, {
    type: 'revealed',
    seat: ctx.seat,
    hexes: found.map((id) => ({ id, terrain: s.board.hexes[id].terrain, token: s.board.hexes[id].token })),
  });
  if (handTotal(gains) > 0) emit(ctx, { type: 'received', seat: ctx.seat, cards: gains, reason: 'discovery' });
  if (picks) s.pending.push({ kind: 'goldPick', seat: ctx.seat, count: picks });
}

/** Gold: take `count` resources of your choice (fewer only when the bank can't cover them). */
export function pickGold(ctx: Ctx, prompt: Extract<Prompt, { kind: 'goldPick' }>, input: PartialHand): void {
  const s = ctx.s;
  const cards = parseHand(input);
  assertRule(
    Object.keys(cards).every((c) => (RESOURCES as readonly string[]).includes(c)),
    'Gold pays out resources only',
  );
  const available = RESOURCES.reduce((n, r) => n + s.bank[r], 0);
  const need = Math.min(prompt.count, available);
  assertRule(handTotal(cards) === need, `Pick ${need} resource${need === 1 ? '' : 's'}`);
  transfer(s.bank, s.players[ctx.seat].hand, cards, 'The bank has run out of that');
  if (need > 0) emit(ctx, { type: 'received', seat: ctx.seat, cards, reason: 'gold' });
  removePrompt(ctx, prompt);
}
