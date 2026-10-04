import type { BoardThemeId } from '@/client/themes';
import { cyberpunkAccents, cyberpunkPieces, cyberpunkShip } from './cyberpunk';
import { frontierAccents, frontierPieces, frontierShip } from './frontier';
import { nightPieces, nightShip } from './night';
import { nileAccents, nilePieces, nileShip } from './nile';
import { nordicAccents, nordicPieces, nordicShip } from './nordic';
import { orbitalAccents, orbitalPieces, orbitalShip } from './orbital';
import { origamiAccents, origamiPieces, origamiShip } from './origami';
import { sakuraAccents, sakuraPieces, sakuraShip } from './sakura';
import { skyportAccents, skyportPieces, skyportShip } from './skyport';
import { classicAccents } from './classic';
import type { BarbarianShipGlyph, ThemePieces, TileAccents } from './types';

export type { BarbarianShipGlyph, ThemePieces, TileAccents } from './types';

/** Each theme's accessories on its 2D tiles; a theme left out (Night) recolours the classic ones. */
export const THEME_ACCENTS: Partial<Record<BoardThemeId, TileAccents>> = {
  classic: classicAccents,
  sakura: sakuraAccents,
  nordic: nordicAccents,
  frontier: frontierAccents,
  nile: nileAccents,
  skyport: skyportAccents,
  cyberpunk: cyberpunkAccents,
  orbital: orbitalAccents,
  origami: origamiAccents,
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
