import { COSTS } from '../constants';
import { recordSpend } from '../detailedStats';
import { assertRule } from '../errors';
import { transfer } from '../hand';
import { freeRouteCount, freeRouteLeft } from '../queries';
import { emit, type Ctx } from '../state';
import { RESOURCES, isResource, type DevCardType, type Resource } from '../types';
import { updateLargestArmy } from './awards';
import { requireActive, requireMode, requireRolled } from './common';

export function buyDevCard(ctx: Ctx): void {
  requireMode(ctx, 'classic');
  requireRolled(ctx);
  const s = ctx.s;
  assertRule(s.devDeck.length > 0, 'No development cards left');
  transfer(s.players[ctx.seat].hand, s.bank, COSTS.devCard, 'Not enough resources for a development card');
  recordSpend(s, ctx.seat, COSTS.devCard, 'development card');
  const type = s.devDeck.pop()!;
  s.players[ctx.seat].devCards.push({ type, boughtOn: s.turn.n });
  emit(ctx, { type: 'devBought', seat: ctx.seat }, { data: { card: type }, to: [ctx.seat] });
}

/** Removes one playable card of `type` (not bought this turn, one per turn) from the active player. */
function takePlayable(ctx: Ctx, type: DevCardType): void {
  requireMode(ctx, 'classic');
  requireActive(ctx);
  const s = ctx.s;
  assertRule(!s.turn.devPlayed, 'You already played a development card this turn');
  const cards = s.players[ctx.seat].devCards;
  const i = cards.findIndex((c) => c.type === type && c.boughtOn < s.turn.n);
  assertRule(i >= 0, cards.some((c) => c.type === type) ? "You can't play a card on the turn you bought it" : "You don't have that card");
  cards.splice(i, 1);
  s.turn.devPlayed = true;
  emit(ctx, { type: 'devPlayed', seat: ctx.seat, card: type });
}

export function playKnight(ctx: Ctx): void {
  takePlayable(ctx, 'knight');
  ctx.s.players[ctx.seat].knightsPlayed++;
  updateLargestArmy(ctx, ctx.seat);
  ctx.s.pending.push({ kind: 'robber', seat: ctx.seat, reason: 'knight' });
}

export function playRoadBuilding(ctx: Ctx): void {
  assertRule(freeRouteLeft(ctx.s, ctx.seat), 'You have nowhere to build a road');
  takePlayable(ctx, 'roadBuilding');
  ctx.s.pending.push({ kind: 'freeRoads', seat: ctx.seat, count: freeRouteCount(ctx.s, ctx.seat) });
}

export function playYearOfPlenty(ctx: Ctx, resources: Resource[]): void {
  assertRule(Array.isArray(resources) && resources.length === 2 && resources.every(isResource), 'Pick two resources');
  const s = ctx.s;
  const want: Partial<Record<Resource, number>> = {};
  for (const r of resources) want[r] = (want[r] ?? 0) + 1;
  for (const r of RESOURCES) assertRule((want[r] ?? 0) <= s.bank[r], `The bank doesn't have enough ${r}`);
  takePlayable(ctx, 'yearOfPlenty');
  transfer(s.bank, s.players[ctx.seat].hand, want);
  emit(ctx, { type: 'received', seat: ctx.seat, cards: want, reason: 'yearOfPlenty' });
}

export function playMonopoly(ctx: Ctx, resource: Resource): void {
  assertRule(isResource(resource), 'Pick a resource');
  takePlayable(ctx, 'monopoly');
  const s = ctx.s;
  let total = 0;
  s.players.forEach((p, seat) => {
    if (seat === ctx.seat) return;
    total += p.hand[resource];
    s.players[ctx.seat].hand[resource] += p.hand[resource];
    p.hand[resource] = 0;
  });
  emit(ctx, { type: 'monopoly', seat: ctx.seat, card: resource, total });
}
