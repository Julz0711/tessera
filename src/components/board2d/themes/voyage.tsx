import type { ReactNode } from 'react';
import type { BoardThemeId } from '@/client/themes';
import type { PlayerColor } from '@/engine/types';
import { PLAYER_COLORS } from '@/shared/colors';
import { Glow, Neon } from './glow';

/**
 * Voyagers pieces on the 2D board, per theme: a player's ship, the pirate and a Veiled Isles
 * treasure. Each glyph draws around the origin in board units; the caller places, turns and scales
 * it. Ships and the pirate face +x (the edge's direction) with the waterline near y = 10; a ship is
 * about 60 wide and 45 tall, the pirate about 70 wide, a treasure about 28 wide. Ships are filled
 * with the owner's colour so they read at a glance; the pirate is always dark with a red mark.
 */
export interface VoyageGlyphs {
  ship: (p: { color: PlayerColor }) => ReactNode;
  pirate: () => ReactNode;
  treasure: () => ReactNode;
}

const INK = '#1f1a14';
const PIRATE_HULL = '#2d2c33';
const PIRATE_DARK = '#111111';
const PIRATE_SAIL = '#3a3942';
const PIRATE_RED = '#d9483b';
const CREAM = '#f6eddb';
const GOLD = '#f2c14e';

const pcol = (color: PlayerColor) => PLAYER_COLORS[color];

/** A small white skull-and-bones dot: every pirate carries one, whatever the theme. */
function Jolly({ x, y, r = 4.5 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r + 1.5} fill={PIRATE_DARK} />
      <circle cx={x} cy={y - 0.6} r={r * 0.62} fill={CREAM} />
      <path d={`M${x - r} ${y + r * 0.7}L${x + r} ${y - r * 0.1}M${x - r} ${y - r * 0.1}L${x + r} ${y + r * 0.7}`} stroke={CREAM} strokeWidth="1.4" />
    </g>
  );
}

// ── Classic ──────────────────────────────────────────────────────────────────

function sailboat(hull: string, trim: string, sail: string) {
  return (
    <g>
      <path d="M-30 0h60l-10 15h-40Z" fill={hull} stroke={trim} strokeWidth="4" strokeLinejoin="round" />
      <rect x="-2" y="-34" width="4" height="35" fill={trim} />
      <path d="M3-32q24 14 0 30Z" fill={sail} stroke={trim} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M-3-28q-18 12 0 26Z" fill={sail} stroke={trim} strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  );
}

function chest(body: string, lid: string, lock = GOLD) {
  return (
    <g>
      <rect x="-13" y="-7" width="26" height="16" rx="2" fill={body} stroke={INK} strokeWidth="2.5" />
      <path d="M-13-7q13-12 26 0Z" fill={lid} stroke={INK} strokeWidth="2.5" />
      <rect x="-3" y="-5" width="6" height="7" fill={lock} stroke={INK} strokeWidth="1.5" />
    </g>
  );
}

const classic: VoyageGlyphs = {
  ship: ({ color }) => sailboat(pcol(color).hex, pcol(color).dark, CREAM),
  pirate: () => (
    <g>
      {sailboat(PIRATE_HULL, PIRATE_DARK, PIRATE_SAIL)}
      <Jolly x={8} y={-14} />
    </g>
  ),
  treasure: () => chest('#a0692e', '#c9893f'),
};

// ── Night: lanterns at the stern ─────────────────────────────────────────────

const night: VoyageGlyphs = {
  ship: ({ color }) => (
    <g>
      <circle cx="-24" cy="-4" r="11" fill="#ffd27a" opacity="0.25" />
      {sailboat(pcol(color).hex, pcol(color).dark, '#e9e2cf')}
      <rect x="-27" y="-8" width="6" height="8" rx="1.5" fill="#ffd27a" stroke={INK} strokeWidth="1.5" />
    </g>
  ),
  pirate: () => (
    <g>
      <circle cx="-24" cy="-4" r="13" fill={PIRATE_RED} opacity="0.3" />
      {sailboat(PIRATE_HULL, PIRATE_DARK, PIRATE_SAIL)}
      <rect x="-27" y="-8" width="6" height="8" rx="1.5" fill="#ff6b52" stroke={PIRATE_DARK} strokeWidth="1.5" />
      <Jolly x={8} y={-14} />
    </g>
  ),
  treasure: () => (
    <g>
      <circle r="20" fill="#ffd27a" opacity="0.22" />
      {chest('#8a5a28', '#b07a3a', '#ffe08a')}
    </g>
  ),
};

// ── Sakura: junks with ribbed fan sails ──────────────────────────────────────

function junk(hull: string, trim: string, sail: string) {
  return (
    <g>
      <path d="M-32-2q6 6 10 6h44q6 0 10-8l-6 18h-52Z" fill={hull} stroke={trim} strokeWidth="3.5" strokeLinejoin="round" />
      <rect x="-1.5" y="-30" width="3" height="32" fill={trim} />
      <path d="M1-28q18 4 16 26H1Z" fill={sail} stroke={trim} strokeWidth="2.2" strokeLinejoin="round" />
      {[-21, -14, -7].map((y) => (
        <line key={y} x1="1" y1={y} x2={y === -21 ? 14 : 16} y2={y} stroke={trim} strokeWidth="1.4" />
      ))}
    </g>
  );
}

const sakura: VoyageGlyphs = {
  ship: ({ color }) => junk(pcol(color).hex, pcol(color).dark, '#f7e3d6'),
  pirate: () => (
    <g>
      {junk(PIRATE_HULL, PIRATE_DARK, '#6b1f24')}
      <Jolly x={9} y={-14} r={4} />
    </g>
  ),
  treasure: () => (
    <g>
      <rect x="-13" y="-9" width="26" height="18" rx="2" fill="#8c1d22" stroke={INK} strokeWidth="2.5" />
      <rect x="-13" y="-9" width="26" height="5" fill="#2a1a1a" stroke={INK} strokeWidth="2" />
      <circle cx="0" cy="2" r="3.5" fill={GOLD} stroke={INK} strokeWidth="1.2" />
    </g>
  ),
};

// ── Nordic: longships with striped square sails ──────────────────────────────

function longship(hull: string, trim: string, stripeA: string, stripeB: string, prow: ReactNode) {
  return (
    <g>
      <path d="M-30 4h56q4-4 6-12q4 8-2 22h-56q-6-6-4-10Z" fill={hull} stroke={trim} strokeWidth="3.5" strokeLinejoin="round" />
      {[-18, -8, 2, 12].map((x) => (
        <circle key={x} cx={x} cy="7" r="3" fill="#e9dcc0" stroke={trim} strokeWidth="1.2" />
      ))}
      <rect x="-1.5" y="-30" width="3" height="34" fill={trim} />
      <rect x="-14" y="-26" width="28" height="22" fill={stripeA} stroke={trim} strokeWidth="2.2" />
      {[-9, -1, 7].map((x) => (
        <rect key={x} x={x} y="-26" width="4" height="22" fill={stripeB} />
      ))}
      {prow}
    </g>
  );
}

const nordic: VoyageGlyphs = {
  ship: ({ color }) =>
    longship(pcol(color).hex, pcol(color).dark, CREAM, pcol(color).hex, <path d="M32-8q4-6-1-9" fill="none" stroke={pcol(color).dark} strokeWidth="3" strokeLinecap="round" />),
  pirate: () => (
    <g>
      {longship(
        PIRATE_HULL,
        PIRATE_DARK,
        PIRATE_SAIL,
        '#7a1f24',
        // a dragon's head on the prow
        <path d="M30-8q2-10 8-10l-2 4 4 1-5 3q-2 4-5 2Z" fill={PIRATE_DARK} stroke={PIRATE_DARK} strokeWidth="1.5" strokeLinejoin="round" />,
      )}
      <circle cx="37" cy="-15" r="1.3" fill={PIRATE_RED} />
    </g>
  ),
  treasure: () => (
    <g>
      {chest('#6b4a2b', '#8a6440', '#b8c0c8')}
      <path d="M-9 2l2-5 2 5M5-2v6M8-2l-3 3" fill="none" stroke="#e9dcc0" strokeWidth="1.3" />
    </g>
  ),
};

// ── Frontier: paddle steamers and an outlaw gunboat ──────────────────────────

function steamer(hull: string, trim: string, cabin: string, stack: string) {
  return (
    <g>
      <path d="M-30 4h58l-4 10h-54Z" fill={hull} stroke={trim} strokeWidth="3.5" strokeLinejoin="round" />
      <rect x="-14" y="-10" width="30" height="14" rx="1.5" fill={cabin} stroke={trim} strokeWidth="2.5" />
      <rect x="8" y="-28" width="6" height="18" fill={stack} stroke={trim} strokeWidth="2" />
      <rect x="6" y="-30" width="10" height="4" fill={stack} stroke={trim} strokeWidth="1.5" />
      {/* the stern paddle wheel */}
      <circle cx="-26" cy="4" r="9" fill="none" stroke={trim} strokeWidth="3" />
      <path d="M-35 4h18M-26-5v18" stroke={trim} strokeWidth="2" />
    </g>
  );
}

const frontier: VoyageGlyphs = {
  ship: ({ color }) => steamer(pcol(color).hex, pcol(color).dark, '#f1e3c4', '#3a3530'),
  pirate: () => (
    <g>
      {steamer(PIRATE_HULL, PIRATE_DARK, '#4a4540', PIRATE_DARK)}
      <line x1="22" y1="-4" x2="22" y2="-26" stroke={PIRATE_DARK} strokeWidth="2" />
      <path d="M22-26h12l-3 5 3 5h-12Z" fill={PIRATE_DARK} />
      <circle cx="28" cy="-21" r="2" fill={CREAM} />
    </g>
  ),
  treasure: () => (
    <g>
      <rect x="-13" y="-9" width="26" height="18" rx="1.5" fill="#6d7074" stroke={INK} strokeWidth="2.5" />
      <path d="M-13-2h26" stroke={INK} strokeWidth="1.8" />
      {[-9, 9].map((x) => [-5, 5].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.4" fill="#c8ccd0" />))}
      <rect x="-3" y="-3" width="6" height="7" fill={GOLD} stroke={INK} strokeWidth="1.3" />
    </g>
  ),
};

// ── Nile: feluccas with tall lateen sails ────────────────────────────────────

function felucca(hull: string, trim: string, sail: string) {
  return (
    <g>
      <path d="M-30 0q10 14 30 14t30-14Z" fill={hull} stroke={trim} strokeWidth="3.5" strokeLinejoin="round" />
      <line x1="-4" y1="2" x2="-4" y2="-18" stroke={trim} strokeWidth="3" />
      <line x1="-22" y1="-4" x2="20" y2="-36" stroke={trim} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M-20-5L19-35L14 0Z" fill={sail} stroke={trim} strokeWidth="2" strokeLinejoin="round" />
    </g>
  );
}

const nile: VoyageGlyphs = {
  ship: ({ color }) => felucca(pcol(color).hex, pcol(color).dark, '#f3ead3'),
  pirate: () => (
    <g>
      {felucca(PIRATE_HULL, PIRATE_DARK, PIRATE_SAIL)}
      <Jolly x={6} y={-14} r={4} />
    </g>
  ),
  treasure: () => (
    <g>
      <rect x="-13" y="-8" width="26" height="17" rx="1.5" fill="#d9a441" stroke={INK} strokeWidth="2.5" />
      {[-7, 0, 7].map((x) => (
        <rect key={x} x={x - 1.5} y="-8" width="3" height="17" fill="#2f5e9e" />
      ))}
      <path d="M-15-8h30l-4-5h-22Z" fill="#e8bd5a" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </g>
  ),
};

// ── Skyport: airships over the clouds ────────────────────────────────────────

function airship(envelope: string, trim: string, gondola: string) {
  return (
    <g transform="translate(0 -10)">
      <ellipse rx="27" ry="12" fill={envelope} stroke={trim} strokeWidth="3" />
      <path d="M-27 0h54" stroke={trim} strokeWidth="1.5" opacity="0.6" />
      <path d="M-24-4l-8-6v20l8-6Z" fill={envelope} stroke={trim} strokeWidth="2" strokeLinejoin="round" />
      <rect x="-9" y="12" width="18" height="7" rx="2" fill={gondola} stroke={trim} strokeWidth="2" />
      <path d="M-6 12l-2-4M6 12l2-4" stroke={trim} strokeWidth="1.5" />
    </g>
  );
}

const skyport: VoyageGlyphs = {
  ship: ({ color }) => airship(pcol(color).hex, pcol(color).dark, '#6b4f36'),
  pirate: () => (
    <g>
      {airship('#2b241e', PIRATE_DARK, '#171310')}
      <path d="M-27-10h54" stroke={PIRATE_RED} strokeWidth="2.5" />
      <Jolly x={8} y={-12} r={4} />
    </g>
  ),
  treasure: () => (
    <g>
      <line x1="0" y1="-10" x2="0" y2="-22" stroke={INK} strokeWidth="1.5" />
      <ellipse cx="0" cy="-26" rx="8" ry="7" fill="#d9483b" stroke={INK} strokeWidth="2" />
      <rect x="-11" y="-10" width="22" height="18" fill="#b98a55" stroke={INK} strokeWidth="2.5" />
      <path d="M-11-10l22 18M11-10l-22 18" stroke="#7a5630" strokeWidth="2" />
    </g>
  ),
};

// ── Cyberpunk: neon hover-boats ──────────────────────────────────────────────

/** A hover speedboat in side view: raked hull, glass canopy, a stern engine and a glow on the water. */
function hoverboat(hull: string, trim: string, glow: string, stripe: string) {
  return (
    <g>
      <path d="M-26 15h46" stroke={glow} strokeWidth="7" strokeOpacity="0.3" strokeLinecap="round" />
      <path d="M-27-3l4-9h6l-2 9Z" fill={trim} stroke="#05060a" strokeWidth="2" strokeLinejoin="round" />
      <rect x="-35" y="-1" width="9" height="8" rx="2.5" fill={trim} stroke="#05060a" strokeWidth="2" />
      <Glow x={-36} y={3} r={2} color={glow} />
      <path d="M-30-3H8l24 8-6 5h-56Z" fill={hull} stroke={trim} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M-12-3c2-8 8-11 14-11s10 5 12 11Z" fill="#1d2233" stroke={trim} strokeWidth="2" strokeLinejoin="round" />
      <path d="M-4-11c3-1 6-1 8 1" stroke="#9fb3d9" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <Neon d="M-26 4H14l12 3" color={stripe} width={1.8} />
    </g>
  );
}

const cyberpunk: VoyageGlyphs = {
  ship: ({ color }) => hoverboat(pcol(color).hex, pcol(color).dark, pcol(color).hex, '#dff6ff'),
  pirate: () => hoverboat('#15161d', '#050508', PIRATE_RED, PIRATE_RED),
  treasure: () => (
    <g>
      <rect x="-14" y="-8" width="28" height="16" rx="3" fill="#1d2233" stroke="#05060a" strokeWidth="2.5" />
      <Neon d="M-9 0h18" color="#2de2e6" width={2} />
      <Glow x={9} y={-4} r={1.6} color="#ff3ea5" />
    </g>
  ),
};

// ── Orbital: shuttles and a pirate cruiser ───────────────────────────────────

const CYAN = '#5ee7ff';

const orbital: VoyageGlyphs = {
  ship: ({ color }) => (
    <g>
      <path d="M-24 6l-8 8h10ZM-24-6l-8-8h10Z" fill={pcol(color).dark} />
      <path d="M-26-7h34q18 0 22 7-4 7-22 7h-34Z" fill={pcol(color).hex} stroke={pcol(color).dark} strokeWidth="3" strokeLinejoin="round" />
      <path d="M14-4q10 0 12 4-2 4-12 4Z" fill="#1c1f2c" />
      <Glow x={-28} y={0} r={3} color={CYAN} />
    </g>
  ),
  pirate: () => (
    <g>
      <path d="M34 0L-18-18L-8 0L-18 18Z" fill="#23262f" stroke="#0b0c10" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M22 0L2-6v12Z" fill="#101218" />
      <Glow x={-12} y={-8} r={2.6} color={PIRATE_RED} />
      <Glow x={-12} y={8} r={2.6} color={PIRATE_RED} />
    </g>
  ),
  treasure: () => (
    <g>
      <rect x="-14" y="-8" width="28" height="16" rx="8" fill="#c9ced8" stroke="#1c1f2c" strokeWidth="2.5" />
      <path d="M-4-8v16M4-8v16" stroke="#1c1f2c" strokeWidth="1.5" />
      <Glow x={-9} y={0} r={1.6} color={CYAN} />
      <Glow x={9} y={0} r={1.6} color={GOLD} />
    </g>
  ),
};

// ── Origami: folded paper boats ──────────────────────────────────────────────

function paperBoat(fill: string, fold: string) {
  return (
    <g strokeLinejoin="round">
      <path d="M-30 0h60l-12 14h-36Z" fill={fill} stroke={fold} strokeWidth="2.5" />
      <path d="M-14 0L0-28L14 0Z" fill={fill} stroke={fold} strokeWidth="2.5" />
      <path d="M0-28V0M-30 0l12 14M30 0l-12 14" stroke={fold} strokeWidth="1.3" opacity="0.7" fill="none" />
    </g>
  );
}

const origami: VoyageGlyphs = {
  ship: ({ color }) => paperBoat(pcol(color).hex, pcol(color).dark),
  pirate: () => (
    <g>
      {paperBoat(PIRATE_HULL, PIRATE_DARK)}
      <Jolly x={0} y={-8} r={4} />
    </g>
  ),
  treasure: () => (
    <g strokeLinejoin="round">
      <path d="M-13-4h26v13h-26Z" fill="#e8c46a" stroke={INK} strokeWidth="2.2" />
      <path d="M-13-4l6-7h14l6 7Z" fill="#f3d98c" stroke={INK} strokeWidth="2.2" />
      <path d="M0-4v13M-7-11l7 7 7-7" fill="none" stroke={INK} strokeWidth="1.2" opacity="0.6" />
    </g>
  ),
};

/** Every theme's Voyagers pieces (classic for the themes that don't draw their own). */
export const VOYAGE_GLYPHS: Record<BoardThemeId, VoyageGlyphs> = {
  classic,
  night,
  sakura,
  nordic,
  frontier,
  nile,
  skyport,
  cyberpunk,
  orbital,
  origami,
};
