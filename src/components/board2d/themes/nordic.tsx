import { alongRoad, OUTLINE, pc, RoadBase } from './shared';
import { grassTuft, pebbles } from './classic';
import type { BarbarianShipGlyph, KnightGlyph, PieceGlyph, RoadGlyph, ThemePieces, TileAccents } from './types';

/**
 * A Norse gable end: walls under a steep roof whose two bargeboards run on past the ridge and cross
 * in an X, as on a longhouse. `w` is half the roof's width, `h` the roof's height, walls from `top` to `foot`.
 */
function Gable({ x, top, foot, w, h, c, door }: { x: number; top: number; foot: number; w: number; h: number; c: { hex: string; dark: string }; door?: boolean }) {
  const apex = top - h;
  // Past the ridge, each board carries on along its own slope for a short way.
  const over = 7;
  const dx = (over * w) / Math.hypot(w, h);
  const dy = (over * h) / Math.hypot(w, h);
  return (
    <>
      <rect x={x - w + 3} y={top} width={2 * (w - 3)} height={foot - top} fill={c.hex} />
      <path d={`M${x - w} ${top}L${x} ${apex}L${x + w} ${top}Z`} fill={c.hex} />
      <path d={`M${x - w} ${top}L${x + dx} ${apex - dy}M${x + w} ${top}L${x - dx} ${apex - dy}`} stroke={c.dark} fill="none" strokeLinecap="round" />
      {door && <rect x={x - 4} y={foot - 10} width="8" height="10" fill={c.dark} />}
    </>
  );
}

/** Nordic Fjords' settlement: a small longhouse, its steep gable topped by crossed bargeboards. */
const nordicSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <Gable x={x} top={y + 1} foot={y + 15} w={18} h={16} c={c} door />
    </g>
  );
};

/** Nordic Fjords' city: a great hall with a smaller hall behind it, both with crossed bargeboards. */
const nordicCity: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <Gable x={x + 13} top={y + 3} foot={y + 17} w={14} h={12} c={c} />
      <Gable x={x - 7} top={y - 1} foot={y + 17} w={21} h={19} c={c} door />
    </g>
  );
};

/** Nordic Fjords' road: split log planks, dark rings at intervals showing the cut log ends. */
const nordicRoad: RoadGlyph = ({ x1, y1, x2, y2, color, ghost, k = 1 }) => {
  const seg = { x1, y1, x2, y2 };
  if (ghost) return <RoadBase {...seg} color={color} ghost k={k} />;
  return (
    <>
      <RoadBase {...seg} color={color} k={k} />
      {[-0.3, -0.1, 0.1, 0.3].map((t) => {
        const p = alongRoad(seg, t);
        return <circle key={t} cx={p.x} cy={p.y} r={2.6 * k} fill="#3a2a1a" opacity="0.85" />;
      })}
    </>
  );
};

/** Nordic Fjords' knight: a viking's horned helmet. */
const nordicKnight: KnightGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth="2" strokeLinejoin="round">
      <path d={`M${x - 9} ${y + 8}a9 9 0 0 1 18 0Z`} fill={c.hex} />
      <path d={`M${x - 9} ${y + 2}q-8-2-10-10M${x + 9} ${y + 2}q8-2 10-10`} stroke={c.dark} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </g>
  );
};

export const nordicPieces: ThemePieces = { settlement: nordicSettlement, city: nordicCity, road: nordicRoad, knight: nordicKnight };

/** Nordic Fjords on the 2D board: a dragon-headed drakkar under a black-and-white sail. */
export const nordicShip: BarbarianShipGlyph = ({ danger }) => {
  const hull = danger ? '#c23a2a' : '#2f2418';
  const black = danger ? '#4a2624' : '#1f1a17';
  const white = danger ? '#f3d9d3' : '#e8e2d2';
  return (
    <g pointerEvents="none">
      <path d="M-26 8h52l-10 14h-32Z" fill={hull} stroke="#0d0a07" strokeWidth="2.5" strokeLinejoin="round" />
      {/* the carved dragon head rearing up from the prow, on a curved neck */}
      <path d="M22 6q2-14 13-20" fill="none" stroke="#1c1712" strokeWidth="5" strokeLinecap="round" />
      <path d="M29-13q11-6 16 0q2 4-3 7q-7 3-13-1Z" fill="#1c1712" stroke="#0d0a07" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="40" cy="-13" r="2" fill={white} />
      <rect x="-1.5" y="-36" width="3" height="45" fill="#1c1712" />
      <path d="M-18-32h17v32h-17Z" fill={black} stroke="#0d0a07" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M-1-32h17v32h-17Z" fill={white} stroke="#0d0a07" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="-14" cy="15" r="4" fill={black} stroke="#0d0a07" strokeWidth="1.2" />
      <circle cx="0" cy="16" r="4" fill={white} stroke="#0d0a07" strokeWidth="1.2" />
      <circle cx="14" cy="15" r="4" fill={black} stroke="#0d0a07" strokeWidth="1.2" />
    </g>
  );
};

export const nordicAccents: TileAccents = {
  side: ({ terrain, x, y, c }) => {
    switch (terrain) {
      case 'forest':
        // A snowy spruce.
        return (
          <g>
            <path d={`M${x} ${y - 13}l8 11h-16Z M${x} ${y - 5}l10 12h-20Z`} fill={c.accent} />
            <path d={`M${x} ${y - 13}l4.5 6.3h-9Z M${x} ${y - 5}l5.6 6.7q-5.6 2-11.2 0Z`} fill="#f4f9fc" />
            <rect x={x - 1.5} y={y + 7} width="3" height="4" fill="#5a3d22" />
          </g>
        );
      case 'hills':
        return pebbles(x, y, c.accent, c.side);
      case 'pasture':
        // Heather.
        return (
          <g fill="#96729f">
            <path d={`M${x - 8} ${y + 9}l3-9M${x} ${y + 9}v-12M${x + 8} ${y + 9}l-3-8`} stroke="#5f7a4a" strokeWidth="2" fill="none" />
            <circle cx={x - 8} cy={y - 1} r="3.4" />
            <circle cx={x} cy={y - 5} r="3.8" />
            <circle cx={x + 6} cy={y - 1} r="3.2" />
            <circle cx={x - 3} cy={y + 2} r="2.8" />
          </g>
        );
      case 'fields':
        return grassTuft(x, y, c.side);
      case 'mountains':
        // A snow-capped peak.
        return (
          <g strokeLinejoin="round">
            <path d={`M${x - 14} ${y + 9}l14-23 14 23Z`} fill="#6f737c" />
            <path d={`M${x - 8} ${y - 2}l8-12 8 12-4 3-4-3-4 3Z`} fill="#f4f9fc" />
          </g>
        );
      case 'desert':
        // A snow drift.
        return <path d={`M${x - 15} ${y + 7}q15-16 30 0Z`} fill="#f4f9fc" stroke={c.accent} strokeWidth="1.4" />;
      default:
        return null;
    }
  },
  desert: ({ x, y, c }) => (
    <g>
      <g fill="#f4f9fc" stroke={c.accent} strokeWidth="1.4">
        <path d={`M${x - 30} ${y + 24}q18-20 38 0Z`} />
        <path d={`M${x - 6} ${y + 24}q18-15 36 0Z`} />
      </g>
      <g fill="#7c8791" stroke="#5f6a73" strokeWidth="1.4">
        <rect x={x - 16} y={y - 14} width="7" height="32" rx="1.5" transform={`rotate(-8 ${x - 12} ${y + 2})`} />
        <rect x={x - 3} y={y - 22} width="7" height="40" rx="1.5" transform={`rotate(3 ${x} ${y - 2})`} />
        <rect x={x + 11} y={y - 10} width="6" height="28" rx="1.5" transform={`rotate(10 ${x + 14} ${y + 4})`} />
      </g>
    </g>
  ),
};
