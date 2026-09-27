import type { Topology } from '@/engine/board/topology';

/**
 * Where the barbarian ship's voyage runs: a compact zigzag of touching hex steps (like a strip of
 * honeycomb) west of the island, clear of the harbors. Positions are in the same topology-local
 * units as everything else (board hexes have radius 1; `y` reads as world z in 3D, screen y in 2D),
 * so one computation drives both boards and every board size/layout.
 */
export interface BarbarianLayout {
  /** Circumradius of a (pointy-top) step hex. */
  r: number;
  /** Centre of step `i` (0 = farthest from the island, the last one is the landing). */
  at: (i: number) => { x: number; y: number };
  /** Centre of the status header above the first step (barbarian strength vs. knight defense). */
  header: { x: number; y: number };
  /** Farthest point of the track from the island's centre; widen camera framing to at least this. */
  reach: number;
}

/** Step size: about a third of a board hex, like colonist's track. */
export const BARBARIAN_STEP_R = 0.34;
/** From the island's westmost corner to the column's axis: past the harbors (piers and boats reach ~0.8) with open sea between. */
const WEST_CLEARANCE = 2.1;
/** Room above the first step for the status header. */
export const BARBARIAN_HEADER_H = 0.75;

export function barbarianTrackLayout(topo: Topology, steps: number): BarbarianLayout {
  const xs = topo.vertices.map((v) => v.x);
  const ys = topo.vertices.map((v) => v.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cx = (minX + Math.max(...xs)) / 2;
  const cy = (minY + maxY) / 2;
  const axis = minX - WEST_CLEARANCE;
  // Neighbouring pointy-top hexes sit 1.5 r apart vertically and √3/2 r apart sideways: alternate
  // either side of the axis so each step touches the next. The field (header + steps) is centred
  // on the island vertically.
  const r = BARBARIAN_STEP_R;
  const height = BARBARIAN_HEADER_H + 2 * r + (steps - 1) * 1.5 * r;
  const first = cy - height / 2 + BARBARIAN_HEADER_H + r;
  const at = (i: number) => ({ x: axis + (i % 2 ? 1 : -1) * (Math.sqrt(3) / 4) * r, y: first + i * 1.5 * r });
  const header = { x: axis, y: first - r - BARBARIAN_HEADER_H / 2 };
  const reach = Math.hypot(cx - axis + 0.8, height / 2) + 0.3;
  return { r, at, header, reach };
}
