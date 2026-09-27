import type { BoardThemeId } from '@/client/themes';
import { nordicGlyphs } from './nordic';
import { sakuraGlyphs } from './sakura';
import type { TileGlyphs } from './types';

/** Themes that draw their own 2D tiles; the others only recolour the classic drawings. */
export const THEME_GLYPHS: Partial<Record<BoardThemeId, TileGlyphs>> = { sakura: sakuraGlyphs, nordic: nordicGlyphs };
