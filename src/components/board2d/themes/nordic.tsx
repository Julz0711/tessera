import { alongRoad, pc, RoadBase } from './shared';
import type { BarbarianShipGlyph, KnightGlyph, PieceGlyph, RoadGlyph, TileGlyphs, ThemePieces } from './types';

/** Nordic Fjords' settlement: a longhouse, a bowed ridge roof with crossed finials at both gables. */
const nordicSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth="3" strokeLinejoin="round">
      <rect x={x - 18} y={y + 1} width="36" height="14" fill={c.hex} />
      <path d={`M${x - 20} ${y + 1}Q${x} ${y - 15} ${x + 20} ${y + 1}Z`} fill={c.dark} />
      <path d={`M${x - 20} ${y + 1}l-3-8M${x - 20} ${y + 1}l5-6M${x + 20} ${y + 1}l3-8M${x + 20} ${y + 1}l-5-6`} stroke={c.dark} strokeWidth="2" fill="none" />
    </g>
  );
};

/** Nordic Fjords' city: a great hall (a bigger longhouse) beside a peaked watchtower. */
const nordicCity: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth="3" strokeLinejoin="round">
      <rect x={x - 24} y={y + 5} width="48" height="14" fill={c.hex} />
      <path d={`M${x - 26} ${y + 5}Q${x - 2} ${y - 13} ${x + 22} ${y + 5}Z`} fill={c.dark} />
      <path d={`M${x - 26} ${y + 5}l-3-8M${x - 26} ${y + 5}l5-6M${x + 22} ${y + 5}l3-8M${x + 22} ${y + 5}l-5-6`} stroke={c.dark} strokeWidth="2" fill="none" />
      <rect x={x + 10} y={y - 20} width="14" height="20" fill={c.hex} />
      <path d={`M${x + 8} ${y - 20}L${x + 17} ${y - 32}L${x + 26} ${y - 20}Z`} fill={c.dark} />
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

export const nordicPieces: ThemePieces = { settlement: nordicSettlement, city: nordicCity, road: nordicRoad, knight: nordicKnight, wall: { fill: "#8a6139", stroke: "#33230f" } };

/** Nordic Fjords on the 2D board: dense spruce and birch, heather, snow drifts and rune stones. */
export const nordicGlyphs: TileGlyphs = ({ terrain, cx, cy, c }) => {
  const spots = [
    [-40, -34],
    [40, -34],
    [-50, 22],
    [50, 22],
    [0, 52],
  ];
  const at = (i: number) => ({ x: cx + spots[i][0], y: cy + spots[i][1] });
  switch (terrain) {
    case 'forest':
      // Narrow, three-tiered spruce at three spots; a thin white birch trunk with a light canopy at the other two.
      return (
        <g>
          <g fill={c.accent} opacity="0.9">
            {[0, 2, 4].map((i) => {
              const { x, y } = at(i);
              return <path key={i} d={`M${x} ${y - 22}l7 13h-14Z M${x} ${y - 11}l9 15h-18Z M${x} ${y}l11 17h-22Z`} />;
            })}
          </g>
          <g opacity="0.9">
            {[1, 3].map((i) => {
              const { x, y } = at(i);
              return (
                <g key={i}>
                  <rect x={x - 1.6} y={y - 6} width="3.2" height="20" fill="#e8e4da" />
                  <ellipse cx={x} cy={y - 12} rx="9" ry="7" fill="#a8cf7a" />
                </g>
              );
            })}
          </g>
        </g>
      );
    case 'pasture':
      // Classic sheep kept as-is; the grass-blade tufts become small purple heather dot clusters.
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
          <g fill="#96729f" opacity="0.85">
            {[1, 2, 4].map((i) => {
              const { x, y } = at(i);
              return (
                <g key={i}>
                  <circle cx={x - 5} cy={y} r="3.2" />
                  <circle cx={x + 2} cy={y - 3} r="3.6" />
                  <circle cx={x + 6} cy={y + 3} r="2.8" />
                </g>
              );
            })}
          </g>
        </g>
      );
    case 'mountains':
      // Same silhouette as classic, but the snow cap is enlarged to cover much more of the peak.
      return (
        <g>
          {[0, 1, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 20} ${y + 12}l20-30 20 30Z`} fill="#6f737c" />
                <path d={`M${x - 13} ${y - 2}l13-22 13 22-6 5-7-5-7 5Z`} fill={c.accent} />
              </g>
            );
          })}
        </g>
      );
    case 'desert':
      // Frozen tundra: pale snow-drift curves (as classic's dune shape, recoloured icy white) plus a small ring of standing rune stones.
      return (
        <g>
          <g fill="#f4f9fc" stroke={c.accent} strokeWidth="1" opacity="0.95">
            {[0, 1, 2, 3].map((i) => {
              const { x, y } = at(i);
              return <path key={i} d={`M${x - 20} ${y + 6}q20-16 40 0Z`} />;
            })}
          </g>
          <g fill="#7c8791" stroke="#5f6a73" strokeWidth="1.4">
            <rect x={cx - 6} y={cy + 4} width="4" height="19" rx="1" transform={`rotate(-8 ${cx - 4} ${cy + 14})`} />
            <rect x={cx + 1} y={cy + 1} width="4" height="23" rx="1" transform={`rotate(4 ${cx + 3} ${cy + 13})`} />
            <rect x={cx + 8} y={cy + 6} width="3.5" height="15" rx="1" transform={`rotate(11 ${cx + 10} ${cy + 14})`} />
          </g>
        </g>
      );
    default:
      return null;
  }
};

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
