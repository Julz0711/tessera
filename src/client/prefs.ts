'use client';

import { create } from 'zustand';
import type { PlayerColor } from '@/engine/types';
import { isPickableColor } from '@/shared/colors';
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
  /** Themed weather over the 3D board (rain, petals, snow…). */
  weather: boolean;
  /** Trade offers you don't have the cards for decline themselves after a few seconds (off: they wait for you). */
  autoDeclineTrades: boolean;
  /** Background music in games, 0..1 on top of the master volume (0: off, the default). */
  musicVolume: number;
  /** Zoom in / out / reset buttons for the 2D board (the wheel, pinch and drag work without them). */
  zoomButtons: boolean;
  /** The barbarians' progress on the 2D board (Knights & Barbarians): the tall track beside the board, or the small panel in the HUD. */
  barbarianTrack: 'large' | 'small';
  /** On a phone held upright, the 2D board turns a wide map a quarter turn to fill the tall screen. */
  turnBoard: boolean;
  /** Send my mouse pointer (and clicks) to the other players (wide screens with a mouse only). */
  shareCursor: boolean;
  /** Show the other players' mouse pointers over the board (wide screens with a mouse only). */
  seeCursors: boolean;
  /** The amber mouse cursor (beta; mouse screens only). */
  customCursor: boolean;
  /** The in-game layout on wide screens: the classic dock, or the experimental build column above the hand (beta). */
  uiVariant: 'legacy' | 'experimental';
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
  weather: true,
  autoDeclineTrades: true,
  musicVolume: 0,
  zoomButtons: false,
  barbarianTrack: 'large',
  turnBoard: true,
  shareCursor: false,
  seeCursors: true,
  customCursor: false,
  uiVariant: 'legacy',
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

/** Validates untrusted prefs (localStorage or the profile) field by field; anything missing or invalid falls back to the defaults. */
export function sanitizePrefs(raw: unknown): Prefs {
  const base = defaults();
  if (!raw || typeof raw !== 'object') return base;
  const p = raw as Partial<Prefs> & { uiScale?: unknown; shareCursors?: unknown };
  // `uiScale` was the name of this setting when it scaled the whole interface.
  const boardScale = p.boardScale ?? p.uiScale;
  return {
    name: typeof p.name === 'string' ? p.name.slice(0, 20) : base.name,
    color: isPickableColor(p.color) ? p.color : base.color,
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
    weather: typeof p.weather === 'boolean' ? p.weather : base.weather,
    autoDeclineTrades: typeof p.autoDeclineTrades === 'boolean' ? p.autoDeclineTrades : base.autoDeclineTrades,
    musicVolume: typeof p.musicVolume === 'number' && Number.isFinite(p.musicVolume) ? clamp01(p.musicVolume) : base.musicVolume,
    zoomButtons: typeof p.zoomButtons === 'boolean' ? p.zoomButtons : base.zoomButtons,
    barbarianTrack: p.barbarianTrack === 'small' ? 'small' : 'large',
    turnBoard: typeof p.turnBoard === 'boolean' ? p.turnBoard : base.turnBoard,
    // `shareCursors` was the old one-switch "share and see": it carries over as sharing.
    shareCursor: typeof p.shareCursor === 'boolean' ? p.shareCursor : typeof p.shareCursors === 'boolean' ? p.shareCursors : base.shareCursor,
    seeCursors: typeof p.seeCursors === 'boolean' ? p.seeCursors : base.seeCursors,
    customCursor: typeof p.customCursor === 'boolean' ? p.customCursor : base.customCursor,
    uiVariant: p.uiVariant === 'experimental' ? 'experimental' : 'legacy',
  };
}

export function read(): Prefs {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
    return raw ? sanitizePrefs(JSON.parse(raw)) : defaults();
  } catch {
    return defaults();
  }
}

/** The settings that follow a signed-in player to their profile. Name, colour, knight and cosmetics already live there. */
export const SYNCED_FIELDS = [
  'view', 'graphics', 'volume', 'buildHints', 'confirmBuilds', 'boardScale', 'motion', 'boardTheme', 'hudScale', 'hudLayout', 'sfxVolume', 'weather',
  'autoDeclineTrades', 'musicVolume', 'zoomButtons', 'barbarianTrack', 'turnBoard',
] as const satisfies readonly (keyof Prefs)[];

interface PrefsStore extends Prefs {
  loaded: boolean;
  load(): void;
  set(patch: Partial<Prefs>): void;
  /** Adopts the settings saved on the profile (only the ones it has) over this browser's. */
  applyRemote(remote: Record<string, unknown>): void;
}

function persistLocal(all: Prefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(FIELDS.map((f) => [f, all[f]]))));
  } catch {
    // Storage unavailable (private mode) — preferences just won't persist.
  }
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
    persistLocal(get());
  },
  applyRemote(remote) {
    const clean = sanitizePrefs({ ...get(), ...remote });
    const patch: Partial<Prefs> = {};
    for (const f of SYNCED_FIELDS) if (f in remote) Object.assign(patch, { [f]: clean[f] });
    set(patch);
    persistLocal(get());
  },
}));
