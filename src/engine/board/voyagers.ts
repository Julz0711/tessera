import { HARBOR_KINDS, NUMBER_TOKENS, TERRAIN_COUNTS, TREASURE_DECK, VEILED_NUMBERS } from '../constants';
import { randomInt, shuffle, type RngHolder } from '../rng';
import type { Board, Harbor, Hex, LandTerrain, Terrain, Treasure } from '../types';
import { bag, dealTokens, spreadHarborEdges } from './generate';
import { getTopology, type HexCoord, type Topology } from './topology';

/**
 * Voyagers boards (Seafarers rules). Layouts are drawn as rows of one character per hex, odd rows
 * shifted half a hex right (as on a printed frame):
 *   ~ sea   P sea where the pirate starts   M main (starting) island   i small-island slot
 *   A–D one of four islands   f fog
 * Terrain and numbers are dealt per game; only the shapes are fixed.
 */
interface Layout {
  coords: HexCoord[];
  codes: string[];
  /** Hex id at a row and character column of the drawing. */
  at: (row: number, col: number) => number;
}

function parseLayout(rows: string[]): Layout {
  const centre = Math.floor(rows.length / 2);
  const coords: HexCoord[] = [];
  const codes: string[] = [];
  const ids = new Map<string, number>();
  rows.forEach((row, j) => {
    const r = j - centre;
    [...row].forEach((code, c) => {
      if (code === ' ') return;
      ids.set(`${j},${c}`, coords.length);
      coords.push({ q: c - (r - (r & 1)) / 2, r });
      codes.push(code);
    });
  });
  const at = (row: number, col: number) => {
    const id = ids.get(`${row},${col}`);
    if (id === undefined) throw new Error(`No hex at row ${row}, column ${col}`);
    return id;
  };
  return { coords, codes, at };
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

// Veiled Isles: the base game's island in a wide frame of sea, with fog-covered hexes scattered all
// around it (the islands waiting to be found). Laid out after the reference board, 9 rows, 8–12 wide.
const VEILED_ISLES = parseLayout([
  '  ~~~~~~~~',
  ' ~f~MMM~f~',
  ' ~f~MMMM~f~',
  '~~~MMMMM~~~',
  '~Pf~MMMM~f~~',
  '~f~~MMM~~f~',
  ' ~~f~~~~f~~',
  ' ~f~fff~f~',
  '  ~~~~~~~~',
]);

/** The 15 treasure chests of the reference board, each on the corner shared by three hexes (row, column). */
const VEILED_TREASURES: [number, number][][] = [
  [[0, 8], [0, 9], [1, 8]],
  [[1, 7], [1, 8], [2, 8]],
  [[1, 9], [2, 9], [2, 10]],
  [[2, 8], [2, 9], [3, 8]],
  [[1, 2], [2, 2], [2, 3]],
  [[3, 1], [4, 1], [4, 2]],
  [[4, 2], [4, 3], [5, 2]],
  [[4, 9], [4, 10], [5, 9]],
  [[5, 9], [5, 10], [6, 10]],
  [[6, 5], [6, 6], [7, 5]],
  [[6, 8], [6, 9], [7, 8]],
  [[7, 2], [7, 3], [8, 3]],
  [[7, 6], [7, 7], [8, 7]],
  [[7, 5], [8, 5], [8, 6]],
  [[7, 8], [8, 8], [8, 9]],
];

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
 * Veiled Isles: the home island is dealt like the base game's. Under the fog: 0–2 sea, 0–1 gold,
 * the rest random resource terrain, numbered at random from 3, 4, 5, 6, 8, 9, 10, 11 (repeats
 * allowed: the rules call it completely random). The contents are drawn now with the game's seeded
 * RNG and kept server-side until revealed, the same as Black Forest. Fifteen treasures lie on the
 * reference board's chest corners, one reward each from a shuffled 5/4/3/3 deck.
 */
export function veiledIslesBoard(rng: RngHolder): Board {
  const L = VEILED_ISLES;
  const topo = getTopology(L.coords);
  const terrains: Terrain[] = L.codes.map(() => 'sea');
  const main = idsOf(L, (c) => c === 'M');
  const fog = idsOf(L, (c) => c === 'f');
  dealMain(rng, main, terrains);

  const seas = randomInt(rng, 3);
  const golds = randomInt(rng, 2);
  const hidden: Terrain[] = [
    ...Array<Terrain>(seas).fill('sea'),
    ...Array<Terrain>(golds).fill('gold'),
    ...Array.from({ length: fog.length - seas - golds }, () => RESOURCES_TERRAIN[randomInt(rng, RESOURCES_TERRAIN.length)]),
  ];
  shuffle(rng, hidden).forEach((t, i) => (terrains[fog[i]] = t));

  const mainLand = main.filter((id) => terrains[id] !== 'desert');
  const dealt = dealTokens(rng, topo, [[mainLand, [...NUMBER_TOKENS]]], topo.hexes.map(() => null), false);
  for (const id of fog) if (terrains[id] !== 'sea') dealt[id] = VEILED_NUMBERS[randomInt(rng, VEILED_NUMBERS.length)];

  const hexes = hexesOf(topo, terrains, dealt);
  for (const id of main) hexes[id].start = true;
  for (const id of fog) hexes[id].fog = true;

  const corners = VEILED_TREASURES.map((spot) => {
    const ids = spot.map(([row, col]) => L.at(row, col));
    const v = topo.vertices.find((x) => ids.every((h) => x.hexes.includes(h)));
    if (!v) throw new Error('Treasure spot is not a corner');
    return v.id;
  });
  const deck = shuffle(rng, [...TREASURE_DECK]);
  const treasures: Treasure[] = corners.map((vertex, i) => ({ vertex, kind: deck[i] }));

  // Nine harbors, all on the home island's coast.
  const harbors = harborsOn(rng, topo, terrains, [main], [9]);
  return { hexes, harbors, pirateStart: L.codes.indexOf('P'), treasures };
}
