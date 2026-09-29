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

/**
 * Where a harbor's marker sits: out from its edge into the water. On sea maps a coast edge has a
 * land and a sea hex; the marker goes out from the land one. Harbors on a one-hex pond (Heartlake's
 * lake, a hole in the board) stay close to the shore so the markers on opposite banks don't pile up.
 */
export function harborAnchor(
  topo: Topology,
  hexes: readonly Pick<Hex, 'terrain'>[],
  edge: number,
  reach: number,
): { x: number; y: number; ox: number; oy: number } {
  const e = topo.edges[edge];
  const land = topo.hexes[e.hexes.find((h) => hexes[h]?.terrain !== 'sea') ?? e.hexes[0]];
  const dx = e.x - land.x;
  const dy = e.y - land.y;
  const len = Math.hypot(dx, dy) || 1;
  const ox = dx / len;
  const oy = dy / len;
  const side = land.edges.indexOf(edge);
  let out = reach;
  if (side >= 0) {
    const q = land.q + ACROSS[side][0];
    const r = land.r + ACROSS[side][1];
    const pond = topo.hexAt(q, r) === undefined && AROUND.every(([a, b]) => topo.hexAt(q + a, r + b) !== undefined);
    if (pond) out = Math.min(reach, 0.34);
  }
  return { x: e.x + ox * out, y: e.y + oy * out, ox, oy };
}
