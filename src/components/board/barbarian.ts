import type { Topology } from '@/engine/board/topology';

/**
 * Where the barbarian ship's voyage runs: a vertical column of sea-steps just west of the island,
 * clear of any harbor pier (piers reach ~0.62 past the coast). Positions are in the same
 * topology-local units as everything else (`x`, and `y` — read as world z in 3D, screen y in 2D),
 * so one computation drives both boards and every board size/layout.
 */
export interface BarbarianLayout {
  /** Column x, just west of the island's westmost vertex. */
  x: number;
  /** y (3D z / 2D screen y) of step `i` (0 = far, farthest from the island), i in [0, steps). */
  y: (i: number) => number;
  /** Farthest point of the track from the island's centre; widen camera framing to at least this. */
  reach: number;
}

/** Clears a harbor pier's reach (0.62) plus a step's own radius and a small gap. */
const WEST_CLEARANCE = 1.05;
/** Spacing between steps: a compact ladder rather than stretched across the whole coastline. */
const STEP_SPACING = 0.62;
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
  const x = minX - WEST_CLEARANCE;
  const span = (steps - 1) * STEP_SPACING;
  // Starts level with the island's own northmost point — never sticking up further than the island
  // already does, which keeps it clear of a phone's top HUD cards — and runs south from there, so
  // the landing lands near the island's centre rather than past it, clear of the bottom-left zoom
  // controls on a narrow screen (both pin to screen corners the game's own framing already clears).
  const y = (i: number) => minY + NORTH_MARGIN + i * STEP_SPACING;
  const dx = cx - x;
  const reach = Math.max(Math.hypot(dx, cy - minY), Math.hypot(dx, y(steps - 1) - cy)) + 0.4;
  return { x, y, reach };
}
