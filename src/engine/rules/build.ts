import { COSTS } from '../constants';
import { assertRule } from '../errors';
import { transfer } from '../hand';
import { canPlaceRoad, canPlaceSettlement, canPlaceShip, freeRouteLeft, movableShips, piecesLeft } from '../queries';
import { emit, type Ctx } from '../state';
import type { PartialHand, Prompt } from '../types';
import { removePrompt, requireRolled } from './common';
import { islandPoints } from '../vp';
import { revealAround } from './fog';
import { collectTreasures } from './treasure';

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

export function buildShip(ctx: Ctx, edge: number): void {
  requireRolled(ctx);
  assertRule(piecesLeft(ctx.s, ctx.seat).ships > 0, 'No ships left');
  assertRule(canPlaceShip(ctx.s, ctx.seat, edge), 'You cannot build a ship there');
  pay(ctx, COSTS.ship, 'ship');
  ctx.s.ships[edge] = ctx.seat;
  ctx.s.turn.shipsBuilt.push(edge);
  emit(ctx, { type: 'built', seat: ctx.seat, piece: 'ship', at: edge });
  revealRoad(ctx, edge);
  collectTreasures(ctx, edge);
}

/** One ship per turn, never one built this turn; it re-enters play as if newly placed. */
export function moveShip(ctx: Ctx, from: number, to: number): void {
  requireRolled(ctx);
  const { s, seat } = ctx;
  assertRule(!s.turn.shipsMoved, 'You already moved a ship this turn');
  assertRule(s.ships[from] === seat, 'Pick one of your ships');
  assertRule(!s.turn.shipsBuilt.includes(from), 'A new ship cannot sail on the turn it was built');
  assertRule(movableShips(s, seat).includes(from), 'That ship is part of a connected route');
  s.ships[from] = null;
  assertRule(from !== to && canPlaceShip(s, seat, to), 'You cannot sail the ship there');
  s.ships[to] = seat;
  s.turn.shipsMoved = true;
  s.turn.shipsBuilt.push(to);
  emit(ctx, { type: 'shipMoved', seat, from, to });
  revealRoad(ctx, to);
  collectTreasures(ctx, to);
}

/** Free road from Road Building (classic dev card or C&K progress card). */
export function placeFreeRoad(ctx: Ctx, prompt: Extract<Prompt, { kind: 'freeRoads' }>, edge: number): void {
  assertRule(canPlaceRoad(ctx.s, ctx.seat, edge), 'You cannot build a road there');
  ctx.s.roads[edge] = ctx.seat;
  emit(ctx, { type: 'built', seat: ctx.seat, piece: 'road', at: edge, free: true });
  revealRoad(ctx, edge);
  endFreeRoute(ctx, prompt);
}

/** Voyagers: each free Road Building piece may be a ship instead. */
export function placeFreeShip(ctx: Ctx, prompt: Extract<Prompt, { kind: 'freeRoads' }>, edge: number): void {
  assertRule(piecesLeft(ctx.s, ctx.seat).ships > 0, 'No ships left');
  assertRule(canPlaceShip(ctx.s, ctx.seat, edge), 'You cannot build a ship there');
  ctx.s.ships[edge] = ctx.seat;
  ctx.s.turn.shipsBuilt.push(edge);
  emit(ctx, { type: 'built', seat: ctx.seat, piece: 'ship', at: edge, free: true });
  revealRoad(ctx, edge);
  endFreeRoute(ctx, prompt);
  collectTreasures(ctx, edge);
}

function endFreeRoute(ctx: Ctx, prompt: Extract<Prompt, { kind: 'freeRoads' }>): void {
  prompt.count--;
  if (prompt.count <= 0 || !freeRouteLeft(ctx.s, ctx.seat)) removePrompt(ctx, prompt);
}

export function buildSettlement(ctx: Ctx, vertex: number): void {
  requireRolled(ctx);
  assertRule(piecesLeft(ctx.s, ctx.seat).settlements > 0, 'No settlements left');
  assertRule(canPlaceSettlement(ctx.s, ctx.seat, vertex), 'You cannot build a settlement there');
  pay(ctx, COSTS.settlement, 'settlement');
  const before = islandPoints(ctx.s, ctx.seat);
  ctx.s.buildings[vertex] = { owner: ctx.seat, city: false, wall: false, metropolis: null };
  emit(ctx, { type: 'built', seat: ctx.seat, piece: 'settlement', at: vertex });
  const gained = islandPoints(ctx.s, ctx.seat) - before;
  if (gained > 0) emit(ctx, { type: 'islandSettled', seat: ctx.seat, at: vertex, vp: gained });
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
