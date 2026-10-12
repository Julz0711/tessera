import type { FC } from 'react';
import type * as THREE from 'three';
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
 * What one C&K knight figure is drawn with (see `KnightFigure`/`KnightModel` in knights.tsx): the
 * player's colours (`cloth` in `hex`, `dark` for trim/accents — keep it dominant, like a
 * `ModelProps`' `c`), a neutral steel `metal`/`trim` a theme may reuse for straps and blades,
 * whether to cast shadows, and `headY` (world y of the head's centre at scale 1) so the face and
 * any headwear line up. A themed `Knight` is free to ignore `metal`/`trim` if its own
 * palette reads better, but should stay close to the classic's ~0.6-unit height and footprint so
 * formations and hit targets still work.
 */
export interface KnightFigureProps {
  metal: THREE.Material;
  trim: THREE.Material;
  cloth: THREE.Material;
  dark: THREE.Material;
  shadows: boolean;
  headY: number;
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
  /**
   * Something under every tile, fog included, in the tile's own frame (y = 0 is the tile surface;
   * the tile and its beach reach down to y = -0.35): the underside of an island that floats.
   */
  Base?: FC<{ seed: number }>;
  /**
   * Extra decoration on a road, in the road's own frame: x runs along the road (0.62 long, 0.13
   * wide, both times the Board size scale in width), y = 0 is 0.06 above the tile surface. `c` is
   * the owner's colours.
   */
  Road?: FC<{ ghost: boolean; c: PieceColors }>;
  /**
   * Replaces the ocean around the island (clouds, space…). Like the ocean it sits at the world
   * origin, under the island; `shelfRadius` is how far out the shallows reach.
   */
  Sea?: FC<{ shelfRadius: number }>;
  /**
   * The barbarian ship's craft (C&K), drawn at the ship's own position: bow towards +z, sized like
   * the classic longship (about 0.75 long along z and 0.55 tall once the wrapper's 1.7 scale is
   * applied — see `Ship` in barbarians.tsx). `danger` is true once the barbarians are two steps
   * from landing; show it with red tints/glow, like the classic longship does.
   */
  BarbarianShip?: FC<{ danger: boolean }>;
  /** Replaces one knight figure's body (legs through weapon) in the theme's own style. */
  Knight?: FC<KnightFigureProps>;
  /**
   * The wall ring around a walled city (C&K), drawn at the city's spot on the tile surface (y = 0
   * is the tile top) and already scaled for the Board size setting, like a Settlement/City. `c` is
   * the owner's colours, for a themed touch of player colour (a banner, a painted panel…). Keep the
   * classic ring's footprint (~0.33 radius) and stay low enough not to hide the city or a nearby
   * number token.
   */
  CityWall?: FC<{ c: PieceColors }>;
}
