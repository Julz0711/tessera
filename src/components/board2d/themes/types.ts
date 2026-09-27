import type { ReactNode } from 'react';
import type { Terrain } from '@/engine/types';
import type { TileColors } from '@/client/themes';

/**
 * A board theme's own drawings on a 2D tile (SVG, in board units: the tile's centre is `cx`/`cy`
 * and its corners are about 100 away; keep clear of the number token, radius ~32 around the centre).
 * Return null to keep the classic drawing for that terrain.
 */
export type TileGlyphs = (p: { terrain: Terrain; cx: number; cy: number; c: TileColors }) => ReactNode | null;
