import type { ReactNode } from 'react';
import type { PlayerColor, Terrain } from '@/engine/types';
import type { TileColors } from '@/client/themes';

/**
 * A board theme's own drawings on a 2D tile, in the colonist.io layout: Board2D draws the resource
 * card's icon at the top and the number token below the centre, and the theme adds one small
 * accessory either side of the icon (SVG, board units: the tile's corners are about 93 from its centre).
 */
export type TileAccents = {
  /**
   * One small accessory for `terrain` (forest, hills, pasture, fields, mountains, desert, gold),
   * about 26 wide and 20 tall, centred on (x, y). Board2D draws it on both sides and mirrors the
   * right-hand one; `right` says which side this is, for a theme that wants them to differ.
   * Return null to keep the classic accessory for that terrain.
   */
  side: (p: { terrain: Terrain; x: number; y: number; c: TileColors; right: boolean }) => ReactNode | null;
  /** The desert's centrepiece (it has no icon or number), about 56 across, centred on (x, y). */
  desert?: (p: { x: number; y: number; c: TileColors }) => ReactNode;
};

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
 * A theme's own metropolis (C&K): a grander take on its city, standing on the same footprint, with
 * `accent` (the improvement track's colour) on a flag or detail so you can tell which track it is.
 */
export type MetropolisGlyph = (p: { x: number; y: number; color: PlayerColor; accent: string }) => ReactNode;

/** What a theme changes about the pieces standing on the 2D board; anything left out keeps the classic drawing. */
export type ThemePieces = {
  settlement?: PieceGlyph;
  city?: PieceGlyph;
  road?: RoadGlyph;
  metropolis?: MetropolisGlyph;
};
