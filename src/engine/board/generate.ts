import {
  FOUR_LAKES_TERRAIN_COUNTS,
  GOLD_RUSH_FOG,
  GOLD_RUSH_TERRAIN_COUNTS,
  HEARTLAKE_COAST_HARBORS,
  HEARTLAKE_LAKE_HARBORS,
  HEARTLAKE_NUMBER_TOKENS,
  HEARTLAKE_TERRAIN_COUNTS,
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
  VULCAN_FOG_TERRAINS,
  VULCAN_HARBOR_KINDS,
} from '../constants';
import { randomInt, shuffle, type RngHolder } from '../rng';
import type { Board, Harbor, HarborKind, Hex, MapId, Terrain } from '../types';
import {
  BLACK_FOREST_HEX_COORDS,
  FOUR_LAKES_HEX_COORDS,
  GOLD_RUSH_HEX_COORDS,
  HEARTLAKE_HEX_COORDS,
  LARGE_HEX_COORDS,
  LONG_ISLE_HEX_COORDS,
  STANDARD_HEX_COORDS,
  VULCAN_HEX_COORDS,
  VULCAN_TILES,
  getTopology,
  type HexCoord,
  type Topology,
} from './topology';

interface MapSpec {
  coords: readonly HexCoord[];
  terrains: Record<Terrain, number>;
  tokens: readonly number[];
  harbors: readonly HarborKind[];
  /** Harbor positions as indices into the clockwise coast; spread evenly when omitted. */
  slots?: readonly number[];
  /** Places the harbors itself (for maps with an inland shore). */
  placeHarbors?: (topo: Topology, rng: RngHolder) => Harbor[];
  /** Equal numbers may sit side by side (big maps, where keeping them apart gets too tight). */
  allowEqual?: boolean;
}

const MAPS: Record<Exclude<MapId, 'blackForest' | 'goldRush' | 'vulcan'>, MapSpec> = {
  standard: { coords: STANDARD_HEX_COORDS, terrains: TERRAIN_COUNTS, tokens: NUMBER_TOKENS, harbors: HARBOR_KINDS, slots: HARBOR_COAST_SLOTS },
  large: { coords: LARGE_HEX_COORDS, terrains: LARGE_TERRAIN_COUNTS, tokens: LARGE_NUMBER_TOKENS, harbors: LARGE_HARBOR_KINDS },
  fourLakes: {
    coords: FOUR_LAKES_HEX_COORDS,
    terrains: FOUR_LAKES_TERRAIN_COUNTS,
    tokens: balancedTokens(38),
    harbors: LARGE_HARBOR_KINDS,
    allowEqual: true,
  },
  heartlake: {
    coords: HEARTLAKE_HEX_COORDS,
    terrains: HEARTLAKE_TERRAIN_COUNTS,
    tokens: HEARTLAKE_NUMBER_TOKENS,
    harbors: [],
    placeHarbors: heartlakeHarbors,
  },
  longIsle: { coords: LONG_ISLE_HEX_COORDS, terrains: TERRAIN_COUNTS, tokens: NUMBER_TOKENS, harbors: HARBOR_KINDS },
};

/**
 * Heartlake: six harbors spread around the sea coast, and three 3:1 harbors on every other
 * lake-facing edge of the inner ring (their corners never touch).
 */
function heartlakeHarbors(topo: Topology, rng: RngHolder): Harbor[] {
  const lake = (e: number) => Math.hypot(topo.edges[e].x, topo.edges[e].y) < 1.5;
  const sea = topo.coast.filter((e) => !lake(e));
  const kinds = shuffle(rng, [...HEARTLAKE_COAST_HARBORS]);
  const outer = spreadHarborEdges({ ...topo, coast: sea }, kinds.length).map((edge, i) => ({ edge, kind: kinds[i] }));
  const shore = topo.coast.filter(lake); // clockwise, one per inner hex
  const inner = HEARTLAKE_LAKE_HARBORS.map((kind, i) => ({ edge: shore[i * 2], kind }));
  return [...outer, ...inner];
}

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

/** One of each number per 18 tiles (as on the standard island), then the likelier ones first. */
function balancedTokens(n: number): number[] {
  const base = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  const extra = [5, 9, 4, 10, 6, 8, 3, 11, 2, 12];
  const out: number[] = [];
  while (out.length + base.length <= n) out.push(...base);
  for (let i = 0; out.length < n; i++) out.push(extra[i % extra.length]);
  return out;
}

function bag(counts: Partial<Record<Terrain, number>>): Terrain[] {
  return (Object.entries(counts) as [Terrain, number][]).flatMap(([t, n]) => Array.from({ length: n }, () => t));
}

const ringOf = (h: HexCoord) => Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r));

/**
 * Numbers for groups of hexes, each dealt from its own pool, re-dealt until no 6/8 touch, gold stays
 * off them and, unless `allowEqual`, no equal numbers touch. `fixed` holds the numbers that don't
 * move. If equal numbers can't be kept apart after many deals, keeping the 6s and 8s apart will do.
 */
function dealTokens(
  rng: RngHolder,
  topo: Topology,
  terrains: Terrain[],
  groups: [ids: number[], pool: number[]][],
  fixed: (number | null)[],
  allowEqual = true,
): (number | null)[] {
  let tokens: (number | null)[] = fixed;
  for (let attempt = 0; attempt < 5000; attempt++) {
    tokens = [...fixed];
    for (const [ids, pool] of groups) {
      const deal = shuffle(rng, [...pool]);
      ids.forEach((id, i) => (tokens[id] = deal[i]));
    }
    if (tokensValid(topo, tokens, allowEqual || attempt >= 3000, terrains)) break;
  }
  return tokens;
}

/**
 * Gold Rush: a ring island (rings 2 and 3) around seven hexes under fog; one of them, anywhere
 * among the seven, is a gold field. Nine harbors on the outer coast.
 */
function goldRushBoard(rng: RngHolder): Board {
  const topo = getTopology(GOLD_RUSH_HEX_COORDS);
  const middle = topo.hexes.filter((h) => ringOf(h) <= 1).map((h) => h.id);
  const ring = topo.hexes.filter((h) => ringOf(h) >= 2).map((h) => h.id);

  const terrains: Terrain[] = topo.hexes.map(() => 'desert');
  shuffle(rng, bag(GOLD_RUSH_TERRAIN_COUNTS)).forEach((t, i) => (terrains[ring[i]] = t));
  const resources: Terrain[] = ['forest', 'hills', 'pasture', 'fields', 'mountains'];
  const hidden = shuffle(rng, [...GOLD_RUSH_FOG, resources[randomInt(rng, resources.length)]]);
  middle.forEach((id, i) => (terrains[id] = hidden[i]));

  const numbered = topo.hexes.filter((h) => terrains[h.id] !== 'desert').map((h) => h.id);
  const tokens = dealTokens(rng, topo, terrains, [[numbered, balancedTokens(numbered.length)]], topo.hexes.map(() => null), false);

  const hexes: Hex[] = topo.hexes.map((h) => ({ id: h.id, q: h.q, r: h.r, terrain: terrains[h.id], token: tokens[h.id] }));
  for (const id of middle) hexes[id].fog = true;
  const kinds = shuffle(rng, [...HARBOR_KINDS]);
  const harbors = spreadHarborEdges(topo, kinds.length).map((edge, i) => ({ edge, kind: kinds[i] }));
  return { hexes, harbors };
}

const VULCAN_TERRAIN: Record<string, Terrain> = { B: 'hills', W: 'pasture', Gr: 'fields', L: 'forest', O: 'mountains', D: 'desert', G: 'gold' };

/**
 * Vulcan, as on colonist: the volcano in the middle (a gold field on a 6) ringed by mountains, a band
 * of fog and ash (desert) on both sides, and the four far corners with every resource but ore, where
 * the game starts. The shape, the ash, the fog and the volcano are as in VULCAN_LAYOUT; each game
 * shuffles the corners' tiles, and deals the corners' and the mountains' numbers from the layout's own
 * (so the corners never get a 2, 3, 11 or 12). The fog hides a random deal.
 */
function vulcanBoard(rng: RngHolder): Board {
  const topo = getTopology(VULCAN_HEX_COORDS);
  const terrains: Terrain[] = [];
  const tokens: (number | null)[] = [];
  const fogged: number[] = [];
  VULCAN_TILES.forEach(({ code }, id) => {
    if (code === '?') {
      fogged.push(id);
      terrains.push('desert');
      tokens.push(null);
      return;
    }
    const [, kind, number] = /^([A-Z][a-z]?)(\d*)$/.exec(code)!;
    terrains.push(VULCAN_TERRAIN[kind]);
    tokens.push(number ? Number(number) : null);
  });

  const resource = (id: number) => !fogged.includes(id) && ['hills', 'pasture', 'fields', 'forest'].includes(terrains[id]);
  const home = topo.hexes.filter((h) => resource(h.id)).map((h) => h.id);
  const mountains = topo.hexes.filter((h) => !fogged.includes(h.id) && terrains[h.id] === 'mountains').map((h) => h.id);
  const numbersOf = (ids: number[]) => ids.map((id) => tokens[id]!);
  const homeNumbers = numbersOf(home);
  const mountainNumbers = numbersOf(mountains);
  shuffle(rng, home.map((id) => terrains[id])).forEach((t, i) => (terrains[home[i]] = t));
  for (const id of [...home, ...mountains]) tokens[id] = null;

  shuffle(rng, bag(VULCAN_FOG_TERRAINS)).forEach((t, i) => (terrains[fogged[i]] = t));
  const hiddenNumbered = fogged.filter((id) => terrains[id] !== 'desert');
  // Gold normally stays off the 6 and 8; the volcano is the exception, so it is checked as a mountain.
  const checked = terrains.map((t) => (t === 'gold' ? 'mountains' : t));
  const dealt = dealTokens(
    rng,
    topo,
    checked,
    [
      [home, homeNumbers],
      [mountains, mountainNumbers],
      [hiddenNumbered, balancedTokens(hiddenNumbered.length)],
    ],
    tokens,
  );

  const hexes: Hex[] = topo.hexes.map((h) => ({ id: h.id, q: h.q, r: h.r, terrain: terrains[h.id], token: dealt[h.id] }));
  for (const id of fogged) hexes[id].fog = true;
  // The starting corners: the resource tiles out past the ash.
  for (const id of home) hexes[id].start = true;
  const homeIds = new Set(home);
  const homeCoast = topo.coast.filter((e) => topo.edges[e].hexes.some((h) => homeIds.has(h)));
  const kinds = shuffle(rng, [...VULCAN_HARBOR_KINDS]);
  const harbors = spreadHarborEdges({ ...topo, coast: homeCoast }, kinds.length).map((edge, i) => ({ edge, kind: kinds[i] }));
  return { hexes, harbors };
}

/**
 * No neighbouring 6/8 and, unless `allowEqual`, no neighbouring equal numbers. With `terrains`,
 * gold fields also stay off the 6 and 8 (Gold Rush — they pay out anything, so that'd be too rich).
 */
function tokensValid(topo: Topology, tokens: (number | null)[], allowEqual = false, terrains?: Terrain[]): boolean {
  for (const h of topo.hexes) {
    const t = tokens[h.id];
    if (t === null) continue;
    if (terrains?.[h.id] === 'gold' && isRed(t)) return false;
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
  // The six hexes of a ring that lie straight out from the centre.
  const straight = (h: HexCoord) => h.q === 0 || h.r === 0 || h.q + h.r === 0;
  const visible = topo.hexes.filter((h) => ringOf(h) === 2 || (ringOf(h) === 3 && !straight(h))).map((h) => h.id);
  const fogged = topo.hexes.filter((h) => ringOf(h) === 4 || (ringOf(h) === 3 && straight(h))).map((h) => h.id);

  const terrains: Terrain[] = topo.hexes.map(() => 'desert');
  for (const id of visible) terrains[id] = 'forest';
  const hidden = shuffle(rng, bag(BLACK_FOREST_FOG));
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
    .filter((h) => ringOf(h) === 2 && straight(h))
    .map((h) => ({ edge: h.edges.reduce((best, e) => (dist(e) < dist(best) ? e : best)), kind: 'lumber' as const }));

  return { hexes, harbors };
}

/** Random "balanced" board for a map: no adjacent 6/8 and no adjacent equal numbers. */
export function generateBoard(rng: RngHolder, map: MapId = 'standard'): Board {
  if (map === 'blackForest') return blackForestBoard(rng);
  if (map === 'goldRush') return goldRushBoard(rng);
  if (map === 'vulcan') return vulcanBoard(rng);
  const spec = MAPS[map];
  const topo = getTopology(spec.coords);

  const terrains = shuffle(rng, bag(spec.terrains));
  const landIds = topo.hexes.filter((h) => terrains[h.id] !== 'desert').map((h) => h.id);
  const tokens = dealTokens(rng, topo, terrains, [[landIds, [...spec.tokens]]], topo.hexes.map(() => null), !!spec.allowEqual);

  const hexes: Hex[] = topo.hexes.map((h) => ({
    id: h.id,
    q: h.q,
    r: h.r,
    terrain: terrains[h.id],
    token: tokens[h.id],
  }));

  let harbors: Harbor[];
  if (spec.placeHarbors) harbors = spec.placeHarbors(topo, rng);
  else {
    const kinds = shuffle(rng, [...spec.harbors]);
    const edges = spec.slots ? spec.slots.map((slot) => topo.coast[slot]) : spreadHarborEdges(topo, kinds.length);
    harbors = edges.map((edge, i) => ({ edge, kind: kinds[i] }));
  }

  return { hexes, harbors };
}
