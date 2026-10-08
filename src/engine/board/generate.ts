import {
  FOUR_LAKES_TERRAIN_COUNTS,
  GOLD_RUSH_FOG,
  GOLD_RUSH_FOG_TOKENS,
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
import type { Board, Harbor, HarborKind, Hex, LandTerrain, MapId, Terrain } from '../types';
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
import { citadelBoard, farShoresBoard, fourRealmsBoard, veiledIslesBoard, zealandBoard } from './voyagers';

interface MapSpec {
  coords: readonly HexCoord[];
  terrains: Record<LandTerrain, number>;
  tokens: readonly number[];
  harbors: readonly HarborKind[];
  /** Harbor positions as indices into the clockwise coast; spread evenly when omitted. */
  slots?: readonly number[];
  /** Places the harbors itself (for maps with an inland shore). */
  placeHarbors?: (topo: Topology, rng: RngHolder) => Harbor[];
}

const MAPS: Record<Exclude<MapId, 'blackForest' | 'goldRush' | 'vulcan' | 'crossroads' | 'farShores' | 'fourRealms' | 'veiledIsles' | 'citadel' | 'zealand'>, MapSpec> = {
  standard: { coords: STANDARD_HEX_COORDS, terrains: TERRAIN_COUNTS, tokens: NUMBER_TOKENS, harbors: HARBOR_KINDS, slots: HARBOR_COAST_SLOTS },
  duel: { coords: STANDARD_HEX_COORDS, terrains: TERRAIN_COUNTS, tokens: NUMBER_TOKENS, harbors: HARBOR_KINDS, slots: HARBOR_COAST_SLOTS },
  large: { coords: LARGE_HEX_COORDS, terrains: LARGE_TERRAIN_COUNTS, tokens: LARGE_NUMBER_TOKENS, harbors: LARGE_HARBOR_KINDS },
  fourLakes: {
    coords: FOUR_LAKES_HEX_COORDS,
    terrains: FOUR_LAKES_TERRAIN_COUNTS,
    tokens: balancedTokens(38),
    harbors: LARGE_HARBOR_KINDS,
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
export function spreadHarborEdges(topo: Topology, k: number): number[] {
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

export const isRed = (t: number | null) => t === 6 || t === 8;

/** One of each number per 18 tiles (as on the standard island), then the likelier ones first. */
export function balancedTokens(n: number): number[] {
  const base = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  const extra = [5, 9, 4, 10, 6, 8, 3, 11, 2, 12];
  const out: number[] = [];
  while (out.length + base.length <= n) out.push(...base);
  for (let i = 0; out.length < n; i++) out.push(extra[i % extra.length]);
  return out;
}

export function bag(counts: Partial<Record<LandTerrain, number>>): Terrain[] {
  return (Object.entries(counts) as [Terrain, number][]).flatMap(([t, n]) => Array.from({ length: n }, () => t));
}

const ringOf = (h: HexCoord) => Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r));

/** Four seven-hex home regions, linked to a desert center by two weakly numbered hexes each. */
function crossroadsBoard(rng: RngHolder): Board {
  const centers: HexCoord[] = [{ q: -4, r: 0 }, { q: 4, r: 0 }, { q: 0, r: -4 }, { q: 0, r: 4 }];
  const key = (q: number, r: number) => `${q},${r}`;
  const homes = new Set<string>();
  for (const center of centers) {
    for (let dr = -1; dr <= 1; dr++) for (let dq = -1; dq <= 1; dq++) {
      if (ringOf({ q: dq, r: dr }) <= 1) homes.add(key(center.q + dq, center.r + dr));
    }
  }
  const necks: HexCoord[] = [-2, -1, 1, 2].flatMap((n) => [{ q: n, r: 0 }, { q: 0, r: n }]);
  const coords = [...[...homes].map((s) => { const [q, r] = s.split(',').map(Number); return { q, r }; }), ...necks, { q: 0, r: 0 }]
    .sort((a, b) => a.r - b.r || a.q - b.q);
  const topo = getTopology(coords);
  const homeIds = topo.hexes.filter((h) => homes.has(key(h.q, h.r))).map((h) => h.id);
  const homeGroups = centers.map((center) => homeIds.filter((id) =>
    ringOf({ q: topo.hexes[id].q - center.q, r: topo.hexes[id].r - center.r }) <= 1,
  ));
  const neckIds = topo.hexes.filter((h) => ringOf(h) !== 0 && !homes.has(key(h.q, h.r))).map((h) => h.id);
  const terrains: Terrain[] = topo.hexes.map(() => 'desert');
  const homeBag: Terrain[] = ['forest', 'forest', 'hills', 'pasture', 'fields', 'fields', 'mountains'];
  for (const ids of homeGroups) {
    shuffle(rng, [...homeBag]).forEach((terrain, i) => { terrains[ids[i]] = terrain; });
  }
  shuffle(rng, ['forest', 'forest', 'hills', 'hills', 'pasture', 'pasture', 'fields', 'fields'] as Terrain[])
    .forEach((terrain, i) => { terrains[neckIds[i]] = terrain; });
  const tokens = dealTokens(rng, topo, [
    ...homeGroups.map((ids): [number[], number[]] => [ids, [3, 4, 5, 6, 8, 9, 10]]),
    [neckIds, [2, 2, 3, 3, 11, 11, 12, 12]],
  ], topo.hexes.map(() => null));
  const hexes: Hex[] = topo.hexes.map((h) => ({ id: h.id, q: h.q, r: h.r, terrain: terrains[h.id], token: tokens[h.id], start: homes.has(key(h.q, h.r)) }));
  const kinds = shuffle(rng, [...LARGE_HARBOR_KINDS]);
  const harbors = spreadHarborEdges(topo, kinds.length).map((edge, i) => ({ edge, kind: kinds[i] }));
  return { hexes, harbors };
}

/** How often a deal had to give up (no valid deal found): kept for tests and diagnostics. */
export const dealStats = { fallbacks: 0 };

/** Clashes of a full deal: touching 6/8 weigh heavily, touching equal numbers lightly (fixed-vs-fixed pairs don't count). */
function dealClashes(topo: Topology, tokens: (number | null)[], fixed: (number | null)[]): number {
  let n = 0;
  for (const h of topo.hexes) {
    const t = tokens[h.id];
    if (t === null || t === undefined) continue;
    for (const o of h.neighbors) {
      const u = tokens[o];
      if (o < h.id || u === null || u === undefined || (fixed[h.id] !== null && fixed[o] !== null)) continue;
      if (isRed(t) && isRed(u)) n += 100;
      else if (t === u) n += 1;
    }
  }
  return n;
}

/**
 * Numbers for groups of hexes, each dealt from its own pool (the first as many as it has hexes), so
 * that no equal numbers touch and no 6/8 touch, on every map. `fixed` holds the numbers that don't
 * move (a map's own gold 6 or 8): dealt numbers keep clear of them too, but two fixed ones may clash.
 * Found by randomized backtracking (the most constrained hex first, with a step budget and restarts),
 * so dense pools still deal. If nothing valid turns up, the deal with the fewest clashes (6/8 touching
 * weigh most) is kept, so a board is always made. Deterministic from `rng`.
 */
export function dealTokens(
  rng: RngHolder,
  topo: Topology,
  groups: [ids: number[], pool: number[]][],
  fixed: (number | null)[],
  /** A map's own rule on top of the usual ones (Vulcan: a red number in every corner). */
  extra?: (tokens: (number | null)[]) => boolean,
): (number | null)[] {
  const valid = tryDealTokens(rng, topo, groups, fixed, extra, 40);
  if (valid) return valid;

  // No valid deal: keep the best of many random ones.
  dealStats.fallbacks++;
  let best = [...fixed];
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 300 && bestScore > 0; attempt++) {
    const dealt = [...fixed];
    for (const [ids, pool] of groups) {
      const deal = shuffle(rng, [...pool]);
      ids.forEach((id, i) => (dealt[id] = deal[i] ?? null));
    }
    const score = dealClashes(topo, dealt, fixed) + (extra && !extra(dealt) ? 1000 : 0);
    if (score < bestScore) { best = dealt; bestScore = score; }
  }
  return best;
}

/** dealTokens' search alone: a valid deal, or null if `attempts` restarts found none. */
function tryDealTokens(
  rng: RngHolder,
  topo: Topology,
  groups: [ids: number[], pool: number[]][],
  fixed: (number | null)[],
  extra: ((tokens: (number | null)[]) => boolean) | undefined,
  attempts: number,
  budget = 4000,
): (number | null)[] | null {
  const tokens: (number | null)[] = [...fixed];
  const groupOf = new Map<number, number>();
  groups.forEach(([ids], g) => ids.forEach((id) => { tokens[id] = null; groupOf.set(id, g); }));
  const left = groups.map(([, pool]) => {
    const counts = new Map<number, number>();
    for (const t of pool) counts.set(t, (counts.get(t) ?? 0) + 1);
    return counts;
  });
  const fits = (id: number, t: number) => topo.hexes[id].neighbors.every((n) => {
    const u = tokens[n];
    return u === null || (u !== t && !(isRed(t) && isRed(u)));
  });
  const candidates = (id: number) => {
    const out: number[] = [];
    for (const [t, n] of left[groupOf.get(id)!]) if (n > 0 && fits(id, t)) out.push(t);
    return out;
  };

  let steps = 0;
  const solve = (open: number[]): boolean => {
    if (!open.length) return !extra || extra(tokens);
    if (++steps > budget) return false;
    let pick = -1;
    let pickCount = Infinity;
    for (const id of open) {
      const c = candidates(id).length;
      if (c < pickCount) { pick = id; pickCount = c; }
      if (c === 0) return false;
    }
    // Candidates in random order, likelier (more copies left) numbers a little more often first.
    const counts = left[groupOf.get(pick)!];
    const order = [...new Set(shuffle(rng, [...counts].flatMap(([t, n]) => (n > 0 && fits(pick, t) ? Array<number>(n).fill(t) : []))))];
    const rest = open.filter((id) => id !== pick);
    for (const t of order) {
      tokens[pick] = t;
      counts.set(t, counts.get(t)! - 1);
      const ok = solve(rest);
      if (ok) return true;
      counts.set(t, counts.get(t)! + 1);
      tokens[pick] = null;
      if (steps > budget) return false;
    }
    return false;
  };

  const all = groups.flatMap(([ids]) => ids);
  for (let attempt = 0; attempt < attempts; attempt++) {
    steps = 0;
    // A shuffled start, so the ties between equally constrained hexes break differently each time.
    if (solve(shuffle(rng, [...all]))) return tokens;
  }
  return null;
}

/**
 * Gold Rush: a ring island (rings 2 and 3) around seven hexes under fog; one of them, anywhere
 * among the seven, is a gold field. The ring is numbered like an island of its own; the fog hides
 * only 4s to 10s, and the gold is always a 6 or an 8. Nine harbors on the outer coast.
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

  const gold = middle.find((id) => terrains[id] === 'gold')!;
  const fixed: (number | null)[] = topo.hexes.map(() => null);
  fixed[gold] = randomInt(rng, 2) ? 6 : 8;
  // The middle first (it is tight: its centre touches the other six), then the ring around it.
  const hiddenTokens = dealTokens(rng, topo, [[middle.filter((id) => id !== gold), [...GOLD_RUSH_FOG_TOKENS]]], fixed);
  const land = ring.filter((id) => terrains[id] !== 'desert');
  const tokens = dealTokens(rng, topo, [[land, balancedTokens(land.length)]], hiddenTokens);

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
 * (so the corners never get a 2, 3, 11 or 12), one 6 or 8 in each corner, and the ring of mountains
 * around the volcano only 4, 5, 9 and 10. The fog hides a random deal, never on a 2 or 12.
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
  // The ring around the volcano keeps its own good numbers (4, 5, 9, 10); the outer mountains share the rest.
  const volcano = topo.hexes.find((h) => terrains[h.id] === 'gold')!.id;
  const ring = mountains.filter((id) => topo.hexes[volcano].neighbors.includes(id));
  const outer = mountains.filter((id) => !ring.includes(id));
  // Which of the four corners a tile is in: left or right of the volcano, above or below it.
  const cornerOf = (id: number) => (topo.hexes[id].q + topo.hexes[id].r / 2 > 0 ? 1 : 0) + (topo.hexes[id].r > 0 ? 2 : 0);
  const numbersOf = (ids: number[]) => ids.map((id) => tokens[id]!);
  const homeNumbers = numbersOf(home);
  const ringNumbers = numbersOf(ring);
  const outerNumbers = numbersOf(outer);
  shuffle(rng, home.map((id) => terrains[id])).forEach((t, i) => (terrains[home[i]] = t));
  for (const id of [...home, ...mountains]) tokens[id] = null;

  shuffle(rng, bag(VULCAN_FOG_TERRAINS)).forEach((t, i) => (terrains[fogged[i]] = t));
  const hiddenNumbered = fogged.filter((id) => terrains[id] !== 'desert');
  const dealt = dealTokens(
    rng,
    topo,
    [
      [home, homeNumbers],
      [ring, ringNumbers],
      [outer, outerNumbers],
      // No 2 or 12 under the fog: exploring should pay, so those trade up to a 4 and a 10.
      [hiddenNumbered, balancedTokens(hiddenNumbered.length).map((t) => (t === 2 ? 4 : t === 12 ? 10 : t))],
    ],
    tokens,
    // The corners share four 6s and 8s between them: one each, so no corner starts poor.
    (dealt) => [0, 1, 2, 3].every((c) => home.filter((id) => cornerOf(id) === c && isRed(dealt[id])).length === 1),
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

const FOG_PIPS: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

/**
 * Splits Black Forest's fog numbers between its four resources (`sizes` hexes each) so that none is
 * left poor: pips within 2 of its fair share, at most two 6/8s (and one if it can, at least one), and at
 * most one 2 or 12. Random splits, the best kept if none is perfect. Deterministic from `rng`.
 */
function balancedFogDeal(rng: RngHolder, pool: number[], sizes: number[]): number[][] {
  const total = pool.reduce((n, t) => n + FOG_PIPS[t], 0);
  let best: number[][] = [];
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 2000 && bestScore > 0; attempt++) {
    const deck = shuffle(rng, [...pool]);
    let at = 0;
    const split = sizes.map((n) => deck.slice(at, (at += n)));
    let score = 0;
    for (const [i, part] of split.entries()) {
      const pips = part.reduce((n, t) => n + FOG_PIPS[t], 0);
      const reds = part.filter(isRed).length;
      const ends = part.filter((t) => t === 2 || t === 12).length;
      score += Math.max(0, Math.abs(pips - (total * sizes[i]) / pool.length) - 2) + Math.max(0, reds - 2) + (reds === 0 ? 1 : 0) + Math.max(0, ends - 1);
    }
    if (score < bestScore) { best = split; bestScore = score; }
  }
  return best;
}

/**
 * Black Forest: the desert island sits in a lake; ring 2 and the sides of ring 3 are visible forest,
 * while ring 3's corners and all of ring 4 hide the other resources and two gold fields under fog.
 * Six 2:1 lumber harbors line the lake shore.
 */
function blackForestBoard(rng: RngHolder, gold: boolean): Board {
  const topo = getTopology(BLACK_FOREST_HEX_COORDS);
  // The six hexes of a ring that lie straight out from the centre.
  const straight = (h: HexCoord) => h.q === 0 || h.r === 0 || h.q + h.r === 0;
  const visible = topo.hexes.filter((h) => ringOf(h) === 2 || (ringOf(h) === 3 && !straight(h))).map((h) => h.id);
  const fogged = topo.hexes.filter((h) => ringOf(h) === 4 || (ringOf(h) === 3 && straight(h))).map((h) => h.id);

  const terrains: Terrain[] = topo.hexes.map(() => 'desert');
  for (const id of visible) terrains[id] = 'forest';
  // Gold fields are always a 6 or an 8, and those may not sit side by side: the two never touch, and
  // neither borders the forest (whose own eight 6s and 8s would otherwise not always fit apart).
  const goldTouches = () =>
    fogged.some((id) => terrains[id] === 'gold' && topo.hexes[id].neighbors.some((n) => terrains[n] === 'gold' || terrains[n] === 'forest'));
  // Without gold, two random resources take the gold fields' places.
  // Two different ones, so the counts stay even (8, 8, 7, 7).
  const resources: Terrain[] = ['hills', 'pasture', 'fields', 'mountains'];
  const extras = shuffle(rng, [...resources]).slice(0, 2);
  const hiddenBag = gold ? bag(BLACK_FOREST_FOG) : [...bag(BLACK_FOREST_FOG).filter((t) => t !== 'gold'), ...extras];
  do {
    const hidden = shuffle(rng, [...hiddenBag]);
    fogged.forEach((id, i) => (terrains[id] = hidden[i]));
  } while (goldTouches());

  // Gold is always a 6 or an 8.
  const goldIds = fogged.filter((id) => terrains[id] === 'gold');
  const fixed: (number | null)[] = topo.hexes.map(() => null);
  for (const id of goldIds) fixed[id] = shuffle(rng, [6, 8])[0];
  // Tiles standing in for gold get a 5 and a 9 rather than gold's 6 or 8.
  const fogPool = gold ? [...BLACK_FOREST_FOG_TOKENS] : [...BLACK_FOREST_FOG_TOKENS, 5, 9];
  const fogIds = resources.map((r) => fogged.filter((id) => terrains[id] === r));
  // The forest first, then the fog around it; a layout or split the neighbours won't allow is dealt again.
  const forest: [number[], number[]][] = [[visible, [...BLACK_FOREST_TOKENS]]];
  let tokens: (number | null)[] | null = null;
  for (let attempt = 0; attempt < 500 && !tokens; attempt++) {
    const ring = tryDealTokens(rng, topo, forest, fixed, undefined, 1, 800);
    if (!ring) continue;
    const fogDeal = balancedFogDeal(rng, fogPool, fogIds.map((ids) => ids.length));
    tokens = tryDealTokens(rng, topo, fogIds.map((ids, i): [number[], number[]] => [ids, fogDeal[i]]), ring, undefined, 1, 120);
  }
  tokens ??= dealTokens(rng, topo, [...forest, ...fogIds.map((ids): [number[], number[]] => [ids, fogPool.slice(0, ids.length)])], fixed);

  const hexes: Hex[] = topo.hexes.map((h) => ({ id: h.id, q: h.q, r: h.r, terrain: terrains[h.id], token: tokens[h.id] }));
  for (const id of fogged) hexes[id].fog = true;

  // Each harbor sits on the lake-facing edge of a ring-2 hex straight out from the centre.
  const dist = (e: number) => Math.hypot(topo.edges[e].x, topo.edges[e].y);
  const harbors = topo.hexes
    .filter((h) => ringOf(h) === 2 && straight(h))
    .map((h) => ({ edge: h.edges.reduce((best, e) => (dist(e) < dist(best) ? e : best)), kind: 'lumber' as const }));

  return { hexes, harbors };
}

/**
 * Random "balanced" board for a map: no adjacent 6/8 and no adjacent equal numbers. `gold: false`
 * leaves Black Forest's gold fields out.
 */
export function generateBoard(rng: RngHolder, map: MapId = 'standard', opts: { gold?: boolean } = {}): Board {
  if (map === 'citadel') return citadelBoard(rng);
  if (map === 'zealand') return zealandBoard(rng, opts.gold ?? true);
  if (map === 'crossroads') return crossroadsBoard(rng);
  if (map === 'farShores') return farShoresBoard(rng);
  if (map === 'fourRealms') return fourRealmsBoard(rng);
  if (map === 'veiledIsles') return veiledIslesBoard(rng);
  if (map === 'blackForest') return blackForestBoard(rng, opts.gold ?? true);
  if (map === 'goldRush') return goldRushBoard(rng);
  if (map === 'vulcan') return vulcanBoard(rng);
  const spec = MAPS[map];
  const topo = getTopology(spec.coords);

  const terrains = shuffle(rng, bag(spec.terrains));
  const landIds = topo.hexes.filter((h) => terrains[h.id] !== 'desert').map((h) => h.id);
  const tokens = dealTokens(rng, topo, [[landIds, [...spec.tokens]]], topo.hexes.map(() => null));

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
