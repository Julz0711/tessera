import type { ReactNode } from 'react';
import type { PlayerColor, Terrain } from '@/engine/types';
import type { TileColors } from '@/client/themes';

/**
 * A board theme's own drawings on a 2D tile (SVG, in board units: the tile's centre is `cx`/`cy`
 * and its corners are about 100 away; keep clear of the number token, radius ~32 around the centre).
 * Return null to keep the classic drawing for that terrain.
 */
export type TileGlyphs = (p: { terrain: Terrain; cx: number; cy: number; c: TileColors }) => ReactNode | null;

/** Harbor piers on both boards: the deck, the planks to the shore and the posts. */
export type PierColors = { deck: string; plank: string; post: string };

/**
 * A theme's own barbarian ship (C&K) on the 2D board: an SVG silhouette about 60 units wide,
 * centred at the origin and bow-up (the caller in Board2D.tsx translates and scales it onto the
 * ship's step). `danger` is true once the barbarians are two steps from landing — tint it red like
 * the classic ship does. `wood` is the theme's pier palette (the neutral wood tones when unset).
 */
export type BarbarianShipGlyph = (p: { danger: boolean; wood: PierColors }) => ReactNode;

/**
 * A theme's own settlement or city on the 2D board, drawn at its vertex (`x`/`y`, board units,
 * already scaled by `k` — the caller wraps the glyph in the grow/ghost-opacity transform, so the
 * glyph itself just draws around (x, y) at scale 1). Same footprint as the classic house (~34
 * wide, ~31 tall) or city (~52 wide, ~43 tall) so it doesn't crowd its neighbours. Fill with the
 * owner's colour (`color`, looked up via PLAYER_COLORS) so it stays instantly readable — the
 * colour must stay dominant, with a dark outline like the classic pieces.
 */
export type PieceGlyph = (p: { x: number; y: number; color: PlayerColor }) => ReactNode;

/**
 * A theme's own road on the 2D board: the segment's two (already-inset) endpoints. Ghost roads
 * (build hints, placement previews) pass `ghost: true` — keep those cheap (the owner-colour line
 * alone is enough; skip decoration) since the classic `RoadBase` helper already handles it.
 */
export type RoadGlyph = (p: { x1: number; y1: number; x2: number; y2: number; color: PlayerColor; ghost?: boolean; k?: number }) => ReactNode;

/**
 * A theme's own knight emblem (C&K), replacing the crossed swords inside the classic knight's
 * disc. Board2D keeps the disc itself (active/inactive colour, the owner-colour ring) and the
 * level pips below unthemed, so those states keep working automatically — the glyph only draws
 * the ~26×29 emblem centred on (x, y), filled with the owner's colour.
 */
export type KnightGlyph = (p: { x: number; y: number; color: PlayerColor }) => ReactNode;

/** What a theme changes about the pieces standing on the 2D board; anything left out keeps the classic drawing. */
export type ThemePieces = {
  settlement?: PieceGlyph;
  city?: PieceGlyph;
  road?: RoadGlyph;
  knight?: KnightGlyph;
};
