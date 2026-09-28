/** Knight and wall helpers shared by C&K actions and progress cards. */
import { COSTS } from '../constants';
import { assertRule } from '../errors';
import { transfer } from '../hand';
import { emit, type Ctx } from '../state';
import type { Knight, KnightLevel } from '../types';
import { promotableKnights, relocationSpots, wallSpots } from './queries';

export function promoteKnightAt(ctx: Ctx, vertex: number, free = false): void {
  const s = ctx.s;
  assertRule(promotableKnights(s, ctx.seat).includes(vertex), 'That knight cannot be promoted right now');
  if (!free) transfer(s.players[ctx.seat].hand, s.bank, COSTS.promote, 'Not enough resources to promote a knight');
  const k = s.knights[vertex]!;
  k.level = (k.level + 1) as KnightLevel;
  k.promotedOn = s.turn.n;
  emit(ctx, { type: 'knightPromoted', seat: ctx.seat, at: vertex, level: k.level });
}

/** The displaced knight's owner must move it; with nowhere to go it is lost. */
export function displaceKnight(ctx: Ctx, from: number, knight: Knight): void {
  const s = ctx.s;
  if (relocationSpots(s, knight.owner, from).length) s.pending.push({ kind: 'relocateKnight', seat: knight.owner, from, knight });
  else emit(ctx, { type: 'knightRemoved', seat: knight.owner, at: from });
}

export function buildWallAt(ctx: Ctx, vertex: number, free = false): void {
  const s = ctx.s;
  assertRule(wallSpots(s, ctx.seat).includes(vertex), 'Walls go around one of your cities (max 3)');
  if (!free) transfer(s.players[ctx.seat].hand, s.bank, COSTS.wall, 'Not enough resources to build a city wall');
  s.buildings[vertex]!.wall = true;
  emit(ctx, { type: 'built', seat: ctx.seat, piece: 'wall', at: vertex, free });
}
