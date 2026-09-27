'use client';

import { createContext, useContext } from 'react';
import { PALETTES, type BoardPalette, type BoardThemeId } from '@/client/themes';
import { cyberpunk } from './cyberpunk';
import { frontier } from './frontier';
import { night } from './night';
import { nile } from './nile';
import { nordic } from './nordic';
import { orbital } from './orbital';
import { origami } from './origami';
import { sakura } from './sakura';
import { skyport } from './skyport';
import type { ThemeKit } from './types';

const KITS: Record<BoardThemeId, ThemeKit> = { classic: {}, night, sakura, nordic, frontier, nile, skyport, cyberpunk, orbital, origami };

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
