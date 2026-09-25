'use client';

import { create } from 'zustand';
import type { PlayerColor } from '@/engine/types';
import { isPlayerColor } from '@/shared/colors';
import { DEFAULT_KNIGHT, sanitizeKnight, type KnightCustomization } from '@/shared/knight';

/** Per-browser preferences (localStorage). Profiles override the identity defaults when signed in. */
export interface Prefs {
  name: string;
  color: PlayerColor;
  knight: KnightCustomization;
  view: '3d' | '2d';
  graphics: 'high' | 'low';
  volume: number;
  /** Show affordable build spots on the board without picking Road/Settle/City first. */
  buildHints: boolean;
}

const KEY = 'prefs.v1';

const defaults = (): Prefs => ({
  name: '',
  color: 'red',
  knight: DEFAULT_KNIGHT,
  view: '3d',
  graphics: 'high',
  volume: 0.6,
  buildHints: true,
});

function read(): Prefs {
  const base = defaults();
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      name: typeof p.name === 'string' ? p.name.slice(0, 20) : base.name,
      color: isPlayerColor(p.color) ? p.color : base.color,
      knight: sanitizeKnight(p.knight),
      view: p.view === '2d' ? '2d' : '3d',
      graphics: p.graphics === 'low' ? 'low' : 'high',
      volume: typeof p.volume === 'number' ? Math.min(1, Math.max(0, p.volume)) : base.volume,
      buildHints: typeof p.buildHints === 'boolean' ? p.buildHints : base.buildHints,
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
      const { name, color, knight, view, graphics, volume, buildHints } = { ...get(), ...patch };
      window.localStorage.setItem(KEY, JSON.stringify({ name, color, knight, view, graphics, volume, buildHints }));
    } catch {
      // Storage unavailable (private mode) — preferences just won't persist.
    }
  },
}));
