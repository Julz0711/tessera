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
  /** Farthest point of the track from the island's centre; widen camera framing to at least this. */
  reach: number;
}

/** Step size: about a third of a board hex, like colonist's track. */
export const BARBARIAN_STEP_R = 0.34;
/** From the island's westmost corner to the column's axis: past the harbors (piers and boats reach ~0.8) with open sea between. */
const WEST_CLEARANCE = 1.75;
/** A little south of the island's own northmost point, so the ship's badges clear a phone's top HUD cards. */
const NORTH_MARGIN = 0.3;

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
  // either side of the axis so each step touches the next.
  const at = (i: number) => ({ x: axis + (i % 2 ? 1 : -1) * (Math.sqrt(3) / 4) * BARBARIAN_STEP_R, y: minY + NORTH_MARGIN + i * 1.5 * BARBARIAN_STEP_R });
  const dx = cx - axis + 1;
  const reach = Math.max(Math.hypot(dx, cy - minY), Math.hypot(dx, at(steps - 1).y - cy)) + 0.4;
  return { r: BARBARIAN_STEP_R, at, reach };
}
