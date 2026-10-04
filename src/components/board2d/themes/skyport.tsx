import { alongRoad, OUTLINE, pc, RoadBase } from './shared';
import type { BarbarianShipGlyph, KnightGlyph, PieceGlyph, RoadGlyph, ThemePieces, TileAccents } from './types';

const BRASS = '#b08d57';
const SMOKE = '#f3ece4';

/** Skyport's settlement: a brass cottage, a riveted dome roof over a snug cabin. */
const skyportSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <rect x={x - 14} y={y + 1} width="28" height="14" fill={c.hex} />
      <path d={`M${x - 16} ${y + 1}a16 15 0 0 1 32 0Z`} fill={c.dark} />
      <circle cx={x - 9} cy={y - 6} r="1.6" fill={BRASS} />
      <circle cx={x} cy={y - 11} r="1.6" fill={BRASS} />
      <circle cx={x + 9} cy={y - 6} r="1.6" fill={BRASS} />
    </g>
  );
};

/** Skyport's city: a steampunk tower, a domed cap over a riveted shaft with a gauge and vent pipe. */
const skyportCity: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <rect x={x - 21} y={y - 22} width="42" height="40" rx="2" fill={c.hex} />
      <path d={`M${x - 21} ${y - 22}a21 10 0 0 1 42 0Z`} fill={c.dark} />
      <circle cx={x} cy={y - 6} r="9" fill="none" stroke={BRASS} strokeWidth="2.8" />
      <path d={`M${x + 21} ${y + 5}q11 0 11-11v-10`} stroke={BRASS} strokeWidth="3.4" fill="none" strokeLinecap="round" />
    </g>
  );
};

/** Skyport's road: a copper pipe, brass rivets studding the coloured line. */
const skyportRoad: RoadGlyph = ({ x1, y1, x2, y2, color, ghost, k = 1 }) => {
  const seg = { x1, y1, x2, y2 };
  if (ghost) return <RoadBase {...seg} color={color} ghost k={k} />;
  return (
    <>
      <RoadBase {...seg} color={color} k={k} />
      {[-0.3, -0.1, 0.1, 0.3].map((t) => {
        const p = alongRoad(seg, t);
        return <circle key={t} cx={p.x} cy={p.y} r={2.2 * k} fill={BRASS} stroke="#5a4527" strokeWidth={0.8 * k} />;
      })}
    </>
  );
};

/** Skyport's knight: a sky-marine's flight cap and round brass-rimmed goggles. */
const skyportKnight: KnightGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth="2" strokeLinejoin="round">
      <path d={`M${x - 9} ${y + 8}q-1-14 9-14t9 14q-9 3-18 0Z`} fill={c.hex} />
      <circle cx={x - 5} cy={y - 1} r="3.4" fill="#dce7ea" stroke="#3a3a3a" strokeWidth="1.4" />
      <circle cx={x + 5} cy={y - 1} r="3.4" fill="#dce7ea" stroke="#3a3a3a" strokeWidth="1.4" />
      <line x1={x - 1.6} y1={y - 1} x2={x + 1.6} y2={y - 1} stroke="#3a3a3a" strokeWidth="1.4" />
    </g>
  );
};

export const skyportPieces: ThemePieces = { settlement: skyportSettlement, city: skyportCity, road: skyportRoad, knight: skyportKnight };

/** Skyport on the 2D board: a dark pirate airship, drawn a little higher above its step. */
export const skyportShip: BarbarianShipGlyph = ({ danger }) => {
  const envelope = danger ? '#c23a2a' : '#2b241e';
  const trim = danger ? '#e0503a' : BRASS;
  return (
    <g pointerEvents="none" transform="translate(0 -14)">
      <ellipse cx="0" cy="0" rx="26" ry="11" fill={envelope} stroke="#171310" strokeWidth="2.5" />
      <path d="M-26 0q4 6 14 7M26 0q-4 6-14 7" fill="none" stroke={trim} strokeWidth="2" />
      <rect x="-9" y="9" width="18" height="7" rx="2" fill="#241c14" stroke="#171310" strokeWidth="2" />
      {[-5, 5].map((px) => (
        <line key={px} x1={px} y1="16" x2={px} y2="21" stroke={trim} strokeWidth="2" />
      ))}
      <path d="M18 4l9-3-2 6Z M18-4l9 3-2-6Z" fill={trim} />
    </g>
  );
};


/** The outline of a gear with `teeth` teeth, `r` to the tips. */
function gearPoints(x: number, y: number, r: number, teeth: number): string {
  const n = teeth * 4;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = Math.floor(i / 2) % 2 === 0 ? r : r * 0.78;
    return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`;
  }).join(' ');
}

/** Skyport's tile accents: smoke, a chimney, a mini turbine, gears — small steampunk bits. */
export const skyportAccents: TileAccents = {
  side: ({ terrain, x, y, c }) => {
    switch (terrain) {
      case 'forest':
        return (
          <g>
            <rect x={x - 2} y={y + 3} width="4" height="9" fill="#5a4230" />
            <circle cx={x} cy={y - 3} r="10" fill={c.accent} />
            <circle cx={x - 3} cy={y - 6} r="3.5" fill="#4a8052" opacity="0.7" />
          </g>
        );
      case 'hills':
        return (
          <g>
            <rect x={x - 4} y={y - 6} width="8" height="18" fill={c.accent} />
            <rect x={x - 5.5} y={y - 8} width="11" height="3.5" fill="#4a2012" />
            <g fill={SMOKE} opacity="0.9">
              <circle cx={x + 3} cy={y - 12} r="3.4" />
              <circle cx={x + 8} cy={y - 17} r="4.2" />
            </g>
          </g>
        );
      case 'pasture':
        return (
          <g>
            <path d={`M${x} ${y + 11}V${y - 1}`} stroke="#7a5f36" strokeWidth="2.6" />
            {[0, 120, 240].map((a) => (
              <ellipse key={a} cx={x} cy={y - 9} rx="2.4" ry="7" fill={BRASS} transform={`rotate(${a} ${x} ${y - 2})`} />
            ))}
            <circle cx={x} cy={y - 2} r="2.4" fill="#7a5f36" />
          </g>
        );
      case 'fields':
        return (
          <g stroke={c.side} strokeWidth="2.6" strokeLinecap="round">
            <path d={`M${x - 8} ${y + 9}v-14M${x} ${y + 9}v-18M${x + 8} ${y + 9}v-14`} />
          </g>
        );
      case 'mountains':
        return (
          <g>
            <path d={`M${x - 13} ${y + 9}l13-22 13 22Z`} fill="#6f6b66" />
            <path d={`M${x - 5} ${y - 4}l5-9 5 9-3 2-2-2-2 2Z`} fill="#eef1f4" />
          </g>
        );
      case 'desert':
        return (
          <g>
            <polygon points={gearPoints(x, y, 10, 7)} fill={c.accent} stroke="#7a5f36" strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx={x} cy={y} r="3.2" fill="#7a5f36" />
          </g>
        );
      default:
        return null;
    }
  },
  desert: ({ x, y, c }) => (
    <g>
      <path d={`M${x - 28} ${y + 22}q28-12 56 0v6h-56Z`} fill={c.top} opacity="0.6" />
      <polygon points={gearPoints(x - 8, y - 4, 22, 8)} fill={c.accent} stroke="#7a5f36" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={x - 8} cy={y - 4} r="6.5" fill="#7a5f36" />
      <polygon points={gearPoints(x + 18, y + 12, 13, 6)} fill={BRASS} stroke="#7a5f36" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={x + 18} cy={y + 12} r="3.8" fill="#7a5f36" />
    </g>
  ),
};
