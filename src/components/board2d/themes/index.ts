import type { BoardThemeId } from '@/client/themes';
import { cyberpunkGlyphs } from './cyberpunk';
import { frontierGlyphs } from './frontier';
import { nileGlyphs } from './nile';
import { nordicGlyphs } from './nordic';
import { orbitalGlyphs } from './orbital';
import { origamiGlyphs } from './origami';
import { sakuraGlyphs } from './sakura';
import { skyportGlyphs } from './skyport';
import type { TileGlyphs } from './types';

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
