import { TREASURE_BUNDLE } from '../constants';
import { freeRouteCount, freeRouteLeft } from '../queries';
import { randomInt } from '../rng';
import { emit, type Ctx } from '../state';
import { TREASURE_KINDS, type PartialHand, type TreasureKind } from '../types';

/**
 * Veiled Isles treasures. A road or ship reaching a treasure corner collects it (built, moved or
 * placed for free); revealing hidden sea pays a bonus treasure drawn at random from the four kinds
 * (it doesn't use up the placed ones).
 */
export function collectTreasures(ctx: Ctx, edge: number): void {
  const treasures = ctx.s.board.treasures;
  if (!treasures) return;
  const { a, b } = ctx.topo.edges[edge];
  for (const t of treasures) {
    if (t.takenBy !== undefined || (t.vertex !== a && t.vertex !== b) || !t.kind) continue;
    t.takenBy = ctx.seat;
    grantTreasure(ctx, t.kind, t.vertex);
  }
}

export function oceanTreasure(ctx: Ctx): void {
  grantTreasure(ctx, TREASURE_KINDS[randomInt(ctx.s, TREASURE_KINDS.length)], null);
}

function grantTreasure(ctx: Ctx, kind: TreasureKind, at: number | null): void {
  const { s, seat } = ctx;
  emit(ctx, { type: 'treasure', seat, kind, at });
  switch (kind) {
    case 'resource':
      // A resource of choice, taken like a gold field's.
      s.pending.push({ kind: 'goldPick', seat, count: 1, reason: 'treasure' });
      return;
    case 'roadBuilding':
      if (freeRouteLeft(s, seat)) s.pending.push({ kind: 'freeRoads', seat, count: freeRouteCount(s, seat) });
      return;
    case 'bundle': {
      // What the bank is out of is simply not paid; the rest still is.
      const got: PartialHand = {};
      for (const [card, n] of Object.entries(TREASURE_BUNDLE) as [keyof typeof TREASURE_BUNDLE, number][]) {
        if (s.bank[card] < n) continue;
        s.bank[card] -= n;
        s.players[seat].hand[card] += n;
        got[card] = n;
      }
      if (Object.keys(got).length) emit(ctx, { type: 'received', seat, cards: got, reason: 'treasure' });
      return;
    }
    case 'devCard':
      // Knights & Barbarians: a progress card from the deck of your choice. Classic: the top development card.
      if (s.mode === 'ck') s.pending.push({ kind: 'rewardDeck', seat, reason: 'treasure' });
      else if (s.devDeck.length) {
        const type = s.devDeck.pop()!;
        s.players[seat].devCards.push({ type, boughtOn: s.turn.n });
        emit(ctx, { type: 'devBought', seat }, { data: { card: type }, to: [seat] });
      }
      return;
  }
}
