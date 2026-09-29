import { alongRoad, OUTLINE, pc, RoadBase } from './shared';
import type { BarbarianShipGlyph, KnightGlyph, PieceGlyph, RoadGlyph, TileGlyphs, ThemePieces } from './types';

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

/** Two rows of bricks drying in the sun, centred on (x, y). */
function Bricks({ x, y, fill, stroke }: { x: number; y: number; fill: string; stroke: string }) {
  return (
    <g fill={fill} stroke={stroke} strokeWidth="1">
      {[0, 1].map((row) =>
        [0, 1, 2].map((col) => <rect key={`${row}${col}`} x={x - 17 + col * 11.5 + (row ? 5 : 0)} y={y - 6 + row * 8} width={row ? 10 : 10.5} height="6.5" />),
      )}
    </g>
  );
}

/** Frontier on the 2D board: pines, adobe yards, a ranch windpump, corn, a silver mine and a red-rock mesa. */
export const frontierGlyphs: TileGlyphs = ({ terrain, cx, cy, c }) => {
  const spots = [
    [-40, -34],
    [40, -34],
    [-50, 22],
    [50, 22],
    [0, 52],
  ];
  const at = (i: number) => ({ x: cx + spots[i][0], y: cy + spots[i][1] });
  switch (terrain) {
    case 'forest': {
      // Tall three-tier pines, and a pile of cut logs.
      const logs = at(3);
      return (
        <g>
          <g fill={c.accent}>
            {[0, 1, 2, 4].map((i) => {
              const { x, y } = at(i);
              return <path key={i} d={`M${x} ${y - 22}l8 14h-16Z M${x} ${y - 13}l10 16h-20Z M${x} ${y - 4}l12 18h-24Z`} />;
            })}
          </g>
          <g fill="#b08a58" stroke="#6b4a2a" strokeWidth="1.5">
            <circle cx={logs.x - 7} cy={logs.y + 6} r="5" />
            <circle cx={logs.x + 4} cy={logs.y + 6} r="5" />
            <circle cx={logs.x - 1.5} cy={logs.y - 3} r="5" />
          </g>
        </g>
      );
    }
    case 'hills': {
      // Adobe bricks drying in rows, and a beehive oven.
      const oven = at(4);
      return (
        <g>
          {[0, 1].map((i) => {
            const { x, y } = at(i);
            return <Bricks key={i} x={x} y={y} fill={c.accent} stroke={c.side} />;
          })}
          <path d={`M${oven.x - 14} ${oven.y + 8}a14 12 0 0 1 28 0Z`} fill="#d08a5a" stroke={c.side} strokeWidth="1.5" />
          <path d={`M${oven.x - 4} ${oven.y + 8}v-4a4 4 0 0 1 8 0v4Z`} fill="#3a2418" />
          {[2, 3].map((i) => {
            const { x, y } = at(i);
            return <circle key={i} cx={x} cy={y + 4} r="4" fill={c.side} opacity="0.7" />;
          })}
        </g>
      );
    }
    case 'pasture': {
      // Sheep on the prairie, a split-rail fence and a windpump.
      const fence = at(2);
      const pump = at(1);
      const grass = at(4);
      const w = '#5a4a3a';
      return (
        <g>
          {[0, 3].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <ellipse cx={x} cy={y} rx="12" ry="8" fill={c.accent} />
                <circle cx={x + 11} cy={y - 3} r="4.5" fill="#3a3530" />
              </g>
            );
          })}
          <path d={`M${fence.x - 14} ${fence.y + 8}v-14M${fence.x} ${fence.y + 8}v-14M${fence.x + 14} ${fence.y + 8}v-14`} stroke="#7a5a3a" strokeWidth="2.5" />
          <path d={`M${fence.x - 17} ${fence.y - 2}h34M${fence.x - 17} ${fence.y + 4}h34`} stroke="#8a6a44" strokeWidth="2" />
          <path d={`M${pump.x - 7} ${pump.y + 14}L${pump.x - 1.5} ${pump.y - 12}M${pump.x + 7} ${pump.y + 14}L${pump.x + 1.5} ${pump.y - 12}M${pump.x - 5} ${pump.y + 2}h10`} stroke={w} strokeWidth="2" />
          <circle cx={pump.x} cy={pump.y - 16} r="9" fill="none" stroke={w} strokeWidth="2" />
          <path
            d={`M${pump.x - 9} ${pump.y - 16}h18M${pump.x} ${pump.y - 25}v18M${pump.x - 6.4} ${pump.y - 22.4}l12.8 12.8M${pump.x + 6.4} ${pump.y - 22.4}l-12.8 12.8`}
            stroke={w}
            strokeWidth="1.4"
          />
          <path d={`M${pump.x + 3} ${pump.y - 16}l12-3v6Z`} fill={w} />
          <path d={`M${grass.x - 6} ${grass.y + 6}l3-10 3 10 3-12 3 12`} stroke={c.side} strokeWidth="2.5" fill="none" />
        </g>
      );
    }
    case 'fields': {
      // Corn stalks with leaves, and a scarecrow (a little lower, clear of the token).
      const s = { x: at(4).x, y: at(4).y + 6 };
      return (
        <g>
          {[0, 1, 2, 3].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i} strokeLinecap="round">
                <path d={`M${x - 8} ${y + 10}v-20M${x} ${y + 10}v-24M${x + 8} ${y + 10}v-20`} stroke={c.side} strokeWidth="3" />
                <path d={`M${x - 8} ${y - 2}l-5-4M${x} ${y - 6}l5-4M${x + 8} ${y - 2}l5-4`} stroke="#6f8a3a" strokeWidth="2" />
              </g>
            );
          })}
          <path d={`M${s.x} ${s.y + 14}v-24M${s.x - 11} ${s.y - 4}h22`} stroke="#6b4a2a" strokeWidth="3" strokeLinecap="round" />
          <circle cx={s.x} cy={s.y - 13} r="4.5" fill="#e8c070" />
          <path d={`M${s.x - 8} ${s.y - 16}h16M${s.x - 4.5} ${s.y - 16}v-5h9v5`} stroke="#4a3322" strokeWidth="2.5" fill="#4a3322" />
        </g>
      );
    }
    case 'mountains': {
      // Granite peaks and a timber-framed silver mine with its ore cart.
      const m = at(4);
      return (
        <g>
          {[0, 1].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 20} ${y + 12}l20-30 20 30Z`} fill="#6f6b67" />
                <path d={`M${x - 3} ${y - 12}l3-6 7 10Z`} fill={c.top} opacity="0.8" />
              </g>
            );
          })}
          <path d={`M${m.x - 9} ${m.y + 12}v-12h18v12Z`} fill="#1f1a14" />
          <path d={`M${m.x - 12} ${m.y + 12}v-15h24v15`} stroke="#7a5a3a" strokeWidth="3" fill="none" />
          <path d={`M${m.x - 20} ${m.y + 15}h40`} stroke="#4a4a4a" strokeWidth="2" />
          <path d={`M${m.x + 14} ${m.y + 13}l-2-7h10l-2 7Z`} fill="#5a5a5a" />
          {[2, 3].map((i) => {
            const { x, y } = at(i);
            return <circle key={i} cx={x} cy={y + 4} r="5" fill={c.side} />;
          })}
        </g>
      );
    }
    case 'desert': {
      // A red mesa at the back, a saguaro and a cow skull (the robber stands in the middle).
      const sx = cx + 48;
      const sy = cy + 18;
      return (
        <g>
          <path d={`M${cx - 40} ${cy - 22}l9-26h62l9 26Z`} fill={c.accent} />
          <path d={`M${cx - 35} ${cy - 34}h70`} stroke="#8f4a2a" strokeWidth="3" />
          <path
            d={`M${cx - 54} ${cy + 20}v-30a4 4 0 0 1 8 0v30Z M${cx - 46} ${cy - 2}h8v-10 M${cx - 54} ${cy + 4}h-7v-8`}
            fill="#5f8f4a"
            stroke="#5f8f4a"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d={`M${sx - 5} ${sy - 4}q-7-2-9-8M${sx + 5} ${sy - 4}q7-2 9-8`} stroke="#f4efe0" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <ellipse cx={sx} cy={sy} rx="5.5" ry="7" fill="#f4efe0" />
          <circle cx={sx - 2} cy={sy - 1} r="1.2" fill="#3a2a20" />
          <circle cx={sx + 2} cy={sy - 1} r="1.2" fill="#3a2a20" />
        </g>
      );
    }
    default:
      return null;
  }
};

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
