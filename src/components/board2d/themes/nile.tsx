import { alongRoad, pc, RoadBase } from './shared';
import type { BarbarianShipGlyph, KnightGlyph, PieceGlyph, RoadGlyph, TileGlyphs, ThemePieces } from './types';

/** Nile's settlement: a mud-brick house, tapered walls under a flat parapet roof. */
const nileSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth="3" strokeLinejoin="round">
      <path d={`M${x - 14} ${y + 15}L${x - 11} ${y - 8}H${x + 11}L${x + 14} ${y + 15}Z`} fill={c.hex} />
      <rect x={x - 13} y={y - 13} width="26" height="6" fill={c.dark} />
      <path d={`M${x - 12} ${y - 17}h4v4h-4Z M${x - 4} ${y - 17}h4v4h-4Z M${x + 4} ${y - 17}h4v4h-4Z`} fill={c.dark} />
    </g>
  );
};

/** Nile's city: a temple, twin battered pylon towers flanking a doorway, an obelisk beside it. */
const nileCity: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth="3" strokeLinejoin="round">
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

export const nilePieces: ThemePieces = { settlement: nileSettlement, city: nileCity, road: nileRoad, knight: nileKnight, wall: { fill: "#d9b77a", stroke: "#6b4f2a" } };

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

/** Nile on the 2D board: date palms, mudbrick, a shaduf, canals, a quarry and the pyramids. */
export const nileGlyphs: TileGlyphs = ({ terrain, cx, cy, c }) => {
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
      return (
        <g>
          {[0, 1, 2, 3, 4].map((i) => {
            const { x, y } = at(i);
            return <Palm key={i} x={x} y={y} leaf={c.accent} />;
          })}
        </g>
      );
    case 'hills': {
      // Mudbrick drying in rows, and clay jars.
      const jars = at(4);
      return (
        <g>
          {[0, 1].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i} fill={c.accent} stroke={c.side} strokeWidth="1">
                {[0, 1].map((row) =>
                  [0, 1, 2].map((col) => <rect key={`${row}${col}`} x={x - 17 + col * 11.5 + (row ? 5 : 0)} y={y - 6 + row * 8} width={row ? 10 : 10.5} height="6.5" />),
                )}
              </g>
            );
          })}
          <ellipse cx={jars.x - 7} cy={jars.y + 4} rx="6" ry="8" fill="#a85a34" />
          <rect x={jars.x - 9} y={jars.y - 7} width="4" height="4" fill="#a85a34" />
          <ellipse cx={jars.x + 7} cy={jars.y + 6} rx="5" ry="6.5" fill="#94502e" />
          <rect x={jars.x + 5} y={jars.y - 3} width="4" height="4" fill="#94502e" />
        </g>
      );
    }
    case 'pasture': {
      // Sheep and a goat by a shaduf lifting water from a channel.
      const s = at(1);
      return (
        <g>
          {[0, 3].map((i) => {
            const { x, y } = at(i);
            const goat = i === 3;
            return (
              <g key={i}>
                <ellipse cx={x} cy={y} rx="12" ry="8" fill={goat ? '#d9c7a0' : c.accent} />
                <circle cx={x + 11} cy={y - 3} r="4.5" fill={goat ? '#4a3a2a' : '#3a3530'} />
              </g>
            );
          })}
          <path d={`M${s.x + 6} ${s.y + 14}v-22`} stroke="#6b4a2a" strokeWidth="3" />
          <path d={`M${s.x - 14} ${s.y - 2}L${s.x + 18} ${s.y - 14}`} stroke="#8a6a44" strokeWidth="2.5" />
          <rect x={s.x - 17} y={s.y} width="6" height="6" fill="#6b4a2a" />
          <circle cx={s.x + 18} cy={s.y - 14} r="3.5" fill="#9a948a" />
          <path d={`M${s.x - 20} ${s.y + 14}h20`} stroke="#3fa3b8" strokeWidth="3" />
          {[2, 4].map((i) => {
            const { x, y } = at(i);
            return <path key={i} d={`M${x - 6} ${y + 6}l3-10 3 10 3-12 3 12`} stroke={c.side} strokeWidth="2.5" fill="none" />;
          })}
        </g>
      );
    }
    case 'fields':
      // Wheat between blue irrigation canals.
      return (
        <g>
          <path d={`M${cx - 62} ${cy + 40}H${cx + 62}M${cx - 46} ${cy - 60}H${cx + 46}`} stroke={c.accent} strokeWidth="4" strokeLinecap="round" />
          <g stroke={c.side} strokeWidth="3" strokeLinecap="round" opacity="0.85">
            {[0, 1, 2, 3].map((i) => {
              const { x, y } = at(i);
              return <path key={i} d={`M${x - 8} ${y + 10}v-20M${x} ${y + 10}v-24M${x + 8} ${y + 10}v-20`} />;
            })}
          </g>
        </g>
      );
    case 'mountains': {
      // Granite cliffs and cut blocks from the quarry.
      const q = at(4);
      return (
        <g>
          {[0, 1].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 20} ${y + 12}l6-24h28l6 24Z`} fill="#7c766d" />
                <path d={`M${x - 14} ${y - 12}h28`} stroke={c.accent} strokeWidth="2" />
              </g>
            );
          })}
          <g fill="#d8cfbf" stroke="#9a948a" strokeWidth="1.2">
            <rect x={q.x - 12} y={q.y + 2} width="10" height="8" />
            <rect x={q.x - 1} y={q.y + 2} width="10" height="8" />
            <rect x={q.x - 6} y={q.y - 6} width="10" height="8" />
          </g>
        </g>
      );
    }
    case 'desert':
      // The great pyramid at the back, a smaller one and a palm (the robber stands in the middle).
      return (
        <g>
          <path d={`M${cx - 38} ${cy - 14}L${cx} ${cy - 64}L${cx + 38} ${cy - 14}Z`} fill={c.accent} />
          <path d={`M${cx} ${cy - 64}L${cx + 38} ${cy - 14}H${cx}Z`} fill="#b8903a" />
          <path d={`M${cx + 36} ${cy + 16}L${cx + 50} ${cy - 2}L${cx + 64} ${cy + 16}Z`} fill={c.accent} />
          <path d={`M${cx + 50} ${cy - 2}L${cx + 64} ${cy + 16}H${cx + 50}Z`} fill="#b8903a" />
          <Palm x={cx - 52} y={cy + 10} leaf="#6a9a44" />
        </g>
      );
    default:
      return null;
  }
};

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
