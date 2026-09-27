import type { Terrain } from '@/engine/types';
import { FOG, SEA, TERRAIN_COLORS, TOKEN } from './palette';

/**
 * Board themes: how the island looks, per player (a local preference, like 2D/3D). A theme only
 * changes colours, light and models — never the rules — and both boards read the same palette.
 */
export type BoardThemeId = 'classic' | 'night' | 'sakura' | 'nordic';

export const BOARD_THEMES: { id: BoardThemeId; name: string; blurb: string }[] = [
  { id: 'classic', name: 'Classic', blurb: 'The sunny island' },
  { id: 'night', name: 'Night', blurb: 'Moonlight and lit windows' },
  { id: 'sakura', name: 'Sakura', blurb: 'Blossoms and pagodas' },
  { id: 'nordic', name: 'Nordic', blurb: 'Spruce and longhouses' },
];

export function isBoardTheme(v: unknown): v is BoardThemeId {
  return v === 'classic' || v === 'night' || v === 'sakura' || v === 'nordic';
}

export interface TileColors {
  top: string;
  side: string;
  /** Detail colour (2D glyphs; some 3D props). */
  accent: string;
}

export interface BoardPalette {
  terrain: Record<Terrain, TileColors>;
  fog: { top: string; side: string; cloud: string };
  sea: {
    shallow: string;
    deep: string;
    /** The lighter shelf around the island (3D). */
    shelf: string;
    /** Background and fog colour behind the 3D board. */
    sky: string;
    /** Foam ring around the island (2D). */
    foam: string;
  };
  beach: string;
  token: { rim: string; face: string; ink: string; hot: string; disc: string };
  light: {
    sky: string;
    ground: string;
    hemi: number;
    ambient: number;
    sun: string;
    sunIntensity: number;
    /** Pulls the 3D board's distance haze closer (1 = classic, lower = murkier). */
    haze?: number;
  };
  /** The flat sea behind the 2D board: centre, middle and edge of its gradient. */
  sea2d: [string, string, string];
}

const tiles = (t: Record<Terrain, [string, string, string]>): Record<Terrain, TileColors> =>
  Object.fromEntries(Object.entries(t).map(([k, [top, side, accent]]) => [k, { top, side, accent }])) as Record<Terrain, TileColors>;

/** Gold looks the same everywhere, so it is always recognisable (and always the brightest tile). */
const GOLD: [string, string, string] = [TERRAIN_COLORS.gold.top, TERRAIN_COLORS.gold.side, TERRAIN_COLORS.gold.accent];

export const PALETTES: Record<BoardThemeId, BoardPalette> = {
  classic: {
    terrain: TERRAIN_COLORS,
    fog: FOG,
    sea: { shallow: SEA.shallow, deep: SEA.deep, shelf: '#7fd0d3', sky: SEA.sky, foam: '#cdeef2' },
    beach: '#e6d3a3',
    token: { ...TOKEN, disc: '#174e5f' },
    light: { sky: '#e6f3ff', ground: '#1d3b2c', hemi: 0.9, ambient: 0.18, sun: '#fff4e0', sunIntensity: 1.9 },
    sea2d: ['#3e97ad', '#2c7d93', '#1c5f73'],
  },
  night: {
    terrain: tiles({
      forest: ['#2f6242', '#1a3a27', '#1d4a2e'],
      hills: ['#a8603f', '#643622', '#833f25'],
      pasture: ['#7aa862', '#48703d', '#d8ddd2'],
      fields: ['#c6a650', '#7f6828', '#e0c874'],
      mountains: ['#767a88', '#474a56', '#d6deeb'],
      desert: ['#b3a47a', '#766a4a', '#978659'],
      gold: GOLD,
    }),
    fog: { top: '#5f6778', side: '#3b4252', cloud: '#949db0' },
    sea: { shallow: '#173553', deep: '#081326', shelf: '#1f4460', sky: '#03060d', foam: '#4d6a8a' },
    beach: '#948a6c',
    token: { rim: '#2a3f6b', face: '#f6eddb', ink: '#1f1a14', hot: '#c2412d', disc: '#1b2a4a' },
    // Dim, nearly neutral moonlight (a strong blue tint turns white wool lilac); the tiles' own
    // lights (themes/night.tsx) do the rest.
    light: { sky: '#8f99b3', ground: '#04070d', hemi: 0.34, ambient: 0.05, sun: '#d9deec', sunIntensity: 0.7, haze: 0.8 },
    sea2d: ['#1f4468', '#152f52', '#0b1a33'],
  },
  sakura: {
    terrain: tiles({
      forest: ['#3f6b3d', '#264626', '#ee9fb8'],
      hills: ['#b5533a', '#7a3322', '#8c3a26'],
      pasture: ['#9cc27a', '#6a8f4e', '#f4f1e6'],
      fields: ['#d9b248', '#977623', '#f0d67a'],
      mountains: ['#7f8aa0', '#535c70', '#f3f5f8'],
      desert: ['#e6dcc6', '#b3a68a', '#bcae90'],
      gold: GOLD,
    }),
    fog: FOG,
    sea: { shallow: '#2e5b85', deep: '#1f3a5f', shelf: '#6f9cc0', sky: '#1a2440', foam: '#c9dcef' },
    beach: '#ece2c8',
    token: { rim: '#1f3a5f', face: '#f6eddb', ink: '#1f1a14', hot: '#c2412d', disc: '#172c49' },
    light: { sky: '#ffeef3', ground: '#2a3a2c', hemi: 0.9, ambient: 0.2, sun: '#ffe8dc', sunIntensity: 1.85 },
    sea2d: ['#3a6d9c', '#2e5b85', '#1f3a5f'],
  },
  nordic: {
    terrain: tiles({
      forest: ['#3b5c45', '#233a2a', '#1b3324'],
      hills: ['#b5532e', '#6e2f18', '#8a3a1e'],
      pasture: ['#8f6fa0', '#5a4468', '#ece6dc'],
      fields: ['#c9a94a', '#8a7026', '#e6cf7a'],
      mountains: ['#9aa5b0', '#626d78', '#eef6fa'],
      desert: ['#dde8ee', '#a3b2bb', '#6f7c86'],
      gold: GOLD,
    }),
    fog: FOG,
    sea: { shallow: '#2c5553', deep: '#152e2d', shelf: '#5d8f88', sky: '#0d1b22', foam: '#b8d4d0' },
    beach: '#b7b1a0',
    token: { rim: '#2c5553', face: '#f6eddb', ink: '#1f1a14', hot: '#c2412d', disc: '#1d3b3a' },
    light: { sky: '#e2f2ff', ground: '#1c2a26', hemi: 0.85, ambient: 0.18, sun: '#eaf1ff', sunIntensity: 1.7 },
    sea2d: ['#3a6b68', '#2c5553', '#152e2d'],
  },
};
