import type { BoardThemeId } from '@/client/themes';
import { cyberpunkGlyphs, cyberpunkPieces, cyberpunkShip } from './cyberpunk';
import { frontierGlyphs, frontierPieces, frontierShip } from './frontier';
import { nightPieces, nightShip } from './night';
import { nileGlyphs, nilePieces, nileShip } from './nile';
import { nordicGlyphs, nordicPieces, nordicShip } from './nordic';
import { orbitalGlyphs, orbitalPieces, orbitalShip } from './orbital';
import { origamiGlyphs, origamiPieces, origamiShip } from './origami';
import { sakuraGlyphs, sakuraPieces, sakuraShip } from './sakura';
import { skyportGlyphs, skyportPieces, skyportShip } from './skyport';
import type { BarbarianShipGlyph, ThemePieces, TileGlyphs } from './types';

export type { BarbarianShipGlyph, ThemePieces, TileGlyphs } from './types';

/** Themes that draw their own 2D tiles; the others only recolour the classic drawings. */
export const THEME_GLYPHS: Partial<Record<BoardThemeId, TileGlyphs>> = {
  sakura: sakuraGlyphs,
  nordic: nordicGlyphs,
  frontier: frontierGlyphs,
  nile: nileGlyphs,
  skyport: skyportGlyphs,
  cyberpunk: cyberpunkGlyphs,
  orbital: orbitalGlyphs,
  origami: origamiGlyphs,
};

/** Themes that draw their own barbarian ship (C&K); the rest keep the classic longship. */
export const THEME_BARBARIAN_SHIPS: Partial<Record<BoardThemeId, BarbarianShipGlyph>> = {
  night: nightShip,
  sakura: sakuraShip,
  nordic: nordicShip,
  frontier: frontierShip,
  nile: nileShip,
  skyport: skyportShip,
  cyberpunk: cyberpunkShip,
  orbital: orbitalShip,
  origami: origamiShip,
};

/**
 * Themes that draw their own settlements, cities, roads and/or knights; anything a theme leaves
 * out (any single piece, or the whole theme, like classic) keeps the classic drawing for it.
 */
export const THEME_PIECES: Partial<Record<BoardThemeId, ThemePieces>> = {
  night: nightPieces,
  sakura: sakuraPieces,
  nordic: nordicPieces,
  frontier: frontierPieces,
  nile: nilePieces,
  skyport: skyportPieces,
  cyberpunk: cyberpunkPieces,
  orbital: orbitalPieces,
  origami: origamiPieces,
};
