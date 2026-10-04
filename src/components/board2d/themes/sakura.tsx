import { alongRoad, OUTLINE, pc, RoadBase } from './shared';
import { grassTuft } from './classic';
import type { BarbarianShipGlyph, KnightGlyph, PieceGlyph, RoadGlyph, ThemePieces, TileAccents } from './types';

/** A wide overhanging pagoda roof: a flat-topped triangle with small upturned eave flares. */
function PagodaRoof({ x, apexY, eaveY, half, color }: { x: number; apexY: number; eaveY: number; half: number; color: string }) {
  return (
    <g fill={color}>
      <path d={`M${x - half} ${eaveY}L${x} ${apexY}L${x + half} ${eaveY}Z`} />
      <path d={`M${x - half} ${eaveY}l-5 -2 3 6Z M${x + half} ${eaveY}l5 -2 -3 6Z`} />
    </g>
  );
}

/**
 * Sakura Isle's settlement: a tea house on a stone base, paper doors in a dark timber front, under
 * a hip-and-gable roof in the owner's colour whose eaves flick up at the ends.
 */
const sakuraSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <rect x={x - 16} y={y + 9} width="32" height="5" fill="#8d8a82" />
      <rect x={x - 12} y={y - 3} width="24" height="12" fill="#3a2a1e" />
      <path
        d={`M${x - 23} ${y - 7}L${x - 17} ${y - 2}L${x + 17} ${y - 2}L${x + 23} ${y - 7}L${x + 11} ${y - 12}L${x - 11} ${y - 12}Z M${x - 9} ${y - 12}L${x} ${y - 19}L${x + 9} ${y - 12}Z`}
        fill={c.hex}
      />
      <g stroke="none" fill="#f3ecd8">
        {[-9, -2.5, 4].map((dx) => (
          <rect key={dx} x={x + dx} y={y} width="5" height="7" />
        ))}
      </g>
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

export const sakuraAccents: TileAccents = {
  side: ({ terrain, x, y, c }) => {
    switch (terrain) {
      case 'forest':
        // A little blossom tree: three pink puffs on a dark trunk.
        return (
          <g>
            <line x1={x} y1={y + 2} x2={x} y2={y + 11} stroke="#5a4536" strokeWidth="3" strokeLinecap="round" />
            <circle cx={x - 6} cy={y - 1} r="6.5" fill={c.accent} opacity="0.8" />
            <circle cx={x + 6} cy={y - 1} r="6.5" fill={c.accent} opacity="0.8" />
            <circle cx={x} cy={y - 7} r="8" fill={c.accent} />
          </g>
        );
      case 'hills':
        // A small stone lantern.
        return (
          <g fill="#9a968c" stroke="#5f5c54" strokeWidth="1.6" strokeLinejoin="round">
            <rect x={x - 5} y={y + 4} width="10" height="5" />
            <rect x={x - 2} y={y - 3} width="4" height="8" />
            <rect x={x - 5} y={y - 8} width="10" height="5" fill="#f3ecd8" />
            <path d={`M${x - 9} ${y - 8}L${x} ${y - 14}L${x + 9} ${y - 8}Z`} />
          </g>
        );
      case 'pasture':
        return (
          <g>
            {grassTuft(x, y, c.side)}
            <circle cx={x + 11} cy={y - 8} r="3" fill="#f4b6c6" />
            <circle cx={x - 12} cy={y - 6} r="2.4" fill="#f4b6c6" />
          </g>
        );
      case 'fields':
        // A little paddy bund with rice tufts.
        return (
          <g>
            <rect x={x - 13} y={y - 9} width="26" height="19" fill="none" stroke={c.side} strokeWidth="2" opacity="0.7" />
            <path d={`M${x - 7} ${y + 6}l2-9 2 9M${x + 1} ${y + 7}l2-10 2 10M${x + 8} ${y + 6}l2-8 2 8`} stroke={c.side} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </g>
        );
      case 'mountains':
        // A small snow-capped peak.
        return (
          <g strokeLinejoin="round">
            <path d={`M${x - 14} ${y + 9}l14-22 14 22Z`} fill="#6f737c" />
            <path d={`M${x - 6} ${y - 3}l6-10 6 10-3 2-3-2-3 2Z`} fill="#fff" />
          </g>
        );
      case 'desert':
        // Raked sand lines around a dark stone.
        return (
          <g>
            <g stroke={c.accent} strokeWidth="2" fill="none" strokeLinecap="round">
              <path d={`M${x - 13} ${y + 8}q13-6 26 0`} />
              <path d={`M${x - 10} ${y + 2}q10-5 20 0`} />
            </g>
            <ellipse cx={x} cy={y - 5} rx="7" ry="5" fill="#454138" />
          </g>
        );
      default:
        return null;
    }
  },
  desert: ({ x, y, c }) => (
    <g>
      <g stroke={c.accent} strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d={`M${x - 28} ${y + 22}q28-9 56 0`} />
        <path d={`M${x - 24} ${y + 13}q24-8 48 0`} />
        <path d={`M${x - 18} ${y + 4}q18-7 36 0`} />
      </g>
      <ellipse cx={x - 14} cy={y - 14} rx="10" ry="7" fill="#454138" />
      <ellipse cx={x + 8} cy={y - 20} rx="8" ry="6" fill="#58534a" />
      <ellipse cx={x + 18} cy={y - 8} rx="6" ry="4.5" fill="#454138" />
    </g>
  ),
};
