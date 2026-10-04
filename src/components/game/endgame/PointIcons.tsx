import { Crown, Flag, ScrollText, Shield, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PlayerColor } from '@/engine/types';
import { PLAYER_COLORS } from '@/shared/colors';
import { KnightGlyph, RoadGlyph } from '@/components/ui/Glyphs';
import { MiniArt } from '../cardArt';

const OUTLINE = 3;

/** The classic settlement/city shapes of the board, small, filled in the owner's colour. */
function House({ color, city, size }: { color: PlayerColor; city?: boolean; size: number }) {
  const c = PLAYER_COLORS[color];
  return (
    <svg width={city ? size * 1.45 : size} height={size} viewBox={city ? '-30 -22 60 44' : '-21 -18 42 36'} aria-hidden>
      <path
        d={city ? 'M-26 17v-18l12-9 12 9v-18h9v-8h8v8h9v36Z' : 'M-17 14v-17l17-14 17 14v17Z'}
        fill={c.hex}
        // On paper a white piece's pale trim disappears: it gets the ink outline instead.
        stroke={color === 'white' ? '#1f1a14' : c.dark}
        strokeWidth={OUTLINE}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A glyph for the points that aren't pieces, in the chip's ink (a tint for the metropolis crown). */
function Tile({ children, tint }: { children: ReactNode; tint?: string }) {
  return (
    <span className="grid h-5 w-5 place-items-center text-ink" style={tint ? { color: tint } : undefined}>
      {children}
    </span>
  );
}

interface Kind {
  /** Points each icon stands for. */
  per: number;
  icon: (color: PlayerColor) => ReactNode;
}

const KINDS: Record<string, Kind> = {
  Settlements: { per: 1, icon: (c) => <House color={c} size={20} /> },
  Cities: { per: 2, icon: (c) => <House color={c} city size={20} /> },
  Metropolises: { per: 2, icon: () => <Tile tint="#c98a12"><Crown size={14} strokeWidth={2.4} /></Tile> },
  'Longest route': { per: 2, icon: () => <Tile><RoadGlyph size={16} /></Tile> },
  'Island discoveries': { per: 1, icon: () => <Tile><Flag size={13} strokeWidth={2.4} /></Tile> },
  'Largest army': { per: 2, icon: () => <Tile><KnightGlyph size={16} /></Tile> },
  'VP cards': { per: 1, icon: () => <Tile><MiniArt card="victoryPoint" size={16} /></Tile> },
  Defender: { per: 1, icon: () => <Tile><Shield size={13} strokeWidth={2.4} /></Tile> },
  'Progress VP': { per: 1, icon: () => <Tile><ScrollText size={13} strokeWidth={2.4} /></Tile> },
  Merchant: { per: 1, icon: () => <Tile><UserRound size={13} strokeWidth={2.4} /></Tile> },
};

/**
 * Victory points by source, one chip per kind: its icon and how many (3 cities → a city ×3), so a
 * player's points read in one short row.
 */
export function PointIcons({ points, color, className = '' }: { points: Record<string, number>; color: PlayerColor; className?: string }) {
  // Always in the order of KINDS (pieces first): a saved report's points come back in whatever
  // order the database keeps the keys in.
  const groups = Object.keys(KINDS)
    .filter((label) => (points[label] ?? 0) > 0)
    .map((label) => ({ label, n: points[label], count: Math.max(1, Math.round(points[label] / KINDS[label].per)), kind: KINDS[label] }));
  if (!groups.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`} role="group" aria-label={`Points: ${groups.map((g) => `${g.label} ${g.n}`).join(', ')}`}>
      {groups.map((g) => (
        <span key={g.label} className="inline-flex h-7 items-center gap-1 rounded-full bg-ink/[0.06] px-1.5" title={`${g.label}: ${g.n} VP`}>
          {g.kind.icon(color)}
          {g.count > 1 && <b className="text-xs font-black tabular text-ink-soft">{g.count}</b>}
        </span>
      ))}
    </div>
  );
}
