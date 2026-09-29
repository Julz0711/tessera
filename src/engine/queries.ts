/**
 * Read-only rule queries. They accept anything shaped like the public part of the game state,
 * so the client can call them on a redacted PlayerView to highlight legal moves.
 */
import { canHoldRoad, canHoldSettlement, canHoldShip } from './board/sea';
import { getTopology, type Topology } from './board/topology';
import { KNIGHTS_PER_LEVEL, PIECE_LIMITS, TERRAIN_RESOURCE } from './constants';
import { handTotal } from './hand';
import {
  isResource,
  type Card,
  type GameState,
  type HarborKind,
  type KnightLevel,
  type PartialHand,
} from './types';

export type Q = Pick<
  GameState,
  | 'mode'
  | 'settings'
  | 'board'
  | 'players'
  | 'buildings'
  | 'roads'
  | 'ships'
  | 'knights'
  | 'robber'
  | 'pirate'
  | 'homeIslands'
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

/** A settlement may stand at the end of a road or (Voyagers) a ship. */
export function touchesOwnRoute(s: Q, seat: number, v: number): boolean {
  return topo(s).vertices[v].edges.some((e) => s.roads[e] === seat || s.ships[e] === seat);
}

// ── Pieces ──────────────────────────────────────────────────────────────────

export interface PieceCount {
  roads: number;
  ships: number;
  settlements: number;
  cities: number;
  walls: number;
  knights: Record<KnightLevel, number>;
}

export function piecesUsed(s: Q, seat: number): PieceCount {
  const out: PieceCount = { roads: 0, ships: 0, settlements: 0, cities: 0, walls: 0, knights: { 1: 0, 2: 0, 3: 0 } };
  for (const r of s.roads) if (r === seat) out.roads++;
  for (const r of s.ships) if (r === seat) out.ships++;
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
    ships: PIECE_LIMITS.ship - used.ships,
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
  if (!canHoldSettlement(s.board, topo(s), v)) return false;
  if (!distanceRuleOk(s, v)) return false;
  if (setup && !startingCorner(s, v)) return false;
  return setup || touchesOwnRoute(s, seat, v);
}

/**
 * Where starting settlements may stand. Never next to fog: what it hides is found by building out
 * later (their roads may lead into it). What a starting road uncovers stays out of bounds until setup
 * is over, so every player picks from the same corners. Black Forest starts in the forest, on corners
 * touching only forest (or the lake). A map with starting areas (Vulcan) starts on any corner touching
 * one of their tiles, right up to the desert that borders them.
 */
function startingCorner(s: Q, v: number): boolean {
  const hexes = topo(s).vertices[v].hexes.map((h) => s.board.hexes[h]);
  if (hexes.some((h) => h.fog || s.setup?.fog?.includes(h.id))) return false;
  if (s.settings.map === 'blackForest') return hexes.every((h) => h.terrain === 'forest');
  if (hasStartAreas(s)) return hexes.some((h) => h.start) && hexes.every((h) => h.start || h.terrain === 'desert' || h.terrain === 'sea');
  return true;
}

/** Whether the board marks starting areas; asked once per corner, so remembered per board. */
const startAreas = new WeakMap<object, boolean>();
function hasStartAreas(s: Q): boolean {
  let known = startAreas.get(s.board.hexes);
  if (known === undefined) startAreas.set(s.board.hexes, (known = s.board.hexes.some((h) => h.start)));
  return known;
}

export function legalSettlementSpots(s: Q, seat: number, setup = false): number[] {
  const out: number[] = [];
  for (let v = 0; v < s.buildings.length; v++) if (canPlaceSettlement(s, seat, v, setup)) out.push(v);
  return out;
}

/** A road may extend from an own building, or from an own road through a vertex no opponent occupies. */
export function canPlaceRoad(s: Q, seat: number, e: number): boolean {
  if (!isEdge(s, e) || s.roads[e] !== null || s.ships[e] !== null) return false;
  const t = topo(s);
  if (!canHoldRoad(s.board, t, e)) return false;
  const edge = t.edges[e];
  for (const v of [edge.a, edge.b]) {
    const b = s.buildings[v];
    if (b && b.owner === seat) return true;
    if (blockedFor(s, seat, v)) continue;
    if (t.vertices[v].edges.some((other) => other !== e && s.roads[other] === seat)) return true;
  }
  return false;
}

/** The pirate's hex borders this edge: no ship may be placed there or sail away from there. */
export function pirateBorders(s: Q, e: number): boolean {
  return s.pirate != null && topo(s).edges[e].hexes.includes(s.pirate);
}

/** Ships exist only on maps with open water. */
export const shipsInPlay = (s: Q): boolean => s.board.hexes.some((h) => h.terrain === 'sea');

/**
 * A ship may leave an own building or extend an own ship through a vertex no opponent occupies. Roads
 * never connect it: land and sea networks meet only at a settlement or city.
 */
export function canPlaceShip(s: Q, seat: number, e: number): boolean {
  if (!shipsInPlay(s) || !isEdge(s, e) || s.roads[e] !== null || s.ships[e] !== null) return false;
  const t = topo(s);
  if (!canHoldShip(s.board, t, e)) return false;
  if (pirateBorders(s, e)) return false;
  const edge = t.edges[e];
  for (const v of [edge.a, edge.b]) {
    const b = s.buildings[v];
    if (b && b.owner === seat) return true;
    if (blockedFor(s, seat, v)) continue;
    if (t.vertices[v].edges.some((other) => other !== e && s.ships[other] === seat)) return true;
  }
  return false;
}

export function legalShipSpots(s: Q, seat: number): number[] {
  const out: number[] = [];
  for (let e = 0; e < s.ships.length; e++) if (canPlaceShip(s, seat, e)) out.push(e);
  return out;
}

/**
 * Ships that may sail: one end must touch none of the owner's other pieces, which rules out every ship
 * of a closed route (its ends meet a building or another ship) and one carrying the owner's knight.
 */
export function movableShips(s: Q, seat: number): number[] {
  const t = topo(s);
  const out: number[] = [];
  s.ships.forEach((owner, e) => {
    if (owner !== seat || pirateBorders(s, e)) return;
    const free = [t.edges[e].a, t.edges[e].b].some((v) => {
      const b = s.buildings[v];
      if (b && b.owner === seat) return false;
      if (s.knights[v]?.owner === seat) return false;
      return !t.vertices[v].edges.some((o) => o !== e && (s.ships[o] === seat || s.roads[o] === seat));
    });
    if (free) out.push(e);
  });
  return out;
}

/** Whether Road Building can still place anything: a road, or (Voyagers) a ship. */
export function freeRouteLeft(s: Q, seat: number): boolean {
  const left = piecesLeft(s, seat);
  return (left.roads > 0 && legalRoadSpots(s, seat).length > 0) || (left.ships > 0 && legalShipSpots(s, seat).length > 0);
}

/** Road Building places up to two pieces, fewer when the supply runs short. */
export function freeRouteCount(s: Q, seat: number): number {
  const left = piecesLeft(s, seat);
  return Math.min(2, left.roads + (shipsInPlay(s) ? left.ships : 0));
}

/** Ships the seat may sail this turn (none after one has sailed; never one built this turn). */
export function sailableShips(s: Q, seat: number): number[] {
  if (s.turn.shipsMoved || s.turn.seat !== seat || s.phase !== 'play' || !s.turn.rolled) return [];
  return movableShips(s, seat).filter((e) => !s.turn.shipsBuilt.includes(e));
}

/** Where the ship on `from` could sail to: anywhere a new ship could go once it has left. */
export function shipDestinations(s: Q, seat: number, from: number): number[] {
  const ships = s.ships.slice();
  ships[from] = null;
  return legalShipSpots({ ...s, ships }, seat).filter((e) => e !== from);
}

export function legalRoadSpots(s: Q, seat: number): number[] {
  const out: number[] = [];
  for (let e = 0; e < s.roads.length; e++) if (canPlaceRoad(s, seat, e)) out.push(e);
  return out;
}

/** A coastal starting settlement may launch a ship instead of its road. */
export function legalSetupShips(s: Q): number[] {
  if (!shipsInPlay(s) || !s.setup || s.setup.placing !== 'road' || s.setup.lastVertex === null) return [];
  const t = topo(s);
  return t.vertices[s.setup.lastVertex].edges.filter((e) => s.roads[e] === null && s.ships[e] === null && canHoldShip(s.board, t, e));
}

export function legalSetupRoads(s: Q): number[] {
  if (!s.setup || s.setup.placing !== 'road' || s.setup.lastVertex === null) return [];
  // Black Forest too: the settlement stands in the forest, but its road may already lead out into the fog.
  const t = topo(s);
  return t.vertices[s.setup.lastVertex].edges.filter((e) => s.roads[e] === null && s.ships[e] === null && canHoldRoad(s.board, t, e));
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

/**
 * What `give` buys from the bank at the seat's rates: each kind given must be a whole multiple of
 * its rate (4:1, or 3:1 / 2:1 with harbors); the number of cards it pays for, or an error.
 */
export function exchangeValue(s: Parameters<typeof bankRatio>[0], seat: number, give: PartialHand): { cards: number } | { error: string } {
  let cards = 0;
  for (const [c, n] of Object.entries(give) as [Card, number][]) {
    if (!n) continue;
    const ratio = bankRatio(s, seat, c);
    if (n % ratio !== 0) return { error: `Give ${c} in ${ratio}s (your rate is ${ratio}:1)` };
    cards += n / ratio;
  }
  return { cards };
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
  // The pirate robs whoever has a ship along its hex.
  if (s.board.hexes[hex].terrain === 'sea') {
    for (const e of t.hexes[hex].edges) {
      const o = s.ships[e];
      if (o !== null && o !== seat && cardCount(s.players[o]) > 0) out.add(o);
    }
    return [...out].sort((a, b) => a - b);
  }
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

/**
 * Hexes the robber (land) or, with `pirate`, the pirate (sea) may move to. Voyagers: a 7 or a knight
 * moves either one; the Bishop moves only the robber.
 */
export function robberTargets(s: Q, seat: number, publicVP: (seat: number) => number, pirate = true): number[] {
  // Fogged hexes (Black Forest) can't be targeted until they're discovered.
  const land = s.board.hexes.filter((h) => h.id !== s.robber && !h.fog && h.terrain !== 'sea').map((h) => h.id);
  const sea = pirate && s.pirate != null ? s.board.hexes.filter((h) => h.id !== s.pirate && !h.fog && h.terrain === 'sea').map((h) => h.id) : [];
  if (!s.settings.friendlyRobber) return [...land, ...sea];
  const friendly = land.filter((hex) => hexNeighbours(s, seat, hex).every((o) => publicVP(o) > 2));
  return [...(friendly.length ? friendly : land), ...sea];
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
