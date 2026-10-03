import { TERRAIN_RESOURCE } from '../constants';
import { assertRule } from '../errors';
import { compactHand, emptyHand } from '../hand';
import { canPlaceSettlement, legalSetupRoads, legalSetupShips } from '../queries';
import { emit, type Ctx } from '../state';
import { revealAround } from './fog';
import { collectTreasures } from './treasure';
import { islandsAt } from '../board/sea';

/** Islands where the seat placed its starting buildings. */
function homeIslandsOf(ctx: Ctx, seat: number): number[] {
  const out = new Set<number>();
  ctx.s.buildings.forEach((b, v) => {
    if (b?.owner === seat) for (const i of islandsAt(ctx.s.board, ctx.topo, v)) out.add(i);
  });
  return [...out].sort((a, b) => a - b);
}

function requireSetupTurn(ctx: Ctx, placing: 'settlement' | 'road'): void {
  const setup = ctx.s.setup;
  assertRule(ctx.s.phase === 'setup' && setup, 'Not in the setup phase');
  assertRule(setup.order[setup.index] === ctx.seat, "It's not your turn to place");
  assertRule(setup.placing === placing, placing === 'road' ? 'Place a settlement first' : 'Place your road first');
}

/** Snake setup: settlement (round 2 in C&K: a city) then an adjacent road. Round 2 pays out. */
export function setupSettlement(ctx: Ctx, vertex: number): void {
  requireSetupTurn(ctx, 'settlement');
  const s = ctx.s;
  const setup = s.setup!;
  assertRule(canPlaceSettlement(s, ctx.seat, vertex, true), 'You cannot build there');
  const secondRound = setup.index >= s.players.length;
  const city = s.mode === 'ck' && secondRound;
  s.buildings[vertex] = { owner: ctx.seat, city, wall: false, metropolis: null };
  emit(ctx, { type: 'built', seat: ctx.seat, piece: city ? 'city' : 'settlement', at: vertex, free: true });
  revealAround(ctx, [vertex]);

  if (secondRound) {
    const gain = emptyHand();
    for (const h of ctx.topo.vertices[vertex].hexes) {
      const res = TERRAIN_RESOURCE[s.board.hexes[h].terrain];
      if (res && s.bank[res] > 0) {
        s.bank[res]--;
        gain[res]++;
      }
    }
    const p = s.players[ctx.seat];
    for (const [card, n] of Object.entries(gain) as [keyof typeof gain, number][]) p.hand[card] += n;
    emit(ctx, { type: 'received', seat: ctx.seat, cards: compactHand(gain), reason: 'setup' });
  }
  setup.placing = 'road';
  setup.lastVertex = vertex;
}

export function setupRoad(ctx: Ctx, edge: number): void {
  requireSetupTurn(ctx, 'road');
  const s = ctx.s;
  const setup = s.setup!;
  assertRule(legalSetupRoads(s).includes(edge), 'The road must touch the settlement you just placed');
  s.roads[edge] = ctx.seat;
  emit(ctx, { type: 'built', seat: ctx.seat, piece: 'road', at: edge, free: true });
  finishSetupRoute(ctx, edge);
  collectTreasures(ctx, edge);
}

/** Voyagers: a coastal starting settlement may launch a ship instead of a road. */
export function setupShip(ctx: Ctx, edge: number): void {
  requireSetupTurn(ctx, 'road');
  const s = ctx.s;
  assertRule(legalSetupShips(s).includes(edge), 'The ship must leave the settlement you just placed');
  s.ships[edge] = ctx.seat;
  emit(ctx, { type: 'built', seat: ctx.seat, piece: 'ship', at: edge, free: true });
  finishSetupRoute(ctx, edge);
  collectTreasures(ctx, edge);
}

function finishSetupRoute(ctx: Ctx, edge: number): void {
  const s = ctx.s;
  const setup = s.setup!;
  revealAround(ctx, [ctx.topo.edges[edge].a, ctx.topo.edges[edge].b]);

  setup.index++;
  setup.placing = 'settlement';
  setup.lastVertex = null;
  if (setup.index >= setup.order.length) {
    s.homeIslands = s.players.map((_, seat) => homeIslandsOf(ctx, seat));
    s.phase = 'play';
    s.setup = null;
    s.turn = { ...s.turn, seat: 0, n: 1, rolled: false, dice: null, devPlayed: false };
    emit(ctx, { type: 'turnStarted', seat: 0, n: 1 });
  } else {
    s.turn.seat = setup.order[setup.index];
  }
}
