import type { PlayerColor } from '@/engine/types';
import { PLAYER_COLORS } from '@/shared/colors';

/** A road's endpoints, already inset from the vertices the way Board2D draws them. */
export type Seg = { x1: number; y1: number; x2: number; y2: number };

/** A player's piece colours (fill, dark trim, and the ink used on light fills). */
export function pc(color: PlayerColor) {
  return PLAYER_COLORS[color];
}

/** Direction, perpendicular and midpoint of a road segment, for placing decorations along it. */
export function segGeom({ x1, y1, x2, y2 }: Seg) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return { len, ux, uy, px: -uy, py: ux, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
}

/**
 * A point at fraction `t` of the segment's length from its midpoint (so -0.5..0.5 spans it),
 * offset `o` to the side (perpendicular units, positive = to the left of a→b).
 */
export function alongRoad(seg: Seg, t: number, o = 0) {
  const g = segGeom(seg);
  return { x: g.mx + g.ux * t * g.len + g.px * o, y: g.my + g.uy * t * g.len + g.py * o };
}

/**
 * The classic road: a dark outline under the owner's colour, full width; a single thinner line in
 * just the owner's colour while it's a ghost (build hint / placement preview), matching how the
 * road looked before themes had their own drawings.
 */
export function RoadBase({ x1, y1, x2, y2, color, ghost, k = 1 }: Seg & { color: PlayerColor; ghost?: boolean; k?: number }) {
  const c = pc(color);
  if (ghost) {
    return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.hex} strokeWidth={11 * k} strokeLinecap="round" />;
  }
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.dark} strokeWidth={20 * k} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.hex} strokeWidth={12 * k} strokeLinecap="round" />
    </>
  );
}
