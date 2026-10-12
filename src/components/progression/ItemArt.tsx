'use client';

import { itemById, type Item, type Slot } from '@/shared/progression';
import { PLAYER_COLORS } from '@/shared/colors';
import type { PlayerColor } from '@/engine/types';

/**
 * PLACEHOLDER art for progression items: simple flat shapes with the item's letter, in the
 * player's colour. The real low-poly characters, banners and surrounds replace these by `art` key;
 * every screen draws items through this file only.
 */

const INK = '#131a1d';
const letterOf = (item: Pick<Item, 'art'>) => item.art.slice(-1).toUpperCase();

function Character({ letter, color, size }: { letter: string; color: string; size: number }) {
  return (
    <svg viewBox="0 0 60 90" width={size * (60 / 90)} height={size} aria-hidden="true">
      <polygon points="18,44 42,44 46,82 14,82" fill={color} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <polygon points="30,8 42,15 42,29 30,36 18,29 18,15" fill="#e6b48c" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <text x="30" y="70" textAnchor="middle" fontSize="18" fontWeight="900" fill={INK}>{letter}</text>
    </svg>
  );
}

function Banner({ letter, color, size }: { letter: string; color: string; size: number }) {
  return (
    <svg viewBox="0 0 60 90" width={size * (60 / 90)} height={size} aria-hidden="true">
      <line x1="10" y1="6" x2="10" y2="86" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <polygon points="12,10 54,10 54,46 33,38 12,46" fill={color} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <text x="33" y="32" textAnchor="middle" fontSize="18" fontWeight="900" fill={INK}>{letter}</text>
    </svg>
  );
}

/** A frame around whatever sits inside (the portrait); thicker per letter so the dummies differ. */
export function SurroundFrame({ id, size, children }: { id: string | null; size: number; children?: React.ReactNode }) {
  const item = id ? itemById(id) : undefined;
  const n = item ? Math.max(0, item.art.charCodeAt(item.art.length - 1) - 97) : 0;
  const w = 2 + n * 2;
  const fill = ['transparent', '#a07848', '#d9c08a', '#8fa0a6', '#d7a02f', '#2e9c6a'][n % 6];
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <span className="absolute overflow-hidden rounded-[4px]" style={{ inset: w }}>{children}</span>
      <span className="pointer-events-none absolute inset-0 rounded-[4px]" style={{ border: `${w}px solid ${fill}`, outline: `2px solid ${INK}`, outlineOffset: -2 }} />
      {n > 0 && <span className="pointer-events-none absolute rounded-[2px]" style={{ inset: w - 1, border: `2px solid ${INK}` }} />}
    </span>
  );
}

export function ItemArt({ id, color, size = 64 }: { id: string | null; color: PlayerColor; size?: number }) {
  const item = id ? itemById(id) : undefined;
  if (!item) return null;
  const hex = PLAYER_COLORS[color].hex;
  const slot: Slot = item.slot;
  if (slot === 'character') return <Character letter={letterOf(item)} color={hex} size={size} />;
  if (slot === 'banner') return <Banner letter={letterOf(item)} color={hex} size={size} />;
  if (slot === 'surround') return <SurroundFrame id={item.id} size={size * 0.8}><span className="block h-full w-full" style={{ background: PLAYER_COLORS[color].hex }} /></SurroundFrame>;
  return <span className="display rounded-[4px] border-2 border-ink bg-paper-2 px-2 py-0.5 text-sm font-black">{item.name}</span>;
}

/** Level as a count badge: hexes are kept for counts. */
export function LevelBadge({ level, size = 28 }: { level: number; size?: number }) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size * 1.12 }} title={`Level ${level}`} aria-label={`Level ${level}`}>
      <svg viewBox="0 0 68 76" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <polygon points="34,2 66,19 66,57 34,74 2,57 2,19" fill="var(--color-amber)" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      </svg>
      <span className="relative font-black tabular text-ink" style={{ fontSize: size * (level > 99 ? 0.36 : 0.46) }}>{level}</span>
    </span>
  );
}
