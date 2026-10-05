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
 * The dark outline on every piece (settlements, cities and the road's border), in board units at
 * the medium Board size, so all pieces read as one family. Details inside a piece (doors, windows,
 * trim) use thinner lines.
 */
export const OUTLINE = 3.5;

/** Roads are drawn slimmer than their base size (the `k` a road glyph gets is scaled by this) so settlements and cities stay the focus. */
export const ROAD_WEIGHT = 0.78;

/**
 * The classic road: the owner's colour with a dark border as thick as the settlements' and cities'
 * outline; a single thinner line in just the owner's colour while it's a ghost (build hint /
 * placement preview), matching how the road looked before themes had their own drawings.
 */
export function RoadBase({ x1, y1, x2, y2, color, ghost, k = 1 }: Seg & { color: PlayerColor; ghost?: boolean; k?: number }) {
  const c = pc(color);
  if (ghost) {
    return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.hex} strokeWidth={11 * k} strokeLinecap="round" />;
  }
  // `k` already includes ROAD_WEIGHT; the border follows the pieces' size instead, so it matches them.
  const border = (OUTLINE * k) / ROAD_WEIGHT;
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.dark} strokeWidth={12 * k + 2 * border} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.hex} strokeWidth={12 * k} strokeLinecap="round" />
    </>
  );
}

/** A flagpole rising `h` from (x, y) with a swallow-tailed pennant in `accent`, for the metropolises. */
export function Pennant({ x, y, h, accent, dark, left = false }: { x: number; y: number; h: number; accent: string; dark: string; left?: boolean }) {
  const top = y - h;
  const d = left ? -1 : 1;
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={top} stroke={dark} strokeWidth="2.4" strokeLinecap="round" />
      <path d={`M${x} ${top}h${13 * d}l${-4 * d} 4.5 ${4 * d} 4.5h${-13 * d}Z`} fill={accent} stroke={dark} strokeWidth="2" strokeLinejoin="round" />
    </g>
  );
}

/** The classic metropolis outline: a battlemented keep between two lower towers, standing on y + 17. */
export function castlePath(x: number, y: number) {
  const tower = (l: number) => `M${l} ${y + 17}V${y - 12}h4v3h4v-3h4V${y + 17}Z`;
  return `${tower(x - 27)}${tower(x + 15)}M${x - 14} ${y + 17}V${y - 30}h6v4h5v-4h6v4h5v-4h6V${y + 17}Z`;
}
