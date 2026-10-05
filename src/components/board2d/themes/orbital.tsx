import { Glow, Neon } from './glow';
import { alongRoad, OUTLINE, pc, RoadBase } from './shared';
import type { BarbarianShipGlyph, MetropolisGlyph, PieceGlyph, RoadGlyph, ThemePieces, TileAccents } from './types';

const CYAN = '#7fe3ff';

/** Orbital's settlement: a dome habitat, a glazed dome over a squat ring base. */
const orbitalSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <rect x={x - 15} y={y + 6} width="30" height="8" fill={c.dark} />
      <path d={`M${x - 14} ${y + 7}a14 15 0 0 1 28 0Z`} fill={c.hex} />
      <circle cx={x} cy={y - 2} r="2" fill={CYAN} />
    </g>
  );
};

/** Orbital's city: a cluster of domes sunk into a solid ring base, an antenna mast with a blinking light. */
const orbitalCity: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <rect x={x - 24} y={y + 8} width="48" height="10" rx="2" fill={c.dark} />
      <path d={`M${x - 19} ${y + 9}a10 11 0 0 1 20 0Z`} fill={c.hex} />
      <path d={`M${x - 3} ${y + 9}a13 14 0 0 1 26 0Z`} fill={c.hex} />
      <circle cx={x - 9} cy={y + 1} r="1.8" fill={CYAN} />
      <circle cx={x + 10} cy={y - 3} r="2" fill={CYAN} />
      <line x1={x + 10} y1={y - 5} x2={x + 10} y2={y - 26} stroke={c.dark} strokeWidth="2.4" />
      <circle cx={x + 10} cy={y - 28} r="2.4" fill={CYAN} />
    </g>
  );
};

/** Orbital's road: a lit transit tube, small glowing lights embedded along the coloured tube. */
const orbitalRoad: RoadGlyph = ({ x1, y1, x2, y2, color, ghost, k = 1 }) => {
  const seg = { x1, y1, x2, y2 };
  if (ghost) return <RoadBase {...seg} color={color} ghost k={k} />;
  return (
    <>
      <RoadBase {...seg} color={color} k={k} />
      {[-0.25, 0, 0.25].map((t) => {
        const p = alongRoad(seg, t);
        return <Glow key={t} x={p.x} y={p.y} r={1.8 * k} color={CYAN} />;
      })}
    </>
  );
};

/** Orbital's metropolis: a great dome circled by a ring in the track's colour, a beacon on top. */
const orbitalMetropolis: MetropolisGlyph = ({ x, y, color, accent }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <line x1={x} y1={y - 18} x2={x} y2={y - 34} stroke={c.dark} strokeWidth="2.4" />
      <circle cx={x} cy={y - 36} r="3" fill={accent} strokeWidth="2" />
      <path d={`M${x - 24} ${y + 9}a24 27 0 0 1 48 0Z`} fill={c.hex} />
      <ellipse cx={x} cy={y - 2} rx="30" ry="6" fill="none" stroke={accent} strokeWidth="3.4" />
      <rect x={x - 28} y={y + 8} width="56" height="10" rx="2" fill={c.dark} />
      <circle cx={x - 10} cy={y - 8} r="2" fill={CYAN} />
      <circle cx={x + 9} cy={y - 10} r="2" fill={CYAN} />
    </g>
  );
};

export const orbitalPieces: ThemePieces = { settlement: orbitalSettlement, city: orbitalCity, road: orbitalRoad, metropolis: orbitalMetropolis };

/** Orbital on the 2D board: a menacing alien raider warship, an angular arrowhead hull with swept fins and twin glowing engines. */
export const orbitalShip: BarbarianShipGlyph = ({ danger }) => {
  const hull = danger ? '#c23a2a' : '#3a3f52';
  const dark = danger ? '#7a1f14' : '#1c1f2c';
  const glow = danger ? '#ff4d4d' : CYAN;
  return (
    <g pointerEvents="none">
      {/* faint tractor-beam cone, projected from the belly */}
      <path d="M-6 9L6 9L15 26L-15 26Z" fill={glow} opacity="0.14" />
      {/* angular arrowhead hull, nose forward, a notched tail */}
      <path d="M0-22L24 10L8 3L0 10L-8 3L-24 10Z" fill={hull} stroke="#101218" strokeWidth="2.2" strokeLinejoin="round" />
      {/* cockpit canopy */}
      <path d="M0-14L4-3L0 0L-4-3Z" fill={dark} stroke="#101218" strokeWidth="1.3" strokeLinejoin="round" />
      {/* swept fins off both wingtips */}
      <path d="M24 10L31 17L19 13Z M-24 10L-31 17L-19 13Z" fill={hull} stroke="#101218" strokeWidth="1.4" strokeLinejoin="round" />
      {/* twin glowing engines at the stern */}
      <Glow x={-5} y={9} r={2.6} color={glow} />
      <Glow x={5} y={9} r={2.6} color={glow} />
    </g>
  );
};


/** Orbital's tile accents: alien pines, regolith, a biodome, a greenhouse, crystals and craters. */
export const orbitalAccents: TileAccents = {
  side: ({ terrain, x, y, c }) => {
    switch (terrain) {
      case 'forest':
        return (
          <g>
            <path d={`M${x} ${y - 12}l9 17h-18Z M${x} ${y - 4}l11 17h-22Z`} fill="#173a2c" />
            <Glow x={x} y={y - 13} r={2.4} color={c.accent} />
          </g>
        );
      case 'hills':
        return (
          <g>
            <path d={`M${x - 13} ${y + 9}q13-24 26 0Z`} fill={c.accent} opacity="0.8" />
            <g fill="#9c4f2e" stroke="#6e3522" strokeWidth="1">
              <rect x={x - 9} y={y + 3} width="9" height="5.5" />
              <rect x={x + 1} y={y + 3} width="9" height="5.5" />
            </g>
          </g>
        );
      case 'pasture':
        return (
          <g>
            <path d={`M${x} ${y + 3}l5 10h-10Z`} fill="#173a2c" />
            <path d={`M${x - 13} ${y + 10}a13 14 0 0 1 26 0Z`} fill="#bff6ff" fillOpacity="0.25" stroke="#9ff0ff" strokeWidth="1.6" />
            <rect x={x - 14} y={y + 9} width="28" height="3.5" rx="1.5" fill="#4a5068" />
          </g>
        );
      case 'fields':
        return (
          <g>
            <path d={`M${x - 8} ${y + 7}v-6M${x - 3} ${y + 7}v-8M${x + 3} ${y + 7}v-8M${x + 8} ${y + 7}v-6`} stroke={c.side} strokeWidth="2.2" strokeLinecap="round" />
            <path d={`M${x - 13} ${y + 9}v-6a13 10 0 0 1 26 0v6Z`} fill="#e8fbff" fillOpacity="0.25" stroke="#cfeff8" strokeWidth="1.6" />
          </g>
        );
      case 'mountains':
        return (
          <g>
            <path d={`M${x - 13} ${y + 10}l13-20 13 20Z`} fill="#555a6e" />
            <path d={`M${x + 2} ${y + 10}l4-14 4 14Z M${x - 9} ${y + 10}l3-9 3 9Z`} fill={c.accent} />
            <Neon d={`M${x + 6} ${y - 1}v10`} color={c.accent} width={1.2} />
          </g>
        );
      case 'desert':
        return (
          <g>
            <ellipse cx={x} cy={y + 3} rx="13" ry="6" fill={c.side} />
            <ellipse cx={x} cy={y + 2} rx="9" ry="3.8" fill="#6f6c80" />
          </g>
        );
      default:
        return null;
    }
  },
  desert: ({ x, y, c }) => (
    <g>
      <ellipse cx={x - 4} cy={y - 4} rx="28" ry="12" fill={c.side} />
      <ellipse cx={x - 4} cy={y - 6} rx="20" ry="7.5" fill="#6f6c80" />
      <path d={`M${x - 32} ${y - 4}a28 12 0 0 1 56 0`} stroke={c.accent} strokeWidth="2" fill="none" />
      <g transform={`rotate(-18 ${x + 6} ${y + 16})`}>
        <rect x={x} y={y + 11} width="12" height="10" fill="#8a8fa0" stroke="#5f6475" strokeWidth="1.2" />
        <rect x={x - 15} y={y + 13} width="14" height="6" fill="#3a5a9a" stroke="#5f6475" strokeWidth="1" />
        <rect x={x + 13} y={y + 13} width="14" height="6" fill="#3a5a9a" stroke="#5f6475" strokeWidth="1" />
      </g>
      <circle cx={x - 26} cy={y + 18} r="2.6" fill={c.side} />
    </g>
  ),
};
