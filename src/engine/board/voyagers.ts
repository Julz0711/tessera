import { HARBOR_KINDS, NUMBER_TOKENS, TERRAIN_COUNTS, TREASURE_DECK, VEILED_FOG_SEAS, VEILED_NUMBERS } from '../constants';
import { randomInt, shuffle, type RngHolder } from '../rng';
import { RESOURCES, TREASURE_KINDS, type Board, type Harbor, type HarborKind, type Hex, type LandTerrain, type Terrain, type Treasure } from '../types';
import { bag, balancedTokens, dealTokens, spreadHarborEdges, spreadRedTokens } from './generate';
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

/**
 * The 15 treasure chests, fixed every game, each on the corner shared by three hexes (row, column).
 * Mirror-symmetric left to right, as on the reference board, with one chest on the centre line.
 */
const VEILED_TREASURES: [number, number][][] = [
  // left                          // right
  [[0, 2], [0, 3], [1, 2]],        [[0, 8], [0, 9], [1, 8]],
  [[1, 1], [2, 1], [2, 2]],        [[1, 9], [2, 9], [2, 10]],
  [[3, 1], [3, 2], [4, 2]],        [[3, 8], [3, 9], [4, 9]],
  [[5, 1], [5, 2], [6, 2]],        [[5, 8], [5, 9], [6, 9]],
  [[6, 2], [7, 1], [7, 2]],        [[6, 9], [7, 8], [7, 9]],
  [[6, 4], [7, 3], [7, 4]],        [[6, 7], [7, 6], [7, 7]],
  [[7, 2], [7, 3], [8, 3]],        [[7, 7], [7, 8], [8, 8]],
  // centre, below the bottom fog
  [[7, 5], [8, 5], [8, 6]],
];

/**
 * The home island's 9 harbors, fixed as on the reference board (only which kind goes where is
 * shuffled): a hex (row, column of the drawing above) and the side facing the sea, as a screen
 * angle with y pointing down (0 east, 60 south-east, 120 south-west, 180 west, 240 north-west,
 * 300 north-east).
 */
const VEILED_HARBORS: [number, number, number][] = [
  [1, 4, 300],
  [1, 6, 300],
  [2, 7, 0],
  [4, 7, 0],
  [5, 6, 60],
  [5, 4, 60],
  [4, 4, 120],
  [3, 3, 180],
  [2, 4, 240],
];

/** The edge of `hex` on the side facing `angle` (degrees, y down). */
function sideOf(topo: Topology, hex: number, angle: number): number {
  const h = topo.hexes[hex];
  const [dx, dy] = [Math.cos((angle * Math.PI) / 180), Math.sin((angle * Math.PI) / 180)];
  return h.edges.reduce((best, e) => {
    const score = (edge: number) => (topo.edges[edge].x - h.x) * dx + (topo.edges[edge].y - h.y) * dy;
    return score(e) > score(best) ? e : best;
  });
}

const RESOURCES_TERRAIN: LandTerrain[] = ['forest', 'hills', 'pasture', 'fields', 'mountains'];

const hexDistance = (q: number, r: number) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));

/** A hex turned `k` sixths of a turn clockwise (on screen) about the centre of the board. */
function rotate(h: HexCoord, k: number): HexCoord {
  let p = h;
  for (let i = 0; i < k; i++) p = { q: -p.r, r: p.q + p.r };
  return p;
}

/** The hexes on the straight line from one hex to another, both included. */
function hexLine(from: HexCoord, to: HexCoord): HexCoord[] {
  const n = hexDistance(to.q - from.q, to.r - from.r);
  const out: HexCoord[] = [];
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    const [fq, fr] = [from.q + (to.q - from.q) * t, from.r + (to.r - from.r) * t];
    const fs = -fq - fr;
    let [q, r, sc] = [Math.round(fq), Math.round(fr), Math.round(fs)];
    const [dq, dr, ds] = [Math.abs(q - fq), Math.abs(r - fr), Math.abs(sc - fs)];
    if (dq > dr && dq > ds) q = -r - sc;
    else if (dr > ds) r = -q - sc;
    out.push({ q, r });
  }
  return out;
}

/** Where a point of the board lands when the whole board is turned `k` sixths of a turn clockwise (y down). */
function turned(x: number, y: number, k: number): [number, number] {
  const a = (k * Math.PI) / 3;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}

const placeKey = (x: number, y: number) => `${Math.round(x * 100)},${Math.round(y * 100)}`;

/**
 * Coast edges of an isle that face away from the middle of the board (never the side towards the
 * mainland). With `joined`, only edges with a corner where two of the isle's hexes meet: a harbor
 * there sits between two tiles, so settling at that end gets two resources as well as the harbor.
 */
function outerCoast(topo: Topology, terrains: Terrain[], ids: number[], joined = false) {
  const mine = new Set(ids);
  const landAt = (v: number) => topo.vertices[v].hexes.filter((h) => mine.has(h)).length;
  return topo.edges.filter((e) => {
    const own = e.hexes.find((h) => mine.has(h));
    if (own === undefined || !e.hexes.some((h) => terrains[h] === 'sea')) return false;
    if (joined && landAt(e.a) < 2 && landAt(e.b) < 2) return false;
    const h = topo.hexes[own];
    const [dx, dy] = [e.x - h.x, e.y - h.y];
    return (dx * h.x + dy * h.y) / (Math.hypot(dx, dy) * Math.hypot(h.x, h.y)) > 0.3;
  });
}

/** Up to `n` of `edges`, drawn at random, none sharing a corner with another or with `used`. */
function pickApart<T extends { a: number; b: number }>(rng: RngHolder, edges: T[], n: number, used = new Set<number>()): T[] {
  const out: T[] = [];
  const taken = new Set(used);
  for (const e of shuffle(rng, edges)) {
    if (out.length === n) break;
    if (taken.has(e.a) || taken.has(e.b)) continue;
    taken.add(e.a).add(e.b);
    out.push(e);
  }
  return out;
}

/** The six outer isles of the Citadel (five hexes, in the north), as they lie on the board; the rest are this one turned. */
const CITADEL_ISLE: HexCoord[] = [{ q: 3, r: -7 }, { q: 4, r: -7 }, { q: 2, r: -6 }, { q: 3, r: -6 }, { q: 4, r: -6 }];

/** What the Citadel's 18 fogged hexes hide, dealt at random. */
const CITADEL_FOG: Partial<Record<LandTerrain, number>> = { forest: 4, hills: 5, fields: 5, pasture: 4 };

/** The rim of ore: three of each number from 3 to 11 (no 7), 24 in all. */
const CITADEL_ORE_TOKENS = [3, 4, 5, 6, 8, 9, 10, 11].flatMap((n) => [n, n, n]);

/**
 * The Citadel (shown as Ironbound), for up to six players: a hexagonal island of four rings around a gold field (always a 6
 * or an 8). Ring 1 is six forests; ring 2 has a pond at each corner, with a 2:1 lumber harbor on the
 * forest beside it, and fog between; ring 3 has a desert at each corner and fog between (18 fogged
 * hexes in all); ring 4 is all ore, numbered 3 to 11. A hex of sea lies all around it, and beyond that
 * six isles of five hexes with no ore, turned about the centre so no isle is nearer or shaped better
 * than another. Each isle's numbers are one 6 or 8 and a 4, 5, 9 and 10. Every isle may have three 3:1
 * harbors, all on the sides facing away from the mainland, laid out the same on each. The pirate
 * starts in the open sea, as far from any land as it can be.
 */
export function citadelBoard(rng: RngHolder): Board {
  const distance = hexDistance;
  const isles = [0, 1, 2, 3, 4, 5].map((k) => CITADEL_ISLE.map((h) => rotate(h, k)));
  const nearIsle = (q: number, r: number) => isles.some((tiles) => tiles.some((t) => distance(q - t.q, r - t.r) <= 1));
  const coords: HexCoord[] = [];
  for (let r = -9; r <= 9; r++) for (let q = -9; q <= 9; q++) {
    if (distance(q, r) <= 6 || nearIsle(q, r)) coords.push({ q, r });
  }
  const topo = getTopology(coords);
  const terrains: Terrain[] = topo.hexes.map(() => 'sea');
  const straight = (h: { q: number; r: number }) => h.q === 0 || h.r === 0 || h.q + h.r === 0;
  const ring = (h: { q: number; r: number }) => distance(h.q, h.r);
  const centre = topo.hexAt(0, 0)!;
  const forest = topo.hexes.filter((h) => ring(h) === 1).map((h) => h.id);
  const ponds = topo.hexes.filter((h) => ring(h) === 2 && straight(h)).map((h) => h.id);
  const fog = topo.hexes.filter((h) => (ring(h) === 2 || ring(h) === 3) && !straight(h)).map((h) => h.id);
  const desert = topo.hexes.filter((h) => ring(h) === 3 && straight(h)).map((h) => h.id);
  const ore = topo.hexes.filter((h) => ring(h) === 4).map((h) => h.id);
  const isleIds = isles.map((tiles) => tiles.map((t) => topo.hexAt(t.q, t.r)!));

  terrains[centre] = 'gold';
  for (const id of forest) terrains[id] = 'forest';
  for (const id of desert) terrains[id] = 'desert';
  for (const id of ore) terrains[id] = 'mountains';
  shuffle(rng, bag(CITADEL_FOG)).forEach((t, i) => { terrains[fog[i]] = t; });
  // No ore on the isles: each has one of every other resource and a fifth, repeating one of them.
  const homeBag: Terrain[] = ['forest', 'hills', 'pasture', 'fields'];
  for (const ids of isleIds) shuffle(rng, [...homeBag, homeBag[randomInt(rng, homeBag.length)]]).forEach((t, i) => { terrains[ids[i]] = t; });

  const fixed: (number | null)[] = topo.hexes.map(() => null);
  fixed[centre] = shuffle(rng, [6, 8])[0];
  // Each isle has exactly one 6 or 8: three isles a 6, three an 8.
  const reds = shuffle(rng, [6, 6, 6, 8, 8, 8]);
  const tokens = spreadRedTokens(rng, topo, [
    ...isleIds.map((ids, k): [number[], number[]] => [ids, [reds[k], 4, 5, 9, 10]]),
    [forest, [3, 4, 5, 9, 10, 11]],
    [ore, [...CITADEL_ORE_TOKENS]],
    [fog, balancedTokens(fog.length)],
  ], fixed);

  const hexes = hexesOf(topo, terrains, tokens);
  for (const ids of isleIds) for (const id of ids) hexes[id].start = true;
  for (const id of fog) hexes[id].fog = true;

  // A lumber harbor on the edge between each pond and the ring-1 forest beside it (fog may hide forests too).
  const harbors: Harbor[] = ponds.map((pond) => {
    const wood = topo.hexes[pond].neighbors.find((n) => forest.includes(n))!;
    return { edge: topo.edges.find((e) => e.hexes.includes(pond) && e.hexes.includes(wood))!.id, kind: 'lumber' as const };
  });
  // Three harbors per isle, drawn once on the first isle and turned onto the others.
  const edgeAt = new Map(topo.edges.map((e) => [placeKey(e.x, e.y), e.id]));
  for (const e of pickApart(rng, outerCoast(topo, terrains, isleIds[0]), 3)) {
    for (let k = 0; k < 6; k++) {
      const [x, y] = turned(e.x, e.y, k);
      harbors.push({ edge: edgeAt.get(placeKey(x, y))!, kind: 'any' });
    }
  }

  // The pirate starts in the open sea as far from every coast as it gets, so nobody is hurt early on.
  const land = topo.hexes.filter((h) => terrains[h.id] !== 'sea');
  const clearance = (h: { q: number; r: number }) => Math.min(...land.map((l) => distance(h.q - l.q, h.r - l.r)));
  const seas = topo.hexes.filter((h) => terrains[h.id] === 'sea').map((h) => ({ id: h.id, gap: clearance(h) }));
  const widest = Math.max(...seas.map((x) => x.gap));
  const oceans = seas.filter((x) => x.gap === widest).map((x) => x.id);
  return { hexes, harbors, pirateStart: oceans[randomInt(rng, oceans.length)], robberStart: desert[randomInt(rng, desert.length)] };
}

/**
 * One of Zealand's six fogged isles (ten hexes, in the north-east), as it lies on the board; the
 * other five are this one turned about the centre. Copied from the reference board hex by hex.
 */
const ZEALAND_ISLE: HexCoord[] = [
  { q: 3, r: -7 }, { q: 4, r: -7 },
  { q: 3, r: -6 }, { q: 4, r: -6 }, { q: 5, r: -6 }, { q: 6, r: -6 },
  { q: 4, r: -5 }, { q: 5, r: -5 }, { q: 6, r: -5 },
  { q: 5, r: -4 },
];

/** What the six fogged isles of Zealand hide, dealt at random across all of them (60 hexes, all land). */
const zealandFog = (gold: boolean): Partial<Record<LandTerrain, number>> =>
  gold ? { forest: 13, hills: 13, fields: 13, mountains: 13, pasture: 6, gold: 2 } : { forest: 14, hills: 14, fields: 14, mountains: 14, pasture: 4 };

/** The 18 sheep numbers: good ones, never a 2 or a 12. */
const ZEALAND_SHEEP_TOKENS = [3, 3, 4, 4, 5, 5, 5, 6, 6, 8, 8, 9, 9, 9, 10, 10, 11, 11];

/**
 * Zealand: everyone starts on one island of sheep (pasture), a ring of 18 hexes around a lake, with twelve
 * wool 2:1 harbors on its shore, two on each side, each between two tiles. Two sea hexes out lie the isles, ten
 * hexes each, under fog; settling one is worth a point. Twelve harbors line the isles' outer coasts, two on
 * each, between two tiles: a 3:1 and a 2:1, laid out the same way on every isle. With `gold`, two gold fields (each a 6 or
 * an 8) hide among them. A one-hex desert island lies far out at sea, at least three sea hexes from
 * the nearest isle, where the robber starts; sailing there is rewarded with three treasures on its
 * corners. Every isle has three treasures on its coast, one on the side facing the mainland and two on
 * the outer side (18), so 21 in all, each a random kind. The pirate starts beside the desert island, on its
 * outer side.
 */
export function zealandBoard(rng: RngHolder, gold = true): Board {
  const distance = hexDistance;
  const isles = [0, 1, 2, 3, 4, 5].map((k) => ZEALAND_ISLE.map((h) => rotate(h, k)));
  const landed = new Set(isles.flat().map((h) => `${h.q},${h.r}`));
  const nearIsle = (q: number, r: number) => isles.some((tiles) => tiles.some((t) => distance(q - t.q, r - t.r) <= 1));
  // The desert island lies far out, on a hex at least four steps (three sea hexes between) from every isle.
  const far: HexCoord[] = [];
  for (let r = -12; r <= 12; r++) for (let q = -12; q <= 12; q++) {
    const d = distance(q, r);
    if (d >= 9 && d <= 11 && isles.every((tiles) => tiles.every((t) => distance(q - t.q, r - t.r) >= 4))) far.push({ q, r });
  }
  const spot = far[randomInt(rng, far.length)];
  const coords: HexCoord[] = [];
  const have = new Set<string>();
  const add = (q: number, r: number) => {
    if (have.has(`${q},${r}`)) return;
    have.add(`${q},${r}`);
    coords.push({ q, r });
  };
  for (let r = -9; r <= 9; r++) for (let q = -9; q <= 9; q++) {
    if (distance(q, r) <= 6 || nearIsle(q, r)) add(q, r);
  }
  // The sea round the desert island, and a lane of sea back to the isles for ships to sail.
  for (let r = spot.r - 2; r <= spot.r + 2; r++) for (let q = spot.q - 2; q <= spot.q + 2; q++) {
    if (distance(q - spot.q, r - spot.r) <= 2) add(q, r);
  }
  for (const h of hexLine({ q: 0, r: 0 }, spot)) {
    for (let r = h.r - 1; r <= h.r + 1; r++) for (let q = h.q - 1; q <= h.q + 1; q++) {
      if (distance(q - h.q, r - h.r) <= 1 && distance(q, r) >= 5) add(q, r);
    }
  }
  const topo = getTopology(coords);
  const terrains: Terrain[] = topo.hexes.map(() => 'sea');
  const home = topo.hexes.filter((h) => distance(h.q, h.r) >= 1 && distance(h.q, h.r) <= 2).map((h) => h.id);
  const fogged = topo.hexes.filter((h) => landed.has(`${h.q},${h.r}`)).map((h) => h.id);
  const isleIds = isles.map((tiles) => tiles.map((t) => topo.hexAt(t.q, t.r)!));
  for (const id of home) terrains[id] = 'pasture';
  // Two gold fields never touch (each is a 6 or an 8).
  const goldTouches = () => fogged.some((id) => terrains[id] === 'gold' && topo.hexes[id].neighbors.some((n) => terrains[n] === 'gold'));
  do shuffle(rng, bag(zealandFog(gold))).forEach((t, i) => { terrains[fogged[i]] = t; }); while (goldTouches());

  const desert = topo.hexAt(spot.q, spot.r)!;
  terrains[desert] = 'desert';

  const fixed: (number | null)[] = topo.hexes.map(() => null);
  for (const id of fogged) if (terrains[id] === 'gold') fixed[id] = shuffle(rng, [6, 8])[0];
  const land = fogged.filter((id) => terrains[id] !== 'gold');
  const homeTokens = dealTokens(rng, topo, [[home, [...ZEALAND_SHEEP_TOKENS]]], topo.hexes.map(() => null), false);
  const tokens = spreadRedTokens(rng, topo, [[land, balancedTokens(land.length)]], fixed.map((t, id) => t ?? homeTokens[id]));

  const hexes = hexesOf(topo, terrains, tokens);
  for (const id of home) hexes[id].start = true;
  for (const id of fogged) hexes[id].fog = true;

  // Twelve wool harbors on the sheep island, two on each of its six sides: one at every place where two
  // of its outer tiles meet, on the coast edge just clockwise of it. Each therefore sits between two
  // tiles, no two share a corner, and every side looks the same.
  const homeSet = new Set(home);
  const turn = (x: number, y: number) => {
    const a = Math.atan2(x, -y);
    return a < 0 ? a + 2 * Math.PI : a;
  };
  const rim = (e: { hexes: number[] }) => e.hexes.some((h) => homeSet.has(h)) && e.hexes.some((h) => terrains[h] === 'sea' && distance(topo.hexes[h].q, topo.hexes[h].r) >= 3);
  const harbors: Harbor[] = [];
  for (const v of topo.vertices) {
    if (v.hexes.filter((h) => homeSet.has(h)).length !== 2 || !v.hexes.some((h) => terrains[h] === 'sea' && distance(topo.hexes[h].q, topo.hexes[h].r) >= 3)) continue;
    const next = v.edges.map((id) => topo.edges[id]).filter(rim).map((e) => ({ e, other: e.a === v.id ? e.b : e.a }))
      .map(({ e, other }) => ({ e, ahead: (turn(topo.vertices[other].x, topo.vertices[other].y) - turn(v.x, v.y) + 2 * Math.PI) % (2 * Math.PI) }))
      .sort((p, q) => p.ahead - q.ahead)[0];
    harbors.push({ edge: next.e.id, kind: 'wool' });
  }
  // Twelve more on the isles' outer coasts, two on each. Fair: the two spots are drawn once, on the
  // first isle, and turned onto the others; each isle gets one 3:1 and one 2:1 (every resource once,
  // the sixth isle's a repeat).
  const edgeAt = new Map(topo.edges.map((e) => [placeKey(e.x, e.y), e.id]));
  const specials: HarborKind[] = shuffle(rng, [...RESOURCES, RESOURCES[randomInt(rng, RESOURCES.length)]]);
  pickApart(rng, outerCoast(topo, terrains, isleIds[0], true), 2).forEach((e, i) => {
    for (let k = 0; k < 6; k++) {
      const [x, y] = turned(e.x, e.y, k);
      harbors.push({ edge: edgeAt.get(placeKey(x, y))!, kind: i === 0 ? 'any' : specials[k] });
    }
  });

  // Treasures, on corners of land hexes that a ship can reach: three on every isle, one on the side
  // facing the mainland and two on the outer side. Drawn once on the first isle and turned onto the
  // rest, and never on a harbor's corner or touching another treasure.
  const vertexAt = new Map(topo.vertices.map((v) => [placeKey(v.x, v.y), v.id]));
  const harborCorners = new Set(harbors.flatMap((h) => [topo.edges[h.edge].a, topo.edges[h.edge].b]));
  const first = new Set(isleIds[0]);
  const [cx, cy] = [isleIds[0].reduce((n, id) => n + topo.hexes[id].x, 0) / 10, isleIds[0].reduce((n, id) => n + topo.hexes[id].y, 0) / 10];
  const reach = Math.hypot(cx, cy);
  /** How far a corner lies beyond the isle's middle, away from the board's centre (negative: towards it). */
  const outward = (v: { x: number; y: number }) => ((v.x - cx) * cx + (v.y - cy) * cy) / reach;
  const shore = topo.vertices.filter((v) => !harborCorners.has(v.id) && v.hexes.some((h) => first.has(h)) && v.hexes.some((h) => terrains[h] === 'sea'));
  const inner = shore.filter((v) => outward(v) < -1);
  const outer = shore.filter((v) => outward(v) > 1);
  // Three on the desert island, on every other corner of its one hex.
  const around = topo.hexes[desert].vertices;
  const parity = randomInt(rng, 2);
  const chests: number[] = [];
  for (let i = parity; i < 6; i += 2) chests.push(around[i]);
  const clear = (v: number, among: number[]) => among.every((o) => o !== v && !topo.vertices[o].vertices.includes(v));
  for (const side of [inner, outer, outer]) {
    const pick = shuffle(rng, side).find((v) => {
      const orbit = [0, 1, 2, 3, 4, 5].map((k) => {
        const [x, y] = turned(v.x, v.y, k);
        return vertexAt.get(placeKey(x, y))!;
      });
      return orbit.every((id, i) => clear(id, chests) && clear(id, orbit.slice(i + 1)));
    });
    if (!pick) throw new Error('No room for the isle treasures');
    for (let k = 0; k < 6; k++) {
      const [x, y] = turned(pick.x, pick.y, k);
      chests.push(vertexAt.get(placeKey(x, y))!);
    }
  }
  const treasures: Treasure[] = chests.map((vertex) => ({ vertex, kind: TREASURE_KINDS[randomInt(rng, TREASURE_KINDS.length)] }));

  // The pirate starts beside the desert island, on its outer side.
  const beside = topo.hexes[desert].neighbors.filter((n) => distance(topo.hexes[n].q, topo.hexes[n].r) >= distance(spot.q, spot.r));
  return { hexes, harbors, pirateStart: beside[randomInt(rng, beside.length)], robberStart: desert, treasures };
}

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
 * Veiled Isles: the home island is dealt like the base game's. Under the fog: always exactly 2 sea,
 * 0–1 gold, the rest random resource terrain, numbered at random from 3, 4, 5, 6, 8, 9, 10, 11
 * (repeats allowed: the rules call it completely random). Which fog hexes hold the sea is shuffled.
 * The contents are drawn now with the game's seeded RNG and kept server-side until revealed, the
 * same as Black Forest. Fifteen treasures lie on the reference board's chest corners, one reward
 * each from a shuffled 5/4/3/3 deck.
 */
export function veiledIslesBoard(rng: RngHolder): Board {
  const L = VEILED_ISLES;
  const topo = getTopology(L.coords);
  const terrains: Terrain[] = L.codes.map(() => 'sea');
  const main = idsOf(L, (c) => c === 'M');
  const fog = idsOf(L, (c) => c === 'f');
  dealMain(rng, main, terrains);

  const seas = VEILED_FOG_SEAS;
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

  // Nine harbors in fixed spots on the home island's coast; their kinds are shuffled.
  const kinds = shuffle(rng, [...HARBOR_KINDS]);
  const harbors: Harbor[] = VEILED_HARBORS.map(([row, col, angle], i) => ({ edge: sideOf(topo, L.at(row, col), angle), kind: kinds[i] }));
  return { hexes, harbors, pirateStart: L.codes.indexOf('P'), treasures };
}
