import {
  BLACK_FOREST_FOG,
  BLACK_FOREST_FOG_TOKENS,
  BLACK_FOREST_TOKENS,
  HARBOR_COAST_SLOTS,
  HARBOR_KINDS,
  LARGE_HARBOR_KINDS,
  LARGE_NUMBER_TOKENS,
  LARGE_TERRAIN_COUNTS,
  NUMBER_TOKENS,
  TERRAIN_COUNTS,
} from '../constants';
import { shuffle, type RngHolder } from '../rng';
import type { Board, HarborKind, Hex, MapId, Terrain } from '../types';
import { BLACK_FOREST_HEX_COORDS, LARGE_HEX_COORDS, STANDARD_HEX_COORDS, getTopology, type HexCoord, type Topology } from './topology';

interface MapSpec {
  coords: readonly HexCoord[];
  terrains: Record<Terrain, number>;
  tokens: readonly number[];
  harbors: readonly HarborKind[];
  /** Harbor positions as indices into the clockwise coast; spread evenly when omitted. */
  slots?: readonly number[];
}

const MAPS: Record<Exclude<MapId, 'blackForest'>, MapSpec> = {
  standard: { coords: STANDARD_HEX_COORDS, terrains: TERRAIN_COUNTS, tokens: NUMBER_TOKENS, harbors: HARBOR_KINDS, slots: HARBOR_COAST_SLOTS },
  large: { coords: LARGE_HEX_COORDS, terrains: LARGE_TERRAIN_COUNTS, tokens: LARGE_NUMBER_TOKENS, harbors: LARGE_HARBOR_KINDS },
};

/** `k` coast edges spread evenly around the island, nudged so no two harbors share a corner. */
function spreadHarborEdges(topo: Topology, k: number): number[] {
  const n = topo.coast.length;
  const taken = new Set<number>();
  const out: number[] = [];
  for (let i = 0; i < k; i++) {
    const ideal = Math.round((i * n) / k);
    for (let d = 0; d < n; d++) {
      const edge = topo.coast[(ideal + (d % 2 ? -(d + 1) / 2 : d / 2) + n) % n];
      const { a, b } = topo.edges[edge];
      if (taken.has(a) || taken.has(b)) continue;
      taken.add(a).add(b);
      out.push(edge);
      break;
    }
  }
  return out;
}

const isRed = (t: number | null) => t === 6 || t === 8;

/** No neighbouring 6/8 and, unless `allowEqual`, no neighbouring equal numbers. */
function tokensValid(topo: Topology, tokens: (number | null)[], allowEqual = false): boolean {
  for (const h of topo.hexes) {
    const t = tokens[h.id];
    if (t === null) continue;
    for (const n of h.neighbors) {
      const u = tokens[n];
      if (u === null) continue;
      if (t === u && !allowEqual) return false;
      if (isRed(t) && isRed(u)) return false;
    }
  }
  return true;
}

/**
 * Black Forest: the desert island sits in a lake; ring 2 and the sides of ring 3 are visible forest,
 * while ring 3's corners and all of ring 4 hide the other resources and two gold fields under fog.
 * Six 2:1 lumber harbors line the lake shore.
 */
function blackForestBoard(rng: RngHolder): Board {
  const topo = getTopology(BLACK_FOREST_HEX_COORDS);
  const ring = (h: HexCoord) => Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r));
  // The six hexes of a ring that lie straight out from the centre.
  const straight = (h: HexCoord) => h.q === 0 || h.r === 0 || h.q + h.r === 0;
  const visible = topo.hexes.filter((h) => ring(h) === 2 || (ring(h) === 3 && !straight(h))).map((h) => h.id);
  const fogged = topo.hexes.filter((h) => ring(h) === 4 || (ring(h) === 3 && straight(h))).map((h) => h.id);

  const terrains: Terrain[] = topo.hexes.map(() => 'desert');
  for (const id of visible) terrains[id] = 'forest';
  const hidden: Terrain[] = [];
  for (const [terrain, count] of Object.entries(BLACK_FOREST_FOG) as [Terrain, number][]) {
    for (let i = 0; i < count; i++) hidden.push(terrain);
  }
  shuffle(rng, hidden);
  fogged.forEach((id, i) => (terrains[id] = hidden[i]));

  // Gold is always a 6 or an 8. With this many numbers only the 6s and 8s are kept apart.
  let tokens: (number | null)[] = [];
  for (let attempt = 0; attempt < 5000; attempt++) {
    tokens = topo.hexes.map(() => null);
    const forest = shuffle(rng, [...BLACK_FOREST_TOKENS]);
    visible.forEach((id, i) => (tokens[id] = forest[i]));
    const fog = shuffle(rng, [...BLACK_FOREST_FOG_TOKENS]);
    let k = 0;
    for (const id of fogged) tokens[id] = terrains[id] === 'gold' ? shuffle(rng, [6, 8])[0] : fog[k++];
    if (tokensValid(topo, tokens, true)) break;
  }

  const hexes: Hex[] = topo.hexes.map((h) => ({ id: h.id, q: h.q, r: h.r, terrain: terrains[h.id], token: tokens[h.id] }));
  for (const id of fogged) hexes[id].fog = true;

  // Each harbor sits on the lake-facing edge of a ring-2 hex straight out from the centre.
  const dist = (e: number) => Math.hypot(topo.edges[e].x, topo.edges[e].y);
  const harbors = topo.hexes
    .filter((h) => ring(h) === 2 && straight(h))
    .map((h) => ({ edge: h.edges.reduce((best, e) => (dist(e) < dist(best) ? e : best)), kind: 'lumber' as const }));

  return { hexes, harbors };
}

/** Random "balanced" board for a map: no adjacent 6/8 and no adjacent equal numbers. */
export function generateBoard(rng: RngHolder, map: MapId = 'standard'): Board {
  if (map === 'blackForest') return blackForestBoard(rng);
  const spec = MAPS[map];
  const topo = getTopology(spec.coords);

  const terrains: Terrain[] = [];
  for (const [terrain, count] of Object.entries(spec.terrains) as [Terrain, number][]) {
    for (let i = 0; i < count; i++) terrains.push(terrain);
  }
  shuffle(rng, terrains);

  const landIds = topo.hexes.filter((h) => terrains[h.id] !== 'desert').map((h) => h.id);
  let tokens: (number | null)[] = [];
  for (let attempt = 0; attempt < 5000; attempt++) {
    const bag = shuffle(rng, [...spec.tokens]);
    tokens = topo.hexes.map(() => null);
    landIds.forEach((id, i) => (tokens[id] = bag[i]));
    if (tokensValid(topo, tokens)) break;
  }

  const hexes: Hex[] = topo.hexes.map((h) => ({
    id: h.id,
    q: h.q,
    r: h.r,
    terrain: terrains[h.id],
    token: tokens[h.id],
  }));

  const kinds = shuffle(rng, [...spec.harbors]);
  const edges = spec.slots ? spec.slots.map((slot) => topo.coast[slot]) : spreadHarborEdges(topo, kinds.length);
  const harbors = edges.map((edge, i) => ({ edge, kind: kinds[i] }));

  return { hexes, harbors };
}
