import type { FC } from 'react';
import type { Terrain } from '@/engine/types';
import type { Prop } from '../terrainKit';

/** A player's piece colours: the body and a darker tone for roofs and trim. */
export interface PieceColors {
  hex: string;
  dark: string;
}

/**
 * A settlement or city model, drawn at its spot on the tile surface (y = 0 is the tile top) and
 * already scaled for the Board size setting. Spread `o` into every `mat()` call: it makes a
 * placement preview (`ghost`) see-through.
 */
export interface ModelProps {
  c: PieceColors;
  o: { opacity?: number };
  ghost: boolean;
}

/**
 * What a board theme changes in 3D. Everything is optional: whatever a theme leaves out keeps the
 * classic look. Colours, sea and light come from the theme's palette (src/client/themes.ts).
 */
export interface ThemeKit {
  /** The props standing on a tile, or null to keep the classic ones for that terrain. */
  props?: (terrain: Terrain, seed: number) => Prop[] | null;
  Settlement?: FC<ModelProps>;
  City?: FC<ModelProps>;
  /** The robber's figure (the classic wrapper moves it around). */
  Robber?: FC<{ o: { opacity?: number }; ghost: boolean }>;
  /**
   * Extra decoration on a harbor, at the sea end of its pier: `x`/`z` in board coordinates,
   * `rot` the pier's rotation about y (the pier's long side runs along its local x).
   */
  Harbor?: FC<{ x: number; z: number; rot: number }>;
  /**
   * Something extra on every uncovered tile, in the tile's own frame (centre at 0, y = 0 is the
   * tile surface), e.g. a light source. Keep clear of the number token (TOKEN_CLEAR).
   */
  Tile?: FC<{ terrain: Terrain; seed: number }>;
  /** Extra decoration on a road, in the road's own frame: x runs along the road (0.62 long, 0.13 wide), y = 0 is 0.06 above the tile surface. */
  Road?: FC<{ ghost: boolean }>;
}
