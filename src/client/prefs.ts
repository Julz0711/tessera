'use client';

import { create } from 'zustand';
import type { PlayerColor } from '@/engine/types';
import { isPlayerColor } from '@/shared/colors';
import { isBoardTheme, type BoardThemeId } from './themes';
import { DEFAULT_COSMETICS, sanitizeCosmetics, type Cosmetics } from '@/shared/cosmetics';
import { DEFAULT_KNIGHT, sanitizeKnight, type KnightCustomization } from '@/shared/knight';
import { DEFAULT_HUD_LAYOUT, sanitizeHudLayout, type HudLayout, type HudScale } from './hud';
import type { Sfx } from './sound';

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
  /** Ask before placing a piece or moving the robber (a popup at the spot), so a stray click can't do either. */
  confirmBuilds: boolean;
  /** Size of the pieces, number tokens and harbors on the board (the rest of the UI keeps its size). */
  boardScale: BoardScale;
  /** Flying cards and other movement: follow the system's reduce-motion setting, or always full / reduced. */
  motion: Motion;
  /** How the island looks (both boards). Only this player's screen changes. */
  boardTheme: BoardThemeId;
  /** Size of the in-game HUD (panels, top bar, dock). */
  hudScale: HudScale;
  /** Where each movable HUD panel sits on wide screens. */
  hudLayout: HudLayout;
  /** Per-sound volume, 0..1 on top of the master volume; a missing sound plays at full. */
  sfxVolume: Partial<Record<Sfx, number>>;
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
  boardTheme: 'classic',
  hudScale: 'medium',
  hudLayout: DEFAULT_HUD_LAYOUT,
  sfxVolume: {},
});

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function sanitizeSfxVolume(raw: unknown): Partial<Record<Sfx, number>> {
  const out: Partial<Record<Sfx, number>> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && Number.isFinite(v)) out[k as Sfx] = clamp01(v);
  return out;
}

/** The persisted fields (everything but the store's own state and methods). */
const FIELDS = Object.keys(defaults()) as (keyof Prefs)[];

export function read(): Prefs {
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
      boardTheme: isBoardTheme(p.boardTheme) ? p.boardTheme : base.boardTheme,
      hudScale: p.hudScale === 'small' || p.hudScale === 'large' ? p.hudScale : base.hudScale,
      hudLayout: sanitizeHudLayout(p.hudLayout),
      sfxVolume: sanitizeSfxVolume(p.sfxVolume),
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
      const all = get();
      window.localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(FIELDS.map((f) => [f, all[f]]))));
    } catch {
      // Storage unavailable (private mode) — preferences just won't persist.
    }
  },
}));
