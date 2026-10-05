import { Glow, Neon } from './glow';
import { OUTLINE, pc, RoadBase } from './shared';
import type { BarbarianShipGlyph, MetropolisGlyph, PieceGlyph, RoadGlyph, ThemePieces, TileAccents } from './types';

const PINK = '#ff3d9a';
const CYAN = '#3de8ff';
const MINT = '#3dffb0';

/** Cyberpunk's settlement: a neon-edged block, a crisp glow line traced round the coloured body. */
const cyberpunkSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g>
      <rect x={x - 14} y={y - 12} width="28" height="27" fill={c.hex} stroke={c.dark} strokeWidth={OUTLINE} />
      <Neon d={`M${x - 14} ${y - 12}h28v27h-28Z`} color={c.hex} width={1.6} />
      <rect x={x - 9} y={y - 6} width="6" height="6" fill="#0d0b14" />
      <rect x={x + 3} y={y - 6} width="6" height="6" fill="#0d0b14" />
    </g>
  );
};

/** Cyberpunk's city: a skyscraper, a neon-edged tower with a grid of lit windows. */
const cyberpunkCity: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g>
      <rect x={x - 14} y={y - 28} width="28" height="45" fill={c.hex} stroke={c.dark} strokeWidth={OUTLINE} />
      <Neon d={`M${x - 14} ${y - 28}h28v45h-28Z`} color={c.hex} width={1.6} />
      {[-18, -8, 2, 12].flatMap((dy) =>
        [-8, 4].map((dx) => (
          <rect key={`${dx}${dy}`} x={x + dx} y={y + dy} width="5" height="6" fill={(dx + dy) % 3 === 0 ? MINT : CYAN} opacity="0.9" />
        )),
      )}
    </g>
  );
};

/** Cyberpunk's road: a glowing neon strip, a soft colour halo under the crisp coloured lane. */
const cyberpunkRoad: RoadGlyph = ({ x1, y1, x2, y2, color, ghost, k = 1 }) => {
  const seg = { x1, y1, x2, y2 };
  const c = pc(color);
  if (ghost) return <RoadBase {...seg} color={color} ghost k={k} />;
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.hex} strokeWidth={26 * k} strokeOpacity="0.22" strokeLinecap="round" />
      <RoadBase {...seg} color={color} k={k} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={2 * k} strokeOpacity="0.35" strokeLinecap="round" />
    </>
  );
};

/** Cyberpunk's metropolis: twin towers, the taller one banded in neon of the track's colour. */
const cyberpunkMetropolis: MetropolisGlyph = ({ x, y, color, accent }) => {
  const c = pc(color);
  return (
    <g>
      <line x1={x + 12} y1={y - 38} x2={x + 12} y2={y - 46} stroke={c.dark} strokeWidth="2.4" />
      <Glow x={x + 12} y={y - 47} r={2.4} color={accent} />
      <rect x={x - 24} y={y - 20} width="20" height="37" fill={c.hex} stroke={c.dark} strokeWidth={OUTLINE} />
      <rect x={x} y={y - 38} width="24" height="55" fill={c.hex} stroke={c.dark} strokeWidth={OUTLINE} />
      <Neon d={`M${x} ${y - 38}h24v55h-24Z`} color={c.hex} width={1.6} />
      {[-12, -2, 8].flatMap((dy) =>
        [-20, -12].map((dx) => <rect key={`l${dx}${dy}`} x={x + dx} y={y + dy} width="5" height="6" fill={(dx + dy) % 3 === 0 ? MINT : CYAN} opacity="0.9" />),
      )}
      {[-22, -12, -2, 8].flatMap((dy) =>
        [5, 14].map((dx) => <rect key={`r${dx}${dy}`} x={x + dx} y={y + dy} width="5" height="6" fill={(dx + dy) % 3 === 0 ? MINT : CYAN} opacity="0.9" />),
      )}
      <Neon d={`M${x + 1} ${y - 31}h22`} color={accent} width={3} />
    </g>
  );
};

export const cyberpunkPieces: ThemePieces = { settlement: cyberpunkSettlement, city: cyberpunkCity, road: cyberpunkRoad, metropolis: cyberpunkMetropolis };

/** Cyberpunk on the 2D board: a low, dark hover-speedboat with cyan and magenta glow strips. */
export const cyberpunkShip: BarbarianShipGlyph = ({ danger }) => {
  const hull = danger ? '#c23a2a' : '#141220';
  const stripColor = danger ? '#ff2d4a' : undefined;
  return (
    <g pointerEvents="none">
      <path d="M-28 10h56l-9 6h-38Z" fill={hull} stroke="#05030a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M-10-4h20l5 12h-30Z" fill="#0d0b18" stroke="#05030a" strokeWidth="2" strokeLinejoin="round" />
      <rect x="-20" y="-24" width="5" height="18" fill={hull} />
      <Neon d="M-25 6h48" color={stripColor ?? CYAN} width={2.6} />
      <Neon d="M-25 13h48" color={stripColor ?? PINK} width={2.6} />
    </g>
  );
};


/** Cyberpunk's tile accents: glowing pines, scrap, antennas, grow racks and ore veins. */
export const cyberpunkAccents: TileAccents = {
  side: ({ terrain, x, y, c }) => {
    switch (terrain) {
      case 'forest':
        return (
          <g>
            <path d={`M${x} ${y - 12}l9 17h-18Z M${x} ${y - 4}l11 17h-22Z`} fill="#12281f" stroke={c.accent} strokeWidth="0.8" strokeOpacity="0.6" />
            <Glow x={x} y={y - 13} r={2.2} color={c.accent} />
          </g>
        );
      case 'hills':
        return (
          <g>
            <g fill="#b35a3e" stroke="#4e2418" strokeWidth="1">
              <rect x={x - 12} y={y + 3} width="11" height="6.5" />
              <rect x={x + 1} y={y + 3} width="11" height="6.5" />
              <rect x={x - 6} y={y - 4} width="11" height="6.5" />
            </g>
            <Neon d={`M${x - 13} ${y + 12}h26`} color={c.accent} width={1.8} />
          </g>
        );
      case 'pasture':
        return (
          <g>
            <path d={`M${x} ${y + 10}V${y - 8}M${x - 6} ${y + 10}h12`} stroke="#8a93a3" strokeWidth="2" />
            <path d={`M${x - 6} ${y - 2}h12M${x - 4} ${y - 6}h8`} stroke="#8a93a3" strokeWidth="1.4" />
            <Glow x={x} y={y - 10} r={2} color={PINK} />
          </g>
        );
      case 'fields':
        return (
          <g>
            <rect x={x - 12} y={y - 9} width="24" height="19" rx="1.5" fill="#15131f" fillOpacity="0.5" stroke={c.side} strokeWidth="1.4" />
            {[-4, 4].map((dy) => (
              <g key={dy}>
                <path d={`M${x - 7} ${y + dy}v-3M${x - 2} ${y + dy}v-4M${x + 3} ${y + dy}v-3M${x + 8} ${y + dy}v-4`} stroke="#8fcf4a" strokeWidth="1.3" />
                <Neon d={`M${x - 9} ${y + dy + 1.5}h18`} color={c.accent} width={1.8} />
              </g>
            ))}
          </g>
        );
      case 'mountains':
        return (
          <g>
            <path d={`M${x - 13} ${y + 10}l13-22 13 22Z`} fill="#3a3e4c" />
            <Neon d={`M${x - 6} ${y + 8}l4-7 3 3 4-8`} color={c.accent} width={1.8} />
          </g>
        );
      case 'desert':
        return <path d={`M${x - 13} ${y + 4}l7-5 5 6 8-8 6 4`} stroke={c.accent} strokeWidth="1.8" fill="none" strokeLinejoin="round" />;
      default:
        return null;
    }
  },
  desert: ({ x, y, c }) => (
    <g>
      <path d={`M${x - 30} ${y + 24}l14-5 8 7 16-4 10 5 12-6M${x - 28} ${y - 20}l12 6 6-8`} stroke={c.side} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
      <path d={`M${x} ${y + 18}v18`} stroke="#5a606e" strokeWidth="2.6" />
      <rect x={x - 27} y={y - 20} width="54" height="38" rx="2" fill={c.accent} fillOpacity="0.16" />
      <Neon d={`M${x - 27} ${y - 20}h54v38h-54Z`} color={c.accent} width={2} />
      <Neon d={`M${x - 14} ${y + 10}l14-21 14 21Z`} color={CYAN} width={1.8} />
      <rect x={x + 10} y={y - 15} width="12" height="3.5" fill={c.accent} opacity="0.5" />
    </g>
  ),
};
