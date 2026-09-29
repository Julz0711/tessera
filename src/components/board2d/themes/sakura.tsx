import { alongRoad, OUTLINE, pc, RoadBase } from './shared';
import type { BarbarianShipGlyph, KnightGlyph, PieceGlyph, RoadGlyph, TileGlyphs, ThemePieces } from './types';

/** A wide overhanging pagoda roof: a flat-topped triangle with small upturned eave flares. */
function PagodaRoof({ x, apexY, eaveY, half, color }: { x: number; apexY: number; eaveY: number; half: number; color: string }) {
  return (
    <g fill={color}>
      <path d={`M${x - half} ${eaveY}L${x} ${apexY}L${x + half} ${eaveY}Z`} />
      <path d={`M${x - half} ${eaveY}l-5 -2 3 6Z M${x + half} ${eaveY}l5 -2 -3 6Z`} />
    </g>
  );
}

/** Sakura Isle's settlement: a single-storey house under one wide, upturned pagoda roof. */
const sakuraSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <rect x={x - 12} y={y - 1} width="24" height="16" fill={c.hex} />
      <PagodaRoof x={x} apexY={y - 19} eaveY={y - 1} half={22} color={c.dark} />
    </g>
  );
};

/** Sakura Isle's city: a two-tiered pagoda, each storey under its own overhanging roof, with a finial. */
const sakuraCity: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <rect x={x - 17} y={y + 3} width="34" height="14" fill={c.hex} />
      <PagodaRoof x={x} apexY={y - 9} eaveY={y + 3} half={24} color={c.dark} />
      <rect x={x - 11} y={y - 13} width="22" height="12" fill={c.hex} />
      <PagodaRoof x={x} apexY={y - 25} eaveY={y - 13} half={16} color={c.dark} />
      <circle cx={x} cy={y - 29} r="2.6" fill={c.dark} />
    </g>
  );
};

/** Sakura Isle's road: a wooden boardwalk, a few plank ties crossing the coloured deck. */
const sakuraRoad: RoadGlyph = ({ x1, y1, x2, y2, color, ghost, k = 1 }) => {
  const seg = { x1, y1, x2, y2 };
  if (ghost) return <RoadBase {...seg} color={color} ghost k={k} />;
  return (
    <>
      <RoadBase {...seg} color={color} k={k} />
      {[-0.27, 0, 0.27].map((t) => {
        const p = alongRoad(seg, t);
        const g = alongRoad(seg, t, 7 * k);
        const g2 = alongRoad(seg, t, -7 * k);
        return <line key={t} x1={g.x} y1={g.y} x2={g2.x} y2={g2.y} stroke="#6b4a2b" strokeWidth={2.4 * k} strokeLinecap="round" opacity="0.85" />;
      })}
    </>
  );
};

/** Sakura Isle's knight: a samurai's kabuto helmet, a crescent crest over a flared neck-guard. */
const sakuraKnight: KnightGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth="2" strokeLinejoin="round">
      <path d={`M${x - 10} ${y + 8}q-2-13 10-13t10 13q-10 4-20 0Z`} fill={c.hex} />
      <path d={`M${x - 4} ${y - 11}q4-4 8 0M${x - 4} ${y - 11}q4 5 8 0`} fill="none" stroke={c.dark} strokeWidth="2" />
      <circle cx={x} cy={y - 2} r="2" fill={c.dark} />
    </g>
  );
};

export const sakuraPieces: ThemePieces = { settlement: sakuraSettlement, city: sakuraCity, road: sakuraRoad, knight: sakuraKnight };

/** Sakura Isle on the 2D board: blossom groves, paddies, a single peak and a rock garden. */
export const sakuraGlyphs: TileGlyphs = ({ terrain, cx, cy, c }) => {
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
      // Round blossom canopies (three overlapping puffs) over a short dark trunk.
      return (
        <g>
          {[0, 1, 2, 3, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <line x1={x} y1={y + 6} x2={x} y2={y + 17} stroke="#5a4536" strokeWidth="3" />
                <circle cx={x} cy={y - 6} r="12" fill={c.accent} opacity="0.9" />
                <circle cx={x - 8} cy={y - 1} r="8" fill={c.accent} opacity="0.75" />
                <circle cx={x + 8} cy={y - 1} r="8" fill={c.accent} opacity="0.75" />
              </g>
            );
          })}
        </g>
      );
    case 'fields':
      // A paddy bund square with small rice tufts in a row inside it.
      return (
        <g>
          {[0, 1, 2, 3, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <rect x={x - 16} y={y - 12} width="32" height="24" fill="none" stroke={c.side} strokeWidth="2" opacity="0.55" />
                <path d={`M${x - 9} ${y + 7}l2-9 2 9M${x} ${y + 8}l2-10 2 10M${x + 9} ${y + 7}l2-9 2 9`} stroke={c.accent} strokeWidth="2.5" fill="none" />
              </g>
            );
          })}
        </g>
      );
    case 'mountains': {
      // One large snow-capped peak.
      const { x, y } = at(1);
      return (
        <g>
          <path d={`M${x - 30} ${y + 18}l30-44 30 44Z`} fill="#6f737c" />
          <path d={`M${x - 11} ${y - 12}l11-16 11 16-6 4-5-4-5 4Z`} fill={c.accent} />
        </g>
      );
    }
    case 'desert':
      // Raked sand lines below, three dark stones scattered above.
      return (
        <g>
          <g stroke={c.accent} strokeWidth="2" fill="none" opacity="0.65">
            <path d={`M${cx - 46} ${cy + 36}q46-14 92 0`} />
            <path d={`M${cx - 42} ${cy + 48}q42-12 84 0`} />
            <path d={`M${cx - 36} ${cy + 60}q36-10 72 0`} />
          </g>
          {[at(0), at(1), at(2)].map((p, i) => (
            <ellipse key={i} cx={p.x} cy={p.y} rx="10" ry="7" fill="#454138" />
          ))}
        </g>
      );
  }
  return null;
};

/** Sakura Isle on the 2D board: a Japanese junk, a wide hull under a red battened sail. */
export const sakuraShip: BarbarianShipGlyph = ({ danger }) => {
  const hull = danger ? '#c23a2a' : '#5a3a26';
  const sail = danger ? '#f3d9d3' : '#b8362a';
  return (
    <g pointerEvents="none">
      <path d="M-27 10h54l-7 12h-40Z" fill={hull} stroke="#1f1a14" strokeWidth="2.5" strokeLinejoin="round" />
      {/* raised, boxy stern castle */}
      <rect x="-25" y="-4" width="14" height="16" fill="#3a271a" stroke="#1f1a14" strokeWidth="2" />
      <rect x="-1.5" y="-34" width="3" height="34" fill="#3a271a" />
      <path d="M-15-30h28v24h-28Z" fill={sail} stroke="#1f1a14" strokeWidth="2.5" strokeLinejoin="round" />
      {[-24, -16, -8, 0, 8].map((by) => (
        <line key={by} x1="-15" y1={by} x2="13" y2={by} stroke="#2a1f18" strokeWidth="1.6" />
      ))}
    </g>
  );
};
