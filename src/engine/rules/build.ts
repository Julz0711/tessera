import { COSTS } from '../constants';
import { assertRule } from '../errors';
import { transfer } from '../hand';
import { canPlaceRoad, canPlaceSettlement, legalRoadSpots, piecesLeft } from '../queries';
import { emit, type Ctx } from '../state';
import type { PartialHand, Prompt } from '../types';
import { removePrompt, requireRolled } from './common';
import { revealAround } from './fog';

function revealRoad(ctx: Ctx, edge: number): void {
  const { a, b } = ctx.topo.edges[edge];
  revealAround(ctx, [a, b]);
}

function pay(ctx: Ctx, cost: PartialHand, what: string): void {
  transfer(ctx.s.players[ctx.seat].hand, ctx.s.bank, cost, `Not enough resources for a ${what}`);
}

export function buildRoad(ctx: Ctx, edge: number): void {
  requireRolled(ctx);
  assertRule(piecesLeft(ctx.s, ctx.seat).roads > 0, 'No roads left');
  assertRule(canPlaceRoad(ctx.s, ctx.seat, edge), 'You cannot build a road there');
  pay(ctx, COSTS.road, 'road');
  ctx.s.roads[edge] = ctx.seat;
  emit(ctx, { type: 'built', seat: ctx.seat, piece: 'road', at: edge });
  revealRoad(ctx, edge);
}

/** Free road from Road Building (classic dev card or C&K progress card). */
export function placeFreeRoad(ctx: Ctx, prompt: Extract<Prompt, { kind: 'freeRoads' }>, edge: number): void {
  assertRule(canPlaceRoad(ctx.s, ctx.seat, edge), 'You cannot build a road there');
  ctx.s.roads[edge] = ctx.seat;
  emit(ctx, { type: 'built', seat: ctx.seat, piece: 'road', at: edge, free: true });
  revealRoad(ctx, edge);
  prompt.count--;
  if (prompt.count <= 0 || piecesLeft(ctx.s, ctx.seat).roads <= 0 || !legalRoadSpots(ctx.s, ctx.seat).length) {
    removePrompt(ctx, prompt);
  }
}

export function buildSettlement(ctx: Ctx, vertex: number): void {
  requireRolled(ctx);
  assertRule(piecesLeft(ctx.s, ctx.seat).settlements > 0, 'No settlements left');
  assertRule(canPlaceSettlement(ctx.s, ctx.seat, vertex), 'You cannot build a settlement there');
  pay(ctx, COSTS.settlement, 'settlement');
  ctx.s.buildings[vertex] = { owner: ctx.seat, city: false, wall: false, metropolis: null };
  emit(ctx, { type: 'built', seat: ctx.seat, piece: 'settlement', at: vertex });
  revealAround(ctx, [vertex]);
}

export function upgradeToCity(ctx: Ctx, vertex: number, cost: PartialHand): void {
  const b = ctx.s.buildings[vertex];
  assertRule(b && b.owner === ctx.seat && !b.city, 'You need one of your settlements there');
  assertRule(piecesLeft(ctx.s, ctx.seat).cities > 0, 'No cities left');
  pay(ctx, cost, 'city');
  b.city = true;
  emit(ctx, { type: 'built', seat: ctx.seat, piece: 'city', at: vertex });
}

export function buildCity(ctx: Ctx, vertex: number): void {
  requireRolled(ctx);
  upgradeToCity(ctx, vertex, COSTS.city);
}
