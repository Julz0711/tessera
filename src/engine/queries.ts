/**
 * Read-only rule queries. They accept anything shaped like the public part of the game state,
 * so the client can call them on a redacted PlayerView to highlight legal moves.
 */
import { getTopology, type Topology } from './board/topology';
import { KNIGHTS_PER_LEVEL, PIECE_LIMITS, TERRAIN_RESOURCE } from './constants';
import { handTotal } from './hand';
import {
  isResource,
  type Card,
  type GameState,
  type HarborKind,
  type KnightLevel,
} from './types';

export type Q = Pick<
  GameState,
  | 'mode'
  | 'settings'
  | 'board'
  | 'players'
  | 'buildings'
  | 'roads'
  | 'knights'
  | 'robber'
  | 'merchant'
  | 'barbarian'
  | 'metropolis'
  | 'phase'
  | 'setup'
  | 'turn'
  | 'pending'
  | 'trades'
  | 'longestRoad'
  | 'largestArmy'
>;

export const topo = (s: Pick<GameState, 'board'>): Topology => getTopology(s.board.hexes);

// ── Occupancy ───────────────────────────────────────────────────────────────

/** True when an opponent's building or knight stands on the vertex (blocks roads and road length). */
export function blockedFor(s: Q, seat: number, v: number): boolean {
  const b = s.buildings[v];
  if (b && b.owner !== seat) return true;
  const k = s.knights[v];
  return !!k && k.owner !== seat;
}

export function distanceRuleOk(s: Q, v: number): boolean {
  const t = topo(s);
  if (s.buildings[v]) return false;
  return t.vertices[v].vertices.every((n) => !s.buildings[n]);
}

export function touchesOwnRoad(s: Q, seat: number, v: number): boolean {
  return topo(s).vertices[v].edges.some((e) => s.roads[e] === seat);
}

// ── Pieces ──────────────────────────────────────────────────────────────────

export interface PieceCount {
  roads: number;
  settlements: number;
  cities: number;
  walls: number;
  knights: Record<KnightLevel, number>;
}

export function piecesUsed(s: Q, seat: number): PieceCount {
  const out: PieceCount = { roads: 0, settlements: 0, cities: 0, walls: 0, knights: { 1: 0, 2: 0, 3: 0 } };
  for (const r of s.roads) if (r === seat) out.roads++;
  for (const b of s.buildings) {
    if (!b || b.owner !== seat) continue;
    if (b.city) out.cities++;
    else out.settlements++;
    if (b.wall) out.walls++;
  }
  for (const k of s.knights) if (k && k.owner === seat) out.knights[k.level]++;
  return out;
}

export function piecesLeft(s: Q, seat: number): PieceCount {
  const used = piecesUsed(s, seat);
  return {
    roads: PIECE_LIMITS.road - used.roads,
    settlements: PIECE_LIMITS.settlement - used.settlements,
    cities: PIECE_LIMITS.city - used.cities,
    walls: PIECE_LIMITS.wall - used.walls,
    knights: {
      1: KNIGHTS_PER_LEVEL[1] - used.knights[1],
      2: KNIGHTS_PER_LEVEL[2] - used.knights[2],
      3: KNIGHTS_PER_LEVEL[3] - used.knights[3],
    },
  };
}

// ── Placement legality ──────────────────────────────────────────────────────

export const isVertex = (s: Q, v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) < s.buildings.length;
export const isEdge = (s: Q, e: unknown): e is number =>
  Number.isInteger(e) && (e as number) >= 0 && (e as number) < s.roads.length;
export const isHex = (s: Q, h: unknown): h is number =>
  Number.isInteger(h) && (h as number) >= 0 && (h as number) < s.board.hexes.length;

export function canPlaceSettlement(s: Q, seat: number, v: number, setup = false): boolean {
  if (!isVertex(s, v)) return false;
  if (s.knights[v]) return false;
  if (!distanceRuleOk(s, v)) return false;
  return setup || touchesOwnRoad(s, seat, v);
}

export function legalSettlementSpots(s: Q, seat: number, setup = false): number[] {
  const out: number[] = [];
  for (let v = 0; v < s.buildings.length; v++) if (canPlaceSettlement(s, seat, v, setup)) out.push(v);
  return out;
}

/** A road may extend from an own building, or from an own road through a vertex no opponent occupies. */
export function canPlaceRoad(s: Q, seat: number, e: number): boolean {
  if (!isEdge(s, e) || s.roads[e] !== null) return false;
  const t = topo(s);
  const edge = t.edges[e];
  for (const v of [edge.a, edge.b]) {
    const b = s.buildings[v];
    if (b && b.owner === seat) return true;
    if (blockedFor(s, seat, v)) continue;
    if (t.vertices[v].edges.some((other) => other !== e && s.roads[other] === seat)) return true;
  }
  return false;
}

export function legalRoadSpots(s: Q, seat: number): number[] {
  const out: number[] = [];
  for (let e = 0; e < s.roads.length; e++) if (canPlaceRoad(s, seat, e)) out.push(e);
  return out;
}

export function legalSetupRoads(s: Q): number[] {
  if (!s.setup || s.setup.placing !== 'road' || s.setup.lastVertex === null) return [];
  return topo(s).vertices[s.setup.lastVertex].edges.filter((e) => s.roads[e] === null);
}

export function legalCitySpots(s: Q, seat: number): number[] {
  const out: number[] = [];
  s.buildings.forEach((b, v) => {
    if (b && b.owner === seat && !b.city) out.push(v);
  });
  return out;
}

// ── Trading ─────────────────────────────────────────────────────────────────

export function harborKinds(s: Q, seat: number): Set<HarborKind> {
  const t = topo(s);
  const kinds = new Set<HarborKind>();
  for (const h of s.board.harbors) {
    const e = t.edges[h.edge];
    for (const v of [e.a, e.b]) {
      const b = s.buildings[v];
      if (b && b.owner === seat) kinds.add(h.kind);
    }
  }
  return kinds;
}

/** How many of `card` the seat must give the bank for one card of their choice. */
export function bankRatio(s: Q, seat: number, card: Card): number {
  const kinds = harborKinds(s, seat);
  let ratio = 4;
  if (isResource(card)) {
    if (kinds.has(card)) ratio = 2;
    else if (kinds.has('any')) ratio = 3;
    if (s.mode === 'ck' && s.merchant && s.merchant.owner === seat) {
      const hex = s.board.hexes[s.merchant.hex];
      if (TERRAIN_RESOURCE[hex.terrain] === card) ratio = 2;
    }
  } else {
    if (kinds.has('any')) ratio = 3;
    if (s.players[seat].improvements.trade >= 3) ratio = 2;
  }
  if (s.turn.seat === seat && s.turn.merchantFleet.includes(card)) ratio = Math.min(ratio, 2);
  return ratio;
}

// ── Robber ──────────────────────────────────────────────────────────────────

/** Card count that works on full states and on redacted views (which carry `handCount`). */
export function cardCount(p: Q['players'][number]): number {
  const counted = (p as { handCount?: number }).handCount;
  return typeof counted === 'number' ? counted : handTotal(p.hand);
}

export function robberVictims(s: Q, seat: number, hex: number): number[] {
  const t = topo(s);
  const out = new Set<number>();
  for (const v of t.hexes[hex].vertices) {
    const b = s.buildings[v];
    if (b && b.owner !== seat && cardCount(s.players[b.owner]) > 0) out.add(b.owner);
  }
  return [...out].sort((a, b) => a - b);
}

/** Owners (other than `seat`) with a building on the hex, regardless of hand size. */
export function hexNeighbours(s: Q, seat: number, hex: number): number[] {
  const t = topo(s);
  const out = new Set<number>();
  for (const v of t.hexes[hex].vertices) {
    const b = s.buildings[v];
    if (b && b.owner !== seat) out.add(b.owner);
  }
  return [...out];
}

export function robberTargets(s: Q, seat: number, publicVP: (seat: number) => number): number[] {
  const all = s.board.hexes.map((h) => h.id).filter((id) => id !== s.robber);
  if (!s.settings.friendlyRobber) return all;
  const friendly = all.filter((hex) => hexNeighbours(s, seat, hex).every((o) => publicVP(o) > 2));
  return friendly.length ? friendly : all;
}

// ── Misc ────────────────────────────────────────────────────────────────────

export function handLimit(s: Q, seat: number): number {
  if (s.mode !== 'ck') return s.settings.discardLimit;
  return s.settings.discardLimit + 2 * piecesUsed(s, seat).walls;
}

/** Seats that currently owe the game a decision (not counting trade responses). */
export function actorsFor(s: Q): number[] {
  if (s.phase === 'ended') return [];
  if (s.pending.length) return [...new Set(s.pending.map((p) => p.seat))];
  return [s.turn.seat];
}

/** Trade offers still waiting on a response from `seat`. */
export function tradesAwaiting(s: Q, seat: number): number[] {
  return s.trades
    .filter((t) => t.from !== seat && t.to.includes(seat) && !t.accepted.includes(seat) && !t.declined.includes(seat))
    .map((t) => t.id);
}
