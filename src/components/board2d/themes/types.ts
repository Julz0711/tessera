import type { ReactNode } from 'react';
import type { Terrain } from '@/engine/types';
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
