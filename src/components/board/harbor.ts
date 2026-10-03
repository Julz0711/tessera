import type { Topology } from '@/engine/board/topology';
import type { Hex } from '@/engine/types';

/** Axial step to the neighbour across each hex side (side i joins corners i and i+1: N, NE, SE, S, SW, NW). */
const ACROSS: [number, number][] = [
  [1, -1],
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
];
const AROUND: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

/** The land hex a harbor edge belongs to, and the axial spot of the water hex across from it. */
function harborSides(topo: Topology, hexes: readonly Pick<Hex, 'terrain'>[], edge: number) {
  const e = topo.edges[edge];
  const land = topo.hexes[e.hexes.find((h) => hexes[h]?.terrain !== 'sea') ?? e.hexes[0]];
  const side = land.edges.indexOf(edge);
  const across = side >= 0 ? { q: land.q + ACROSS[side][0], r: land.r + ACROSS[side][1] } : null;
  return { e, land, across };
}

/**
 * Where the pirate sits in its sea hex: the middle, unless harbors face the hex. Then it moves on
 * across, away from their shores, so it doesn't sit on their markers.
 */
export function pirateSpot(topo: Topology, hexes: readonly Pick<Hex, 'terrain'>[], hex: number, harbors: readonly number[]): { x: number; y: number } {
  const h = topo.hexes[hex];
  let dx = 0;
  let dy = 0;
  for (const edge of harbors) {
    const { e, land, across } = harborSides(topo, hexes, edge);
    if (across?.q !== h.q || across.r !== h.r) continue;
    const len = Math.hypot(e.x - land.x, e.y - land.y) || 1;
    dx += (e.x - land.x) / len;
    dy += (e.y - land.y) / len;
  }
  const len = Math.hypot(dx, dy);
  return len ? { x: h.x + (dx / len) * 0.32, y: h.y + (dy / len) * 0.32 } : { x: h.x, y: h.y };
}

/**
 * Where a harbor's marker sits: out from its edge into the water. On sea maps a coast edge has a
 * land and a sea hex; the marker goes out from the land one. Markers stay close to the shore where
 * they'd otherwise crowd something: on a one-hex pond (Heartlake's lake, a hole in the board) the
 * markers on opposite banks, on a sea hex of the board (Voyagers) the pirate in its middle, and
 * closest of all when two harbors face the same water hex (pass every harbor edge as `harbors`).
 */
export function harborAnchor(
  topo: Topology,
  hexes: readonly Pick<Hex, 'terrain'>[],
  edge: number,
  reach: number,
  harbors: readonly number[] = [],
): { x: number; y: number; ox: number; oy: number } {
  const { e, land, across } = harborSides(topo, hexes, edge);
  const dx = e.x - land.x;
  const dy = e.y - land.y;
  const len = Math.hypot(dx, dy) || 1;
  const ox = dx / len;
  const oy = dy / len;
  let out = reach;
  if (across) {
    const { q, r } = across;
    const onBoard = topo.hexAt(q, r) !== undefined;
    const pond = !onBoard && AROUND.every(([a, b]) => topo.hexAt(q + a, r + b) !== undefined);
    const shared = harbors.some((other) => {
      if (other === edge) return false;
      const there = harborSides(topo, hexes, other).across;
      return there?.q === q && there.r === r;
    });
    if (shared) out = Math.min(reach, 0.22);
    else if (pond || onBoard) out = Math.min(reach, 0.34);
  }
  return { x: e.x + ox * out, y: e.y + oy * out, ox, oy };
}
