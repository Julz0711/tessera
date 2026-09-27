import { Glow, Neon } from './glow';
import { alongRoad, pc, RoadBase } from './shared';
import type { BarbarianShipGlyph, KnightGlyph, PieceGlyph, RoadGlyph, TileGlyphs, ThemePieces } from './types';

const CYAN = '#7fe3ff';

/** Orbital's settlement: a dome habitat, a glazed dome over a squat ring base. */
const orbitalSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth="3" strokeLinejoin="round">
      <rect x={x - 15} y={y + 6} width="30" height="8" fill={c.dark} />
      <path d={`M${x - 14} ${y + 7}a14 15 0 0 1 28 0Z`} fill={c.hex} />
      <circle cx={x} cy={y - 2} r="2" fill={CYAN} />
    </g>
  );
};

/** Orbital's city: a cluster of domes on a shared ring, an antenna mast with a blinking light. */
const orbitalCity: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth="2.5" strokeLinejoin="round">
      <rect x={x - 22} y={y + 10} width="44" height="7" fill={c.dark} />
      <path d={`M${x - 20} ${y + 11}a11 12 0 0 1 22 0Z`} fill={c.hex} />
      <path d={`M${x - 2} ${y + 11}a14 15 0 0 1 28 0Z`} fill={c.hex} />
      <line x1={x + 12} y1={y - 4} x2={x + 12} y2={y - 20} stroke={c.dark} strokeWidth="2.4" />
      <circle cx={x + 12} cy={y - 22} r="2.4" fill={CYAN} />
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

/** Orbital's knight: an astronaut's rounded helmet, a reflective visor arc. */
const orbitalKnight: KnightGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth="2" strokeLinejoin="round">
      <circle cx={x} cy={y + 1} r="10" fill={c.hex} />
      <path d={`M${x - 7} ${y - 1}a7 6 0 0 1 12-2`} fill="none" stroke={CYAN} strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
    </g>
  );
};

export const orbitalPieces: ThemePieces = { settlement: orbitalSettlement, city: orbitalCity, road: orbitalRoad, knight: orbitalKnight, wall: { fill: "#a9bbd6", stroke: "#2c3a55" } };

/** Orbital on the 2D board: biodomes, a brick printer, helmeted sheep, hydroponic racks, ore crystals and a crater. */
export const orbitalGlyphs: TileGlyphs = ({ terrain, cx, cy, c }) => {
  const spots = [
    [-40, -34],
    [40, -34],
    [-50, 22],
    [50, 22],
    [0, 52],
  ];
  const at = (i: number) => ({ x: cx + spots[i][0], y: cy + spots[i][1] });
  const pine = (x: number, y: number) => `M${x} ${y - 16}l11 20h-22Z M${x} ${y - 6}l13 20h-26Z`;
  switch (terrain) {
    case 'forest':
      // Alien pines with glowing bulbs, and glass biodomes sheltering saplings.
      return (
        <g>
          {[0, 2, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={pine(x, y)} fill="#173a2c" />
                <Glow x={x} y={y - 17} r={3} color={c.accent} />
              </g>
            );
          })}
          {[1, 3].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x} ${y - 8}l7 16h-14Z`} fill="#173a2c" />
                <path d={`M${x - 18} ${y + 10}a18 18 0 0 1 36 0Z`} fill="#bff6ff" fillOpacity="0.2" stroke="#9ff0ff" strokeWidth="2" />
                <rect x={x - 20} y={y + 9} width="40" height="4" rx="1.5" fill="#4a5068" />
              </g>
            );
          })}
        </g>
      );
    case 'hills': {
      // Regolith mounds, and a gantry printer laying bricks.
      const g = at(1);
      return (
        <g>
          {[0, 4].map((i) => {
            const { x, y } = at(i);
            return <path key={i} d={`M${x - 22} ${y + 8}q22-30 44 0Z`} fill={c.accent} opacity="0.75" />;
          })}
          <rect x={g.x - 17} y={g.y - 18} width="3" height="28" fill="#9aa3b8" />
          <rect x={g.x + 14} y={g.y - 18} width="3" height="28" fill="#9aa3b8" />
          <rect x={g.x - 18} y={g.y - 21} width="36" height="4" fill="#b8c0d0" />
          <Glow x={g.x} y={g.y - 14.5} r={3} color={CYAN} />
          <g fill="#9c4f2e" stroke="#6e3522" strokeWidth="1">
            <rect x={g.x - 12} y={g.y + 3} width="11" height="6" />
            <rect x={g.x + 1} y={g.y + 3} width="11" height="6" />
            <rect x={g.x - 6} y={g.y - 3} width="11" height="6" />
          </g>
          {[2, 3].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i} fill={c.side}>
                <circle cx={x - 4} cy={y + 4} r="4" />
                <circle cx={x + 6} cy={y + 7} r="3" />
              </g>
            );
          })}
        </g>
      );
    }
    case 'pasture':
      // Sheep in glass helmets on a grow-lit meadow.
      return (
        <g>
          {[0, 3].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <ellipse cx={x} cy={y} rx="12" ry="8" fill={c.accent} />
                <circle cx={x + 11} cy={y - 3} r="4.5" fill="#3a3530" />
                <circle cx={x + 11} cy={y - 3} r="7.5" fill="#cff6ff" fillOpacity="0.3" stroke="#9ff0ff" strokeWidth="1.6" />
              </g>
            );
          })}
          {[1, 2, 4].map((i) => {
            const { x, y } = at(i);
            return <path key={i} d={`M${x - 6} ${y + 6}l3-10 3 10 3-12 3 12`} stroke={c.side} strokeWidth="2.5" fill="none" />;
          })}
        </g>
      );
    case 'fields':
      // Wheat under glass greenhouse tunnels.
      return (
        <g>
          {[0, 1, 2, 3, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 10} ${y + 8}v-9M${x - 3} ${y + 8}v-12M${x + 4} ${y + 8}v-12M${x + 11} ${y + 8}v-9`} stroke={c.side} strokeWidth="2.6" strokeLinecap="round" />
                <path d={`M${x - 18} ${y + 10}v-8a18 12 0 0 1 36 0v8Z`} fill="#e8fbff" fillOpacity="0.28" stroke="#cfeff8" strokeWidth="2" />
              </g>
            );
          })}
        </g>
      );
    case 'mountains': {
      // Ore rock studded with glowing crystals, and a drill rig with a red beacon.
      const d = at(3);
      return (
        <g>
          {[0, 1, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 20} ${y + 12}l20-30 20 30Z`} fill="#555a6e" />
                <path d={`M${x + 5} ${y + 12}l4-17 4 17Z M${x - 11} ${y + 12}l3-11 3 11Z`} fill={c.accent} />
                <Neon d={`M${x + 9} ${y - 3}v14`} color={c.accent} width={1.4} />
              </g>
            );
          })}
          <path d={`M${d.x - 8} ${d.y + 12}L${d.x} ${d.y - 18}L${d.x + 8} ${d.y + 12}M${d.x - 5} ${d.y}h10M${d.x - 3} ${d.y - 8}h6`} stroke="#c4cad8" strokeWidth="2" fill="none" />
          <Glow x={d.x} y={d.y - 20} r={2.8} color="#ff4d4d" />
        </g>
      );
    }
    case 'desert': {
      // An impact crater at the back and a wrecked satellite (the robber stands in the middle).
      const x = cx + 46;
      const y = cy + 4;
      return (
        <g>
          <ellipse cx={cx - 8} cy={cy - 42} rx="36" ry="15" fill={c.side} />
          <ellipse cx={cx - 8} cy={cy - 44} rx="27" ry="9.5" fill="#6f6c80" />
          <path d={`M${cx - 44} ${cy - 42}a36 15 0 0 1 72 0`} stroke={c.accent} strokeWidth="2" fill="none" />
          <g transform={`rotate(-18 ${x} ${y})`}>
            <rect x={x - 6} y={y - 5} width="12" height="10" fill="#8a8fa0" stroke="#5f6475" strokeWidth="1.2" />
            <rect x={x - 21} y={y - 3} width="14" height="6" fill="#3a5a9a" stroke="#5f6475" strokeWidth="1" />
            <rect x={x + 7} y={y - 3} width="14" height="6" fill="#3a5a9a" stroke="#5f6475" strokeWidth="1" />
            <path d={`M${x - 4} ${y - 5}a6 6 0 0 1 9 -5`} stroke="#5f6475" strokeWidth="2" fill="none" />
          </g>
          <circle cx={cx - 52} cy={cy + 14} r="3" fill={c.side} />
          <circle cx={cx - 40} cy={cy + 28} r="2" fill={c.side} />
        </g>
      );
    }
    default:
      return null;
  }
};

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
