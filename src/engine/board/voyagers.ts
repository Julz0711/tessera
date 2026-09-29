import { HARBOR_KINDS, NUMBER_TOKENS, TERRAIN_COUNTS, TREASURE_DECK, VEILED_NUMBERS } from '../constants';
import { randomInt, shuffle, type RngHolder } from '../rng';
import type { Board, Harbor, Hex, LandTerrain, Terrain, Treasure } from '../types';
import { bag, dealTokens, spreadHarborEdges } from './generate';
import { getTopology, type HexCoord, type Topology } from './topology';

/**
 * Voyagers boards (Seafarers rules). Layouts are drawn as rows of one character per hex, odd rows
 * shifted half a hex right (as on a printed frame):
 *   ~ sea   P sea where the pirate starts   M main (starting) island   i small-island slot
 *   A–D one of four islands   f fog   o outer island
 * Terrain and numbers are dealt per game; only the shapes are fixed.
 */
interface Layout {
  coords: HexCoord[];
  codes: string[];
}

function parseLayout(rows: string[]): Layout {
  const centre = Math.floor(rows.length / 2);
  const coords: HexCoord[] = [];
  const codes: string[] = [];
  rows.forEach((row, j) => {
    const r = j - centre;
    [...row].forEach((code, c) => {
      if (code === ' ') return;
      coords.push({ q: c - (r - (r & 1)) / 2, r });
      codes.push(code);
    });
  });
  return { coords, codes };
}

// Far Shores (after "Heading for New Shores"): a standard-sized main island, a strait, and three
// clusters of small islands with two gold fields between them.
const FAR_SHORES = parseLayout([
  '~~~~~~iii~~',
  '~~MMM~~~i~~',
  '~MMMM~~~~~~',
  '~MMMMM~Piii',
  '~MMMM~~~ii~',
  '~~MMM~~i~~~',
  '~~~~~~iii~~',
]);

// Four Realms (after "The Four Islands"): four islands around a cross of open sea.
const FOUR_REALMS = parseLayout([
  '~~~~~~~~~~',
  '~AAA~~BBB~',
  '~AAA~~BBB~',
  '~~~~P~~~~~',
  '~CCC~~DDD~',
  '~CCC~~DD~~',
  '~~~~~~~~~~',
]);

// Veiled Isles: the home island in the west, a fog-covered sea in the middle, outer isles in the east.
const VEILED_ISLES = parseLayout([
  '~~~~~~~~~~oo',
  '~~MMM~ff~~~o',
  '~MMMM~ff~f~~',
  '~MMMMMPff~oo',
  '~MMMM~ff~f~~',
  '~~MMM~ff~~~o',
  '~~~~~~~~~~oo',
]);

const RESOURCES_TERRAIN: LandTerrain[] = ['forest', 'hills', 'pasture', 'fields', 'mountains'];

const idsOf = (layout: Layout, test: (code: string) => boolean) =>
  layout.codes.flatMap((code, id) => (test(code) ? [id] : []));

/** Coast edges of a group of land hexes, clockwise around its centre. */
function coastOf(topo: Topology, terrains: Terrain[], ids: number[]): number[] {
  const set = new Set(ids);
  const cx = ids.reduce((n, id) => n + topo.hexes[id].x, 0) / ids.length;
  const cy = ids.reduce((n, id) => n + topo.hexes[id].y, 0) / ids.length;
  const angle = (e: number) => {
    const a = Math.atan2(topo.edges[e].x - cx, -(topo.edges[e].y - cy));
    return a < 0 ? a + 2 * Math.PI : a;
  };
  return topo.edges
    .filter((e) => e.hexes.some((h) => set.has(h)) && (e.hexes.length === 1 || e.hexes.some((h) => terrains[h] === 'sea')))
    .map((e) => e.id)
    .sort((a, b) => angle(a) - angle(b));
}

/** Harbors spread along each group's coast, `counts[i]` on group i, kinds shuffled across all. */
function harborsOn(rng: RngHolder, topo: Topology, terrains: Terrain[], groups: number[][], counts: number[]): Harbor[] {
  const kinds = shuffle(rng, [...HARBOR_KINDS]);
  const out: Harbor[] = [];
  groups.forEach((ids, i) => {
    const coast = coastOf(topo, terrains, ids);
    for (const edge of spreadHarborEdges({ ...topo, coast }, counts[i])) out.push({ edge, kind: kinds[out.length % kinds.length] });
  });
  return out;
}

function hexesOf(topo: Topology, terrains: Terrain[], tokens: (number | null)[]): Hex[] {
  return topo.hexes.map((h) => ({ id: h.id, q: h.q, r: h.r, terrain: terrains[h.id], token: tokens[h.id] }));
}

/** Terrain and numbers for the standard-sized main island, dealt as on the base game's island. */
function dealMain(rng: RngHolder, main: number[], terrains: Terrain[]): void {
  shuffle(rng, bag(TERRAIN_COUNTS)).forEach((t, i) => (terrains[main[i]] = t));
}

export function farShoresBoard(rng: RngHolder): Board {
  const L = FAR_SHORES;
  const topo = getTopology(L.coords);
  const terrains: Terrain[] = L.codes.map(() => 'sea');
  const main = idsOf(L, (c) => c === 'M');
  const small = idsOf(L, (c) => c === 'i');
  dealMain(rng, main, terrains);
  // Small islands: 9 land tiles (2 gold) and 4 sea, shuffled into the 13 slots.
  const smallBag: Terrain[] = ['gold', 'gold', 'fields', 'hills', 'hills', 'mountains', 'mountains', 'pasture', 'forest', 'sea', 'sea', 'sea', 'sea'];
  shuffle(rng, smallBag).forEach((t, i) => (terrains[small[i]] = t));
  const mainLand = main.filter((id) => terrains[id] !== 'desert');
  const smallLand = small.filter((id) => terrains[id] !== 'sea');
  const tokens = dealTokens(
    rng,
    topo,
    [
      [mainLand, [...NUMBER_TOKENS]],
      [smallLand, [2, 3, 4, 5, 6, 8, 9, 10, 11]],
    ],
    topo.hexes.map(() => null),
    false,
  );
  const hexes = hexesOf(topo, terrains, tokens);
  for (const id of main) hexes[id].start = true;
  return { hexes, harbors: harborsOn(rng, topo, terrains, [main], [9]), pirateStart: L.codes.indexOf('P') };
}

export function fourRealmsBoard(rng: RngHolder): Board {
  const L = FOUR_REALMS;
  const topo = getTopology(L.coords);
  const terrains: Terrain[] = L.codes.map(() => 'sea');
  const islands = ['A', 'B', 'C', 'D'].map((k) => idsOf(L, (c) => c === k));
  const land = islands.flat();
  const counts: Partial<Record<LandTerrain, number>> = { fields: 5, hills: 4, mountains: 4, pasture: 5, forest: 5 };
  shuffle(rng, bag(counts)).forEach((t, i) => (terrains[land[i]] = t));
  const pool = [2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12];
  // Forest and pasture feed early growth: keep them off the 2 and the 12, as the rulebook advises.
  const tokens = dealTokens(rng, topo, [[land, pool]], topo.hexes.map(() => null), false, (t) =>
    land.every((id) => !((terrains[id] === 'forest' || terrains[id] === 'pasture') && (t[id] === 2 || t[id] === 12))),
  );
  const hexes = hexesOf(topo, terrains, tokens);
  return { hexes, harbors: harborsOn(rng, topo, terrains, islands, [3, 2, 2, 2]), pirateStart: L.codes.indexOf('P') };
}

/**
 * Veiled Isles: the home island is dealt like the base game's; the outer isles get a random terrain
 * each and numbers from 3–11 (no 7). Under the fog: 0–2 sea, 0–1 gold, the rest random resource
 * terrain, numbered at random from 3, 4, 5, 6, 8, 9, 10, 11 (repeats allowed: the rules call it
 * completely random). The contents are drawn now with the game's seeded RNG and kept server-side
 * until revealed, the same as Black Forest. Fifteen treasures lie on sea corners away from home,
 * one reward each from a shuffled 5/4/3/3 deck.
 */
export function veiledIslesBoard(rng: RngHolder): Board {
  const L = VEILED_ISLES;
  const topo = getTopology(L.coords);
  const terrains: Terrain[] = L.codes.map(() => 'sea');
  const main = idsOf(L, (c) => c === 'M');
  const fog = idsOf(L, (c) => c === 'f');
  const outer = idsOf(L, (c) => c === 'o');
  dealMain(rng, main, terrains);

  const outerBag: Terrain[] = [...RESOURCES_TERRAIN, 'hills', 'mountains', 'pasture'];
  shuffle(rng, outerBag).forEach((t, i) => (terrains[outer[i]] = t));

  const seas = randomInt(rng, 3);
  const golds = randomInt(rng, 2);
  const hidden: Terrain[] = [
    ...Array<Terrain>(seas).fill('sea'),
    ...Array<Terrain>(golds).fill('gold'),
    ...Array.from({ length: fog.length - seas - golds }, () => RESOURCES_TERRAIN[randomInt(rng, RESOURCES_TERRAIN.length)]),
  ];
  shuffle(rng, hidden).forEach((t, i) => (terrains[fog[i]] = t));

  const tokens: (number | null)[] = topo.hexes.map(() => null);
  const mainLand = main.filter((id) => terrains[id] !== 'desert');
  const dealt = dealTokens(rng, topo, [[mainLand, [...NUMBER_TOKENS]]], tokens, false);
  const outerNumbers = shuffle(rng, [...VEILED_NUMBERS]);
  outer.forEach((id, i) => (dealt[id] = outerNumbers[i % outerNumbers.length]));
  for (const id of fog) if (terrains[id] !== 'sea') dealt[id] = VEILED_NUMBERS[randomInt(rng, VEILED_NUMBERS.length)];

  const hexes = hexesOf(topo, terrains, dealt);
  for (const id of main) hexes[id].start = true;
  for (const id of fog) hexes[id].fog = true;

  // Treasure spots: corners touching open (visible) sea, off the home island, never next to each other.
  const home = new Set(main);
  const visibleSea = (h: number) => terrains[h] === 'sea' && !hexes[h].fog;
  const candidates = shuffle(
    rng,
    topo.vertices.filter((v) => v.hexes.some(visibleSea) && !v.hexes.some((h) => home.has(h)) && v.hexes.length > 1).map((v) => v.id),
  );
  const picked: number[] = [];
  const taken = new Set<number>();
  for (const v of candidates) {
    if (picked.length === TREASURE_DECK.length) break;
    if (taken.has(v)) continue;
    picked.push(v);
    taken.add(v);
    for (const n of topo.vertices[v].vertices) taken.add(n);
  }
  const deck = shuffle(rng, [...TREASURE_DECK]);
  const treasures: Treasure[] = picked.map((vertex, i) => ({ vertex, kind: deck[i] }));

  // Nine harbors, all on the home island's coast.
  const harbors = harborsOn(rng, topo, terrains, [main], [9]);
  return { hexes, harbors, pirateStart: L.codes.indexOf('P'), treasures };
}
