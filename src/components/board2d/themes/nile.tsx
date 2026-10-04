import { alongRoad, OUTLINE, pc, RoadBase } from './shared';
import type { BarbarianShipGlyph, KnightGlyph, PieceGlyph, RoadGlyph, ThemePieces, TileAccents } from './types';

/** Nile's settlement: a mud-brick house, tapered walls under a flat parapet roof. */
const nileSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <path d={`M${x - 14} ${y + 15}L${x - 11} ${y - 8}H${x + 11}L${x + 14} ${y + 15}Z`} fill={c.hex} />
      <rect x={x - 13} y={y - 13} width="26" height="6" fill={c.dark} />
      <path d={`M${x - 10} ${y - 17}h4v4h-4Z M${x - 2} ${y - 17}h4v4h-4Z M${x + 6} ${y - 17}h4v4h-4Z`} fill={c.dark} />
    </g>
  );
};

/** Nile's city: a temple, twin battered pylon towers flanking a doorway, an obelisk beside it. */
const nileCity: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <path d={`M${x - 26} ${y + 17}L${x - 20} ${y - 14}H${x - 6}V${y + 17}Z`} fill={c.hex} />
      <path d={`M${x + 26} ${y + 17}L${x + 20} ${y - 14}H${x + 6}V${y + 17}Z`} fill={c.hex} />
      <rect x={x - 6} y={y - 2} width="12" height="19" fill={c.dark} />
      <rect x={x + 14} y={y - 28} width="4" height="24" fill={c.hex} />
      <path d={`M${x + 14} ${y - 28}L${x + 16} ${y - 34}L${x + 18} ${y - 28}Z`} fill={c.dark} />
    </g>
  );
};

/** Nile's road: cut stone slabs, seam lines crossing the coloured causeway. */
const nileRoad: RoadGlyph = ({ x1, y1, x2, y2, color, ghost, k = 1 }) => {
  const seg = { x1, y1, x2, y2 };
  if (ghost) return <RoadBase {...seg} color={color} ghost k={k} />;
  return (
    <>
      <RoadBase {...seg} color={color} k={k} />
      {[-0.3, -0.1, 0.1, 0.3].map((t) => {
        const a = alongRoad(seg, t, 6 * k);
        const b = alongRoad(seg, t, -6 * k);
        return <line key={t} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#5a4a34" strokeWidth={1.6 * k} opacity="0.7" />;
      })}
    </>
  );
};

/** Nile's knight: a guard's nemes headdress, its lappets falling past the shoulders. */
const nileKnight: KnightGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth="2" strokeLinejoin="round">
      <path d={`M${x - 9} ${y + 9}q-2-14 9-14t9 14q-9 3-18 0Z`} fill={c.hex} />
      <path d={`M${x - 9} ${y + 3}l-4 8M${x + 9} ${y + 3}l4 8`} stroke={c.dark} strokeWidth="2.4" fill="none" />
    </g>
  );
};

export const nilePieces: ThemePieces = { settlement: nileSettlement, city: nileCity, road: nileRoad, knight: nileKnight };

/** A date palm with its trunk's foot at (x, y + 14). */
function Palm({ x, y, leaf }: { x: number; y: number; leaf: string }) {
  return (
    <g>
      <path d={`M${x} ${y + 14}q3-11 0-22`} stroke="#7a5a3a" strokeWidth="3" fill="none" />
      <path d={`M${x} ${y - 8}q-9-6-17 2M${x} ${y - 8}q9-6 17 2M${x} ${y - 8}q-5-9-13-11M${x} ${y - 8}q5-9 13-11`} stroke={leaf} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx={x - 3} cy={y - 5} r="2" fill="#8a4a22" />
      <circle cx={x + 3} cy={y - 5} r="2" fill="#8a4a22" />
    </g>
  );
}

/** Nile on the 2D board: a reed boat, its papyrus hull curling up at both ends, under a lateen sail. */
export const nileShip: BarbarianShipGlyph = ({ danger }) => {
  const hull = danger ? '#c23a2a' : '#d4a84a';
  const sail = danger ? '#f3d9d3' : '#f4efe0';
  return (
    <g pointerEvents="none">
      <path d="M-24 12q4-10 24-10t24 10q-4 8-24 8t-24-8Z" fill={hull} stroke="#5a3d22" strokeWidth="2.5" strokeLinejoin="round" />
      {/* the papyrus bundle curls up at both bow and stern */}
      <path d="M-24 12q-10-4-9-16q1-8 8-8" fill="none" stroke={hull} strokeWidth="5" strokeLinecap="round" />
      <path d="M24 12q10-4 9-16q-1-8-8-8" fill="none" stroke={hull} strokeWidth="5" strokeLinecap="round" />
      <rect x="-1.5" y="-30" width="3" height="30" fill="#5a3d22" />
      <path d="M-1-28l16 4 2 26h-18Z" fill={sail} stroke="#1f1a14" strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  );
};

export const nileAccents: TileAccents = {
  side: ({ terrain, x, y, c }) => {
    switch (terrain) {
      case 'forest':
        return <Palm x={x} y={y} leaf={c.accent} />;
      case 'hills':
        // Clay jars.
        return (
          <g>
            <ellipse cx={x - 6} cy={y + 2} rx="6" ry="8" fill="#a85a34" />
            <rect x={x - 8} y={y - 9} width="4" height="4" fill="#a85a34" />
            <ellipse cx={x + 7} cy={y + 4} rx="5" ry="6.5" fill="#94502e" />
            <rect x={x + 5} y={y - 5} width="4" height="4" fill="#94502e" />
          </g>
        );
      case 'pasture':
        // Papyrus reeds.
        return (
          <g fill="none" strokeLinecap="round">
            <path d={`M${x - 6} ${y + 10}v-16M${x} ${y + 10}v-20M${x + 6} ${y + 10}v-14`} stroke={c.side} strokeWidth="2.4" />
            <path d={`M${x - 6} ${y - 6}l-5-3M${x - 6} ${y - 6}l5-3M${x} ${y - 10}l-5-3M${x} ${y - 10}l5-3M${x + 6} ${y - 4}l-4-3M${x + 6} ${y - 4}l4-3`} stroke="#6a9a44" strokeWidth="2" />
          </g>
        );
      case 'fields':
        // Wheat rows.
        return <path d={`M${x - 8} ${y + 10}v-18M${x} ${y + 10}v-22M${x + 8} ${y + 10}v-18`} stroke={c.side} strokeWidth="3" strokeLinecap="round" />;
      case 'mountains':
        // Cut quarry blocks.
        return (
          <g fill="#d8cfbf" stroke="#9a948a" strokeWidth="1.4">
            <rect x={x - 12} y={y + 1} width="12" height="9" />
            <rect x={x + 1} y={y + 1} width="12" height="9" />
            <rect x={x - 6} y={y - 8} width="12" height="9" />
          </g>
        );
      case 'desert':
        // A small pyramid.
        return (
          <g>
            <path d={`M${x - 13} ${y + 9}L${x} ${y - 11}L${x + 13} ${y + 9}Z`} fill={c.accent} />
            <path d={`M${x} ${y - 11}L${x + 13} ${y + 9}H${x}Z`} fill="#b8903a" />
          </g>
        );
      default:
        return null;
    }
  },
  desert: ({ x, y, c }) => (
    <g>
      <path d={`M${x - 28} ${y + 24}L${x - 4} ${y - 24}L${x + 20} ${y + 24}Z`} fill={c.accent} />
      <path d={`M${x - 4} ${y - 24}L${x + 20} ${y + 24}H${x - 4}Z`} fill="#b8903a" />
      <path d={`M${x + 12} ${y + 24}L${x + 24} ${y + 4}L${x + 36} ${y + 24}Z`} fill={c.accent} />
      <path d={`M${x + 24} ${y + 4}L${x + 36} ${y + 24}H${x + 24}Z`} fill="#b8903a" />
    </g>
  ),
};
