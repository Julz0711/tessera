'use client';

import { createContext, useContext } from 'react';
import { PALETTES, type BoardPalette, type BoardThemeId } from '@/client/themes';
import { night } from './night';
import { nordic } from './nordic';
import { sakura } from './sakura';
import type { ThemeKit } from './types';

const KITS: Record<BoardThemeId, ThemeKit> = { classic: {}, night, sakura, nordic };

/** The board theme in effect inside a 3D board (set by Board3D inside its canvas). */
export const BoardThemeContext = createContext<BoardThemeId>('classic');

export function useBoardThemeId(): BoardThemeId {
  return useContext(BoardThemeContext);
}

export function useBoardPalette(): BoardPalette {
  return PALETTES[useContext(BoardThemeContext)];
}

export function useBoardKit(): ThemeKit {
  return KITS[useContext(BoardThemeContext)];
}
