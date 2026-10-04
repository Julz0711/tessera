import { alongRoad, OUTLINE, pc, RoadBase } from './shared';
import type { BarbarianShipGlyph, KnightGlyph, PieceGlyph, RoadGlyph, ThemePieces, TileAccents } from './types';

/** Frontier's settlement: a ranch house, a gable roof over a porch awning. */
const frontierSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <rect x={x - 16} y={y - 1} width="32" height="16" fill={c.hex} />
      <path d={`M${x - 18} ${y - 1}L${x} ${y - 15}L${x + 18} ${y - 1}Z`} fill={c.dark} />
      <rect x={x - 20} y={y + 9} width="40" height="4" fill={c.dark} />
    </g>
  );
};

/** Frontier's city: a saloon, a tall false front with a sign, a porch awning on posts and swinging doors. */
const frontierCity: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      {/* the stepped false front, its raised middle carrying the cornice and the sign */}
      <path d={`M${x - 22} ${y + 17}V${y - 12}H${x - 15}V${y - 22}H${x + 15}V${y - 12}H${x + 22}V${y + 17}Z`} fill={c.hex} />
      <rect x={x - 17} y={y - 26} width="34" height="5" fill={c.dark} />
      <rect x={x - 12} y={y - 17} width="24" height="8" fill={c.dark} />
      <rect x={x - 25} y={y + 3} width="50" height="4" fill={c.dark} />
      <path d={`M${x - 19} ${y + 7}v10M${x + 19} ${y + 7}v10`} stroke={c.dark} strokeWidth="2.6" strokeLinecap="round" />
      <path d={`M${x - 7} ${y + 7}v10M${x + 7} ${y + 7}v10`} stroke={c.dark} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
};

/** Frontier's road: a railroad track, dark ties under a pair of thin rails. */
const frontierRoad: RoadGlyph = ({ x1, y1, x2, y2, color, ghost, k = 1 }) => {
  const seg = { x1, y1, x2, y2 };
  if (ghost) return <RoadBase {...seg} color={color} ghost k={k} />;
  const railA1 = alongRoad(seg, -0.46, 3 * k);
  const railA2 = alongRoad(seg, 0.46, 3 * k);
  const railB1 = alongRoad(seg, -0.46, -3 * k);
  const railB2 = alongRoad(seg, 0.46, -3 * k);
  return (
    <>
      <RoadBase {...seg} color={color} k={k} />
      {[-0.3, -0.1, 0.1, 0.3].map((t) => {
        const a = alongRoad(seg, t, 7 * k);
        const b = alongRoad(seg, t, -7 * k);
        return <line key={t} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#2a2018" strokeWidth={2.6 * k} />;
      })}
      <line x1={railA1.x} y1={railA1.y} x2={railA2.x} y2={railA2.y} stroke="#c9c2b0" strokeWidth={1.2 * k} opacity="0.85" />
      <line x1={railB1.x} y1={railB1.y} x2={railB2.x} y2={railB2.y} stroke="#c9c2b0" strokeWidth={1.2 * k} opacity="0.85" />
    </>
  );
};

/** Frontier's knight: a cowboy's wide-brim hat. */
const frontierKnight: KnightGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth="2" strokeLinejoin="round">
      <ellipse cx={x} cy={y + 3} rx="12" ry="3.4" fill={c.hex} />
      <path d={`M${x - 6} ${y + 3}a6 8 0 0 1 12 0Z`} fill={c.hex} />
      <line x1={x - 4} y1={y - 3} x2={x + 4} y2={y - 3} stroke={c.dark} strokeWidth="2" />
    </g>
  );
};

export const frontierPieces: ThemePieces = { settlement: frontierSettlement, city: frontierCity, road: frontierRoad, knight: frontierKnight };

/** Frontier on the 2D board: an outlaws' paddle steamer, twin smokestacks and a big stern wheel. */
export const frontierShip: BarbarianShipGlyph = ({ danger }) => {
  const hull = danger ? '#c23a2a' : '#efe8d8';
  const deck = danger ? '#8a1f14' : '#b3402e';
  const smoke = danger ? '#f3ddd3' : '#e4dccb';
  return (
    <g pointerEvents="none">
      <path d="M-28 6h56l-6 14h-44Z" fill={hull} stroke="#2a2018" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="-13" y="-6" width="26" height="14" fill={deck} stroke="#2a2018" strokeWidth="2" />
      {[-8, 4].map((sx) => (
        <g key={sx}>
          <rect x={sx} y="-24" width="4" height="20" fill="#2a2622" />
          <circle cx={sx + 2} cy="-28" r="4" fill={smoke} opacity="0.9" />
          <circle cx={sx + 5} cy="-33" r="5" fill={smoke} opacity="0.75" />
        </g>
      ))}
      {/* the stern wheel, at the back */}
      <circle cx="-24" cy="8" r="11" fill="none" stroke="#8a4a2a" strokeWidth="2.6" />
      {[0, 45, 90, 135].map((a) => (
        <line key={a} x1="-24" y1="8" x2={-24 + 11 * Math.cos((a * Math.PI) / 180)} y2={8 + 11 * Math.sin((a * Math.PI) / 180)} stroke="#8a4a2a" strokeWidth="2" />
      ))}
    </g>
  );
};

export const frontierAccents: TileAccents = {
  side: ({ terrain, x, y, c }) => {
    switch (terrain) {
      case 'forest':
        // A tall pine.
        return <path d={`M${x} ${y - 14}l7 11h-14Z M${x} ${y - 7}l9 12h-18Z M${x} ${y}l11 13h-22Z`} fill={c.accent} />;
      case 'hills':
        // Adobe bricks drying, stacked two and one.
        return (
          <g fill={c.accent} stroke={c.side} strokeWidth="1.2">
            <rect x={x - 13} y={y + 2} width="12" height="7" />
            <rect x={x + 1} y={y + 2} width="12" height="7" />
            <rect x={x - 6} y={y - 6} width="12" height="7" />
          </g>
        );
      case 'pasture':
        // A split-rail fence.
        return (
          <g>
            <path d={`M${x - 11} ${y + 9}v-16M${x} ${y + 9}v-16M${x + 11} ${y + 9}v-16`} stroke="#7a5a3a" strokeWidth="2.6" strokeLinecap="round" />
            <path d={`M${x - 13} ${y - 3}h26M${x - 13} ${y + 3}h26`} stroke="#8a6a44" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      case 'fields':
        // Corn stalks.
        return (
          <g strokeLinecap="round">
            <path d={`M${x - 6} ${y + 10}v-20M${x + 6} ${y + 10}v-20`} stroke={c.side} strokeWidth="3" />
            <path d={`M${x - 6} ${y + 1}l-6-4M${x - 6} ${y - 5}l6-4M${x + 6} ${y + 1}l6-4M${x + 6} ${y - 5}l-6-4`} stroke="#6f8a3a" strokeWidth="2" />
          </g>
        );
      case 'mountains':
        // A mine cart on its rail.
        return (
          <g>
            <path d={`M${x - 14} ${y + 10}h28`} stroke="#4a4a4a" strokeWidth="2" />
            <path d={`M${x - 10} ${y - 4}h20l-3 12h-14Z`} fill="#5a5a5a" stroke="#2f2f2f" strokeWidth="1.6" strokeLinejoin="round" />
            <path d={`M${x - 6} ${y - 4}l3-4 4 4 3-3 3 3`} fill="#b8bcc4" stroke="#6d717a" strokeWidth="1.4" />
            <circle cx={x - 6} cy={y + 9} r="2.4" fill="#2f2f2f" />
            <circle cx={x + 6} cy={y + 9} r="2.4" fill="#2f2f2f" />
          </g>
        );
      case 'desert':
        // A small saguaro.
        return (
          <path
            d={`M${x - 4} ${y + 10}v-22a4 4 0 0 1 8 0v22Z M${x + 4} ${y + 1}h7v-9 M${x - 4} ${y + 4}h-7v-8`}
            fill="#5f8f4a"
            stroke="#5f8f4a"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        );
      default:
        return null;
    }
  },
  desert: ({ x, y, c }) => (
    <g>
      <ellipse cx={x} cy={y + 26} rx="30" ry="5" fill="#000" opacity="0.12" />
      <path d={`M${x - 26} ${y + 24}l7-30h38l7 30Z`} fill={c.accent} />
      <path d={`M${x - 22} ${y - 6}h44`} stroke="#8f4a2a" strokeWidth="3" />
      <path d={`M${x - 24} ${y + 6}h48`} stroke="#8f4a2a" strokeWidth="2" opacity="0.6" />
      <path
        d={`M${x + 20} ${y + 26}v-30a4.5 4.5 0 0 1 9 0v30Z M${x + 29} ${y + 8}h8v-11 M${x + 20} ${y + 12}h-8v-9`}
        fill="#5f8f4a"
        stroke="#5f8f4a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </g>
  ),
};
