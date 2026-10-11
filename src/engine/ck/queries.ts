/** Read-only Cities & Knights rule queries (usable on full states and redacted views). */
import { ABILITY_LEVEL, MAX_IMPROVEMENT, METROPOLIS_LEVEL, TERRAIN_RESOURCE, TRACK_COMMODITY } from '../constants';
import { blockedFor, legalRoadSpots, piecesLeft, robberTargets, shipDestinations, topo, touchesOwnRoute, type Q } from '../queries';
import type { KnightLevel, Track } from '../types';
import { victoryPoints } from '../vp';

export function isVertexFree(s: Q, v: number): boolean {
  return !s.buildings[v] && !s.knights[v];
}

/**
 * Empty intersections touching the seat's roads or (Voyagers) ships, where knights can be recruited
 * or relocated. With the sea, knights stand along shipping routes too, as in the combined rules.
 */
export function legalKnightSpots(s: Q, seat: number): number[] {
  const out: number[] = [];
  for (let v = 0; v < s.buildings.length; v++) if (isVertexFree(s, v) && touchesOwnRoute(s, seat, v)) out.push(v);
  return out;
}

export function ownKnightAt(s: Q, seat: number, v: number) {
  const k = s.knights[v];
  return k && k.owner === seat ? k : null;
}

/** An active knight that wasn't activated this turn may move, displace or chase the robber. */
export function canKnightAct(s: Q, seat: number, v: number): boolean {
  const k = ownKnightAt(s, seat, v);
  return !!k && k.active && k.activatedOn < s.turn.n;
}

/**
 * Intersections a knight can reach along its owner's roads and ships. It may pass its owner's
 * pieces but not opponents' buildings or knights.
 */
export function knightReach(s: Q, seat: number, from: number): Set<number> {
  const t = topo(s);
  const seen = new Set<number>([from]);
  const queue = [from];
  while (queue.length) {
    const v = queue.shift()!;
    if (v !== from && blockedFor(s, seat, v)) continue;
    for (const e of t.vertices[v].edges) {
      if (s.roads[e] !== seat && s.ships[e] !== seat) continue;
      const edge = t.edges[e];
      const w = edge.a === v ? edge.b : edge.a;
      if (!seen.has(w)) {
        seen.add(w);
        queue.push(w);
      }
    }
  }
  seen.delete(from);
  return seen;
}

export function knightMoveTargets(s: Q, seat: number, from: number): { moves: number[]; displaces: number[] } {
  const knight = ownKnightAt(s, seat, from);
  const moves: number[] = [];
  const displaces: number[] = [];
  if (!knight) return { moves, displaces };
  for (const v of knightReach(s, seat, from)) {
    if (s.buildings[v]) continue;
    const other = s.knights[v];
    if (!other) moves.push(v);
    else if (other.owner !== seat && other.level < knight.level) displaces.push(v);
  }
  return { moves, displaces };
}

/**
 * Where the owner may move a knight displaced from `from`: an empty intersection their roads connect
 * to that spot, reached the way a knight moves. Never `from` itself: a displaced knight must leave,
 * even when no knight took its place (Intrigue).
 */
export function relocationSpots(s: Q, seat: number, from: number): number[] {
  return [...knightReach(s, seat, from)].filter((v) => isVertexFree(s, v));
}

export function robberActive(s: Q): boolean {
  return s.barbarian.attacks > 0;
}

/** Own actionable knights on a corner of the robber's hex: they chase it to a land hex. */
export function chaseRobberKnights(s: Q, seat: number): number[] {
  if (!robberActive(s)) return [];
  return topo(s).hexes[s.robber].vertices.filter((v) => canKnightAct(s, seat, v));
}

/** Voyagers: own actionable knights on a corner of the pirate's hex: they chase it to another sea hex. */
export function chasePirateKnights(s: Q, seat: number): number[] {
  if (!robberActive(s) || s.pirate == null) return [];
  return topo(s).hexes[s.pirate].vertices.filter((v) => canKnightAct(s, seat, v));
}

/** Own actionable knights beside the robber or the pirate. */
export function chaseKnights(s: Q, seat: number): number[] {
  return [...new Set([...chaseRobberKnights(s, seat), ...chasePirateKnights(s, seat)])];
}

/** Hexes a knight at `vertex` may chase to: land for the robber, sea for the pirate, by what it stands beside. */
export function chaseTargets(s: Q, seat: number, vertex: number, publicVP: (seat: number) => number): number[] {
  const land = chaseRobberKnights(s, seat).includes(vertex);
  const sea = chasePirateKnights(s, seat).includes(vertex);
  return robberTargets(s, seat, publicVP, sea).filter((h) => (s.board.hexes[h].terrain === 'sea' ? sea : land));
}

export function activatableKnights(s: Q, seat: number): number[] {
  const out: number[] = [];
  s.knights.forEach((k, v) => {
    if (k && k.owner === seat && !k.active) out.push(v);
  });
  return out;
}

export function promotableKnights(s: Q, seat: number, ignorePromotedThisTurn = false): number[] {
  const left = piecesLeft(s, seat).knights;
  const fortress = s.players[seat].improvements.politics >= ABILITY_LEVEL;
  const out: number[] = [];
  s.knights.forEach((k, v) => {
    if (!k || k.owner !== seat || k.level >= 3) return;
    if (!ignorePromotedThisTurn && k.promotedOn === s.turn.n) return;
    const next = (k.level + 1) as KnightLevel;
    if (next === 3 && !fortress) return;
    if (left[next] <= 0) return;
    out.push(v);
  });
  return out;
}

/**
 * Smith: whether these knights (each going up one level) can all be promoted together. They're
 * judged as a set, highest level first: a strong knight turning mighty hands its strong piece back,
 * which a basic knight in the same pick can then take, whatever order they were picked in.
 */
export function smithValid(s: Q, seat: number, picks: number[]): boolean {
  if (!picks.length || picks.length > 2 || new Set(picks).size !== picks.length) return false;
  const left = { ...piecesLeft(s, seat).knights };
  const fortress = s.players[seat].improvements.politics >= ABILITY_LEVEL;
  const order = [...picks].sort((a, b) => (s.knights[b]?.level ?? 0) - (s.knights[a]?.level ?? 0));
  for (const v of order) {
    const k = s.knights[v];
    if (!k || k.owner !== seat || k.level >= 3 || k.promotedOn === s.turn.n) return false;
    const next = (k.level + 1) as KnightLevel;
    if ((next === 3 && !fortress) || left[next] <= 0) return false;
    left[next]--;
    left[k.level]++;
  }
  return true;
}

/** Smith: the order to promote a valid pick in (highest level first; see smithValid). */
export function smithOrder(s: Q, picks: number[]): number[] {
  return [...picks].sort((a, b) => (s.knights[b]?.level ?? 0) - (s.knights[a]?.level ?? 0));
}

/**
 * Smith: the knights that can join `picked` — on their own, or (for the first pick) together with
 * some second knight, so a basic knight is offered when a strong one going mighty would make room.
 */
export function smithOptions(s: Q, seat: number, picked: number[] = []): number[] {
  const own: number[] = [];
  s.knights.forEach((k, v) => {
    if (k && k.owner === seat && !picked.includes(v)) own.push(v);
  });
  return own.filter(
    (v) => smithValid(s, seat, [...picked, v]) || (picked.length === 0 && own.some((w) => w !== v && smithValid(s, seat, [v, w]))),
  );
}

export function knightStrength(s: Q, seat: number): number {
  let n = 0;
  for (const k of s.knights) if (k && k.owner === seat && k.active) n += k.level;
  return n;
}

/** Barbarian strength = number of cities (metropolises included) on the board. */
export function barbarianStrength(s: Q): number {
  return s.buildings.filter((b) => b?.city).length;
}

export function wallSpots(s: Q, seat: number): number[] {
  if (piecesLeft(s, seat).walls <= 0) return [];
  const out: number[] = [];
  s.buildings.forEach((b, v) => {
    if (b && b.owner === seat && b.city && !b.wall) out.push(v);
  });
  return out;
}

export function metropolisSpots(s: Q, seat: number): number[] {
  const out: number[] = [];
  s.buildings.forEach((b, v) => {
    if (b && b.owner === seat && b.city && !b.metropolis) out.push(v);
  });
  return out;
}

export function ownsCity(s: Q, seat: number): boolean {
  return s.buildings.some((b) => b && b.owner === seat && b.city);
}

/** Commodities needed for the next level of a track (Crane discounts one). */
export function improvementCost(s: Q, seat: number, track: Track): number {
  const level = s.players[seat].improvements[track];
  const base = level + 1;
  return Math.max(0, base - (s.turn.seat === seat && s.turn.crane ? 1 : 0));
}

/** Why the seat can't improve this track right now (null when it can). */
export function improvementBlocker(s: Q, seat: number, track: Track): string | null {
  const p = s.players[seat];
  const level = p.improvements[track];
  if (level >= MAX_IMPROVEMENT) return 'Already at the top level';
  if (!ownsCity(s, seat)) return 'You need a city to build improvements';
  const cost = improvementCost(s, seat, track);
  if (p.hand[TRACK_COMMODITY[track]] < cost) return `You need ${cost} ${TRACK_COMMODITY[track]}`;
  if (wouldGainMetropolis(s, seat, track) && !metropolisSpots(s, seat).length) return 'You need a city without a metropolis';
  return null;
}

/** Reaching level 4 first, or level 5 before the holder, wins the metropolis. */
export function wouldGainMetropolis(s: Q, seat: number, track: Track): boolean {
  const next = s.players[seat].improvements[track] + 1;
  const holder = s.metropolis[track];
  if (next < METROPOLIS_LEVEL || holder === seat) return false;
  if (holder === null) return true;
  return next === 5 && s.players[holder].improvements[track] < 5;
}

/** Hexes the merchant may go to: land hexes next to one of the seat's buildings. */
export function merchantHexes(s: Q, seat: number): number[] {
  const t = topo(s);
  return s.board.hexes
    .filter((h) => TERRAIN_RESOURCE[h.terrain] !== null && t.hexes[h.id].vertices.some((v) => s.buildings[v]?.owner === seat))
    .map((h) => h.id);
}

/** Tokens the Inventor may swap (not 2, 12, 6 or 8). */
export function inventorHexes(s: Q): number[] {
  return s.board.hexes.filter((h) => h.token !== null && !h.fog && ![2, 12, 6, 8].includes(h.token)).map((h) => h.id);
}

/**
 * Open roads and ships (Diplomat): at least one end connects to nothing else of its owner — no
 * building, knight or other road (for a ship: no other ship or road, as for sailing).
 */
export function openRoutes(s: Q): number[] {
  const t = topo(s);
  const out: number[] = [];
  t.edges.forEach((edge, e) => {
    const ship = s.ships[e] != null;
    const owner = ship ? s.ships[e] : s.roads[e];
    if (owner == null) return;
    const loose = [edge.a, edge.b].some((v) => {
      if (s.buildings[v]?.owner === owner || s.knights[v]?.owner === owner) return false;
      return !t.vertices[v].edges.some((o) => o !== e && (s.roads[o] === owner || (ship && s.ships[o] === owner)));
    });
    if (loose) out.push(e);
  });
  return out;
}

/** Diplomat on your own open road: where it can move to, i.e. anywhere a new road could go once it has left. */
export function roadMoveTargets(s: Q, seat: number, from: number): number[] {
  const roads = s.roads.slice();
  roads[from] = null;
  return legalRoadSpots({ ...s, roads }, seat).filter((e) => e !== from);
}

/** Diplomat on your own open road or ship: where it can move to (a ship only to where a new ship could go). */
export function routeMoveTargets(s: Q, seat: number, from: number): number[] {
  return s.ships[from] === seat ? shipDestinations(s, seat, from) : roadMoveTargets(s, seat, from);
}

/** Opponent knights standing on intersections that touch the seat's roads or ships (Intrigue). */
export function intrigueTargets(s: Q, seat: number): number[] {
  const out: number[] = [];
  s.knights.forEach((k, v) => {
    if (k && k.owner !== seat && touchesOwnRoute(s, seat, v)) out.push(v);
  });
  return out;
}

/**
 * Master Merchant: opponents with strictly more points than the seat (a tie isn't enough). Public
 * points on both sides, so it reads the same on a redacted view. Whether they hold cards is checked
 * when the card is played.
 */
export function masterMerchantVictims(s: Q, seat: number): number[] {
  const mine = victoryPoints(s, seat, false);
  return s.players.map((_, i) => i).filter((i) => i !== seat && victoryPoints(s, i, false) > mine);
}
