import type { BoardThemeId } from '@/client/themes';
import { cyberpunkGlyphs, cyberpunkShip } from './cyberpunk';
import { frontierGlyphs, frontierShip } from './frontier';
import { nightShip } from './night';
import { nileGlyphs, nileShip } from './nile';
import { nordicGlyphs, nordicShip } from './nordic';
import { orbitalGlyphs, orbitalShip } from './orbital';
import { origamiGlyphs, origamiShip } from './origami';
import { sakuraGlyphs, sakuraShip } from './sakura';
import { skyportGlyphs, skyportShip } from './skyport';
import type { BarbarianShipGlyph, TileGlyphs } from './types';

export type { BarbarianShipGlyph, TileGlyphs } from './types';

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
