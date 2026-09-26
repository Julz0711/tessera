'use client';

import { create } from 'zustand';
import type { PlayerColor } from '@/engine/types';
import { isPlayerColor } from '@/shared/colors';
import { DEFAULT_COSMETICS, sanitizeCosmetics, type Cosmetics } from '@/shared/cosmetics';
import { DEFAULT_KNIGHT, sanitizeKnight, type KnightCustomization } from '@/shared/knight';

/** Per-browser preferences (localStorage). Profiles override the identity defaults when signed in. */
export interface Prefs {
  name: string;
  color: PlayerColor;
  knight: KnightCustomization;
  /** Frame and title (the server only honours unlocked ones; signed-in profiles keep their own). */
  cosmetics: Cosmetics;
  view: '3d' | '2d';
  graphics: 'high' | 'low';
  volume: number;
  /** Show affordable build spots on the board without picking Road/Settle/City first. */
  buildHints: boolean;
  /** Ask before placing a piece (a popup at the spot), so a stray click can't build anything. */
  confirmBuilds: boolean;
  /** Size of the pieces, number tokens and harbors on the board (the rest of the UI keeps its size). */
  boardScale: BoardScale;
  /** Flying cards and other movement: follow the system's reduce-motion setting, or always full / reduced. */
  motion: Motion;
}

const KEY = 'prefs.v1';

export type BoardScale = 'small' | 'medium' | 'large';
export type Motion = 'system' | 'full' | 'reduced';

/** How much the pieces on the board grow or shrink for each size setting. */
export const BOARD_SCALE: Record<BoardScale, number> = { small: 0.8, medium: 1, large: 1.25 };

const defaults = (): Prefs => ({
  name: '',
  color: 'red',
  knight: DEFAULT_KNIGHT,
  cosmetics: DEFAULT_COSMETICS,
  view: '3d',
  graphics: 'high',
  volume: 0.6,
  buildHints: true,
  confirmBuilds: true,
  boardScale: 'medium',
  motion: 'system',
});

function read(): Prefs {
  const base = defaults();
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<Prefs> & { uiScale?: unknown };
    // `uiScale` was the name of this setting when it scaled the whole interface.
    const boardScale = p.boardScale ?? p.uiScale;
    return {
      name: typeof p.name === 'string' ? p.name.slice(0, 20) : base.name,
      color: isPlayerColor(p.color) ? p.color : base.color,
      knight: sanitizeKnight(p.knight),
      cosmetics: sanitizeCosmetics(p.cosmetics),
      view: p.view === '2d' ? '2d' : '3d',
      graphics: p.graphics === 'low' ? 'low' : 'high',
      volume: typeof p.volume === 'number' ? Math.min(1, Math.max(0, p.volume)) : base.volume,
      buildHints: typeof p.buildHints === 'boolean' ? p.buildHints : base.buildHints,
      confirmBuilds: typeof p.confirmBuilds === 'boolean' ? p.confirmBuilds : base.confirmBuilds,
      boardScale: boardScale === 'small' || boardScale === 'large' ? boardScale : base.boardScale,
      motion: p.motion === 'full' || p.motion === 'reduced' ? p.motion : base.motion,
    };
  } catch {
    return base;
  }
}

interface PrefsStore extends Prefs {
  loaded: boolean;
  load(): void;
  set(patch: Partial<Prefs>): void;
}

export const usePrefs = create<PrefsStore>((set, get) => ({
  ...defaults(),
  loaded: false,
  load() {
    if (get().loaded) return;
    set({ ...read(), loaded: true });
  },
  set(patch) {
    set(patch);
    try {
      const { name, color, knight, cosmetics, view, graphics, volume, buildHints, confirmBuilds, boardScale, motion } = { ...get(), ...patch };
      window.localStorage.setItem(KEY, JSON.stringify({ name, color, knight, cosmetics, view, graphics, volume, buildHints, confirmBuilds, boardScale, motion }));
    } catch {
      // Storage unavailable (private mode) — preferences just won't persist.
    }
  },
}));
