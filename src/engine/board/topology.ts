/**
 * Hex-grid topology (pointy-top, axial coordinates). Everything here is derived from the list of
 * hex coordinates, so it is recomputed identically on server and client and never stored in state.
 *
 * Corners are keyed in a scaled integer space: hex centre (2q + r, 3r), corner offsets
 * N(0,-2) NE(1,-1) SE(1,1) S(0,2) SW(-1,1) NW(-1,-1). World units (hex radius 1):
 * x = X·√3/2, y = Y/2.
 */

export interface HexCoord {
  q: number;
  r: number;
}

export interface TopoHex {
  id: number;
  q: number;
  r: number;
  /** Centre in world units. */
  x: number;
  y: number;
  /** Corner vertex ids in order N, NE, SE, S, SW, NW. */
  vertices: number[];
  /** Side edge ids; edge i joins corner i and corner i+1. */
  edges: number[];
  /** Neighbouring hex ids on the board. */
  neighbors: number[];
}

export interface TopoVertex {
  id: number;
  x: number;
  y: number;
  hexes: number[];
  vertices: number[];
  edges: number[];
  coastal: boolean;
}

export interface TopoEdge {
  id: number;
  a: number;
  b: number;
  hexes: number[];
  /** Midpoint in world units and direction angle (radians). */
  x: number;
  y: number;
  angle: number;
  coastal: boolean;
}

export interface Topology {
  hexes: TopoHex[];
  vertices: TopoVertex[];
  edges: TopoEdge[];
  /** Coastal edge ids ordered clockwise starting near 12 o'clock. */
  coast: number[];
  hexAt(q: number, r: number): number | undefined;
  edgeBetween(a: number, b: number): number | undefined;
}

const CORNERS: [number, number][] = [
  [0, -2],
  [1, -1],
  [1, 1],
  [0, 2],
  [-1, 1],
  [-1, -1],
];

const AXIAL_DIRECTIONS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

const SQRT3_2 = Math.sqrt(3) / 2;

/** The standard 19-hex board (radius 2), row by row from the top. */
export const STANDARD_HEX_COORDS: HexCoord[] = (() => {
  const out: HexCoord[] = [];
  for (let r = -2; r <= 2; r++) {
    for (let q = -2; q <= 2; q++) {
      if (Math.abs(q + r) <= 2) out.push({ q, r });
    }
  }
  return out;
})();

/** The 5–6 player island: rows of 3-4-5-6-5-4-3 hexes, centred half a hex left of the origin. */
export const LARGE_HEX_COORDS: HexCoord[] = (() => {
  const rows: [r: number, q0: number, q1: number][] = [
    [-3, 0, 2],
    [-2, -1, 2],
    [-1, -2, 2],
    [0, -3, 2],
    [1, -3, 1],
    [2, -3, 0],
    [3, -3, -1],
  ];
  const out: HexCoord[] = [];
  for (const [r, q0, q1] of rows) for (let q = q0; q <= q1; q++) out.push({ q, r });
  return out;
})();

/** Black Forest: a centre island, a lake (ring 1, left out) and three rings of land (rings 2–4). */
export const BLACK_FOREST_HEX_COORDS: HexCoord[] = (() => {
  const out: HexCoord[] = [];
  for (let r = -4; r <= 4; r++) {
    for (let q = -4; q <= 4; q++) {
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
      if (ring <= 4 && ring !== 1) out.push({ q, r });
    }
  }
  return out;
})();

const cache = new Map<string, Topology>();
/** Fast path: the same hex array object (e.g. one game state) maps straight to its topology. */
const byArray = new WeakMap<readonly HexCoord[], Topology>();

export function topologyKey(coords: readonly HexCoord[]): string {
  return coords.map((c) => `${c.q},${c.r}`).join(';');
}

export function getTopology(coords: readonly HexCoord[]): Topology {
  let topo = byArray.get(coords);
  if (topo) return topo;
  const key = topologyKey(coords);
  topo = cache.get(key);
  if (!topo) {
    topo = buildTopology(coords);
    cache.set(key, topo);
  }
  byArray.set(coords, topo);
  return topo;
}

function buildTopology(coords: readonly HexCoord[]): Topology {
  const vertexIds = new Map<string, number>();
  const vertices: TopoVertex[] = [];
  const edgeIds = new Map<string, number>();
  const edges: TopoEdge[] = [];
  const hexIndex = new Map<string, number>();
  coords.forEach((c, i) => hexIndex.set(`${c.q},${c.r}`, i));

  const hexes: TopoHex[] = coords.map((c, id) => {
    const cx = 2 * c.q + c.r;
    const cy = 3 * c.r;
    const corner: number[] = CORNERS.map(([dx, dy]) => {
      const X = cx + dx;
      const Y = cy + dy;
      const k = `${X},${Y}`;
      let vid = vertexIds.get(k);
      if (vid === undefined) {
        vid = vertices.length;
        vertexIds.set(k, vid);
        vertices.push({ id: vid, x: X * SQRT3_2, y: Y / 2, hexes: [], vertices: [], edges: [], coastal: false });
      }
      vertices[vid].hexes.push(id);
      return vid;
    });
    const side: number[] = corner.map((a, i) => {
      const b = corner[(i + 1) % 6];
      const k = a < b ? `${a}-${b}` : `${b}-${a}`;
      let eid = edgeIds.get(k);
      if (eid === undefined) {
        eid = edges.length;
        edgeIds.set(k, eid);
        const va = vertices[a];
        const vb = vertices[b];
        edges.push({
          id: eid,
          a: Math.min(a, b),
          b: Math.max(a, b),
          hexes: [],
          x: (va.x + vb.x) / 2,
          y: (va.y + vb.y) / 2,
          angle: Math.atan2(vb.y - va.y, vb.x - va.x),
          coastal: false,
        });
        va.vertices.push(b);
        vb.vertices.push(a);
        va.edges.push(eid);
        vb.edges.push(eid);
      }
      edges[eid].hexes.push(id);
      return eid;
    });
    const neighbors = AXIAL_DIRECTIONS.map(([dq, dr]) => hexIndex.get(`${c.q + dq},${c.r + dr}`)).filter(
      (n): n is number => n !== undefined,
    );
    return { id, q: c.q, r: c.r, x: cx * SQRT3_2, y: cy / 2, vertices: corner, edges: side, neighbors };
  });

  for (const e of edges) {
    if (e.hexes.length === 1) {
      e.coastal = true;
      vertices[e.a].coastal = true;
      vertices[e.b].coastal = true;
    }
  }

  // Board centre, then order the coast clockwise by angle measured from 12 o'clock.
  const centre = hexes.reduce((acc, h) => ({ x: acc.x + h.x / hexes.length, y: acc.y + h.y / hexes.length }), {
    x: 0,
    y: 0,
  });
  const clockAngle = (x: number, y: number) => {
    const a = Math.atan2(x - centre.x, -(y - centre.y));
    return a < 0 ? a + 2 * Math.PI : a;
  };
  const coast = edges
    .filter((e) => e.coastal)
    .sort((e1, e2) => clockAngle(e1.x, e1.y) - clockAngle(e2.x, e2.y))
    .map((e) => e.id);

  return {
    hexes,
    vertices,
    edges,
    coast,
    hexAt: (q, r) => hexIndex.get(`${q},${r}`),
    edgeBetween: (a, b) => edgeIds.get(a < b ? `${a}-${b}` : `${b}-${a}`),
  };
}
