import type { LandTerrain, Terrain } from '@/engine/types';
import { FOG, SEA, TERRAIN_COLORS, TOKEN } from './palette';

/**
 * Board themes: how the island looks, per player (a local preference, like 2D/3D). A theme only
 * changes colours, light and models — never the rules — and both boards read the same palette.
 */
export type BoardThemeId = 'classic' | 'night' | 'sakura' | 'nordic' | 'frontier' | 'nile' | 'skyport' | 'cyberpunk' | 'orbital' | 'origami';

export const BOARD_THEMES: { id: BoardThemeId; name: string; blurb: string }[] = [
  { id: 'classic', name: 'Classic', blurb: 'The sunny island' },
  { id: 'night', name: 'Night', blurb: 'Moonlight and lit windows' },
  { id: 'sakura', name: 'Sakura', blurb: 'Blossoms and pagodas' },
  { id: 'nordic', name: 'Nordic', blurb: 'Spruce and longhouses' },
  { id: 'frontier', name: 'Frontier', blurb: 'Railroads, ranches and outlaws' },
  { id: 'nile', name: 'Nile', blurb: 'Pyramids, palms and the river' },
  { id: 'skyport', name: 'Skyport', blurb: 'Airships over a sea of clouds' },
  { id: 'cyberpunk', name: 'Cyberpunk', blurb: 'Neon and rain in the megacity' },
  { id: 'orbital', name: 'Orbital', blurb: 'A colony adrift in space' },
  { id: 'origami', name: 'Origami', blurb: 'An island folded from paper' },
];

export function isBoardTheme(v: unknown): v is BoardThemeId {
  return BOARD_THEMES.some((t) => t.id === v);
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
    /** Where the sun shines from (classic: high up, over the camera's right shoulder). */
    sunPosition?: [number, number, number];
  };
  /** The flat sea behind the 2D board: centre, middle and edge of its gradient. */
  sea2d: [string, string, string];
  /** What lies over that gradient (a CSS background image); faint wave lines when unset. */
  sea2dPattern?: string;
  /** Harbor piers on both boards: the deck, the planks to the shore and the posts. Wood when unset. */
  pier?: { deck: string; plank: string; post: string };
  /**
   * Dims the 2D board and lights it up again from every tile and town (Night, Cyberpunk). The
   * tiles take the lights in turn: a lamp, and the glow around it (inner, middle, outer colour).
   * With `ownerGlow` towns glow in their owner's colour rather than the first light's.
   */
  gloom2d?: {
    shade: string;
    opacity: number;
    lights: { lamp: string; glow: [string, string, string] }[];
    lampRim: string;
    ownerGlow?: boolean;
  };
  /** The theme picker's swatch: its background and three tiles (the deep sea, and the forest, fields and pasture tops, when unset). */
  swatch?: { bg?: string; tiles?: [string, string, string] };
}

/** An SVG tile as a CSS background image, for `sea2dPattern`. */
const svgPattern = (w: number, h: number, body: string): string =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${body}</svg>`)}")`;

/** Skyport: loose banks of cloud drifting over the cloud sea. */
const CLOUD_BANKS = svgPattern(
  320,
  220,
  "<g fill='#ffffff' fill-opacity='0.4'><ellipse cx='70' cy='60' rx='46' ry='12'/><circle cx='50' cy='52' r='14'/><circle cx='74' cy='44' r='19'/><circle cx='98' cy='54' r='12'/></g>" +
    "<g fill='#ffffff' fill-opacity='0.3'><ellipse cx='230' cy='160' rx='60' ry='14'/><circle cx='204' cy='150' r='17'/><circle cx='236' cy='140' r='23'/><circle cx='266' cy='152' r='14'/></g>" +
    "<g fill='#ffffff' fill-opacity='0.22'><ellipse cx='250' cy='40' rx='30' ry='8'/><circle cx='240' cy='35' r='10'/><circle cx='258' cy='32' r='11'/></g>",
);

/** Cyberpunk: rain over black water, and neon signs mirrored in it. */
const NEON_RAIN = svgPattern(
  140,
  140,
  "<path d='M10 6l-5 14M48 30l-5 14M92 12l-5 14M126 50l-5 14M30 84l-5 14M76 70l-5 14M112 104l-5 14M58 118l-5 14M18 124l-5 14M134 2l-5 14' stroke='#b4c0ff' stroke-opacity='0.12' stroke-width='1.2'/>" +
    "<g stroke-linecap='round' stroke-width='3'><path d='M20 46h26' stroke='#ff3d9a' stroke-opacity='0.35'/><path d='M84 96h34' stroke='#3de8ff' stroke-opacity='0.3'/><path d='M100 28h16' stroke='#ffe066' stroke-opacity='0.25'/><path d='M36 128h22' stroke='#3de8ff' stroke-opacity='0.25'/></g>",
);

/** Orbital: a field of stars. */
const STAR_FIELD = svgPattern(
  180,
  180,
  (
    [
      [14, 22, 1.3, 0.9], [52, 8, 0.8, 0.6], [88, 30, 1.1, 0.8], [140, 16, 0.7, 0.5], [166, 58, 1.4, 0.9], [30, 70, 0.7, 0.55],
      [72, 92, 1.5, 0.95], [118, 70, 0.9, 0.6], [150, 110, 0.8, 0.5], [10, 128, 1.1, 0.75], [48, 150, 0.7, 0.5], [96, 136, 1.2, 0.85],
      [132, 168, 0.9, 0.6], [170, 150, 1.2, 0.8], [60, 118, 0.6, 0.4], [112, 104, 0.6, 0.45], [24, 172, 0.8, 0.55], [160, 90, 0.6, 0.4],
    ] as const
  )
    .map(([x, y, r, o]) => `<circle cx='${x}' cy='${y}' r='${r}' fill='#ffffff' fill-opacity='${o}'/>`)
    .join(''),
);

/** Origami: a sheet of blue paper folded into sharp little waves. */
const PAPER_PLEATS = svgPattern(
  60,
  40,
  "<path d='M0 20L15 8L30 20L45 8L60 20V40H0Z' fill='#ffffff' fill-opacity='0.07'/><path d='M0 20L15 8L30 20L45 8L60 20' stroke='#ffffff' stroke-opacity='0.35' stroke-width='1.5' fill='none'/>",
);

const tiles = (t: Record<LandTerrain, [string, string, string]>): Record<Terrain, TileColors> =>
  Object.fromEntries(
    Object.entries({ ...t, sea: [SEA.shallow, SEA.deep, SEA.foam] }).map(([k, [top, side, accent]]) => [k, { top, side, accent }]),
  ) as Record<Terrain, TileColors>;

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
      forest: ['#3a7550', '#1f4430', '#1d4a2e'],
      hills: ['#b86a45', '#6e3c26', '#833f25'],
      pasture: ['#8cb86c', '#527d44', '#d8ddd2'],
      fields: ['#d4b45a', '#8a722c', '#e0c874'],
      mountains: ['#878b9a', '#51545f', '#d6deeb'],
      desert: ['#c4b488', '#7f7250', '#978659'],
      gold: GOLD,
    }),
    fog: { top: '#5f6778', side: '#3b4252', cloud: '#949db0' },
    sea: { shallow: '#173553', deep: '#081326', shelf: '#1f4460', sky: '#03060d', foam: '#4d6a8a' },
    beach: '#948a6c',
    token: { rim: '#2a3f6b', face: '#f6eddb', ink: '#1f1a14', hot: '#c2412d', disc: '#1b2a4a' },
    // Bright, nearly neutral moonlight (a strong blue tint turns white wool lilac): the night lives
    // in the sky, the sea and the tiles' own lights (themes/night.tsx), while the board stays bright
    // enough to tell every terrain and every player's pieces apart.
    light: { sky: '#a9b3cc', ground: '#0d1220', hemi: 0.85, ambient: 0.2, sun: '#e2e6f2', sunIntensity: 1.5, haze: 0.8 },
    sea2d: ['#1f4468', '#152f52', '#0b1a33'],
    gloom2d: { shade: '#040a1a', opacity: 0.18, lights: [{ lamp: '#ffc15a', glow: ['#ffbe6e', '#ffa050', '#ff8c3c'] }], lampRim: '#2f261c' },
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
    // The forest reads as its blossoms, not its green ground.
    swatch: { tiles: ['#ee9fb8', '#d9b248', '#9cc27a'] },
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
  frontier: {
    terrain: tiles({
      forest: ['#4a7040', '#2c4526', '#2a4a2a'],
      hills: ['#c26a3d', '#7d3f20', '#e0a070'],
      pasture: ['#a9bf6a', '#71833f', '#f4f1e6'],
      fields: ['#e3b64c', '#9a7a2a', '#f5d67a'],
      mountains: ['#8e8a86', '#5d5955', '#3a2f28'],
      // Pale sandstone, so the desert stays apart from the adobe hills and the gold.
      desert: ['#dfb48c', '#a0724e', '#a8552f'],
      gold: GOLD,
    }),
    fog: { top: '#e3d6c2', side: '#a8977e', cloud: '#f3ebdd' },
    sea: { shallow: '#4b8aa0', deep: '#24566a', shelf: '#86b8c0', sky: '#2b1d18', foam: '#d8ecea' },
    beach: '#e0c9a0',
    token: { rim: '#6b3a1f', face: '#f6eddb', ink: '#1f1a14', hot: '#c2412d', disc: '#4a2814' },
    // Golden hour: a warm, low sun and long shadows.
    light: { sky: '#ffe7c4', ground: '#3a2a1a', hemi: 0.85, ambient: 0.18, sun: '#ffd49a', sunIntensity: 1.95, sunPosition: [8, 7, 4] },
    sea2d: ['#4f95aa', '#3a7a90', '#24566a'],
    swatch: { tiles: ['#4a7040', '#e3b64c', '#c26a3d'] },
  },
  nile: {
    terrain: tiles({
      forest: ['#4f7d3c', '#2f4d24', '#6a9a44'],
      hills: ['#b86a40', '#74401f', '#d89a6a'],
      pasture: ['#9fbe6c', '#6a8a44', '#f4f1e6'],
      // The accent is the blue of the irrigation canals between the rows.
      fields: ['#e0bd52', '#9a7d28', '#3fa3b8'],
      mountains: ['#9b958c', '#66615a', '#dcd6cb'],
      desert: ['#efdcaa', '#b89f6e', '#d4a84a'],
      gold: GOLD,
    }),
    fog: { top: '#eee3c8', side: '#bfae88', cloud: '#fbf5e6' },
    sea: { shallow: '#2aa0a8', deep: '#0f4a6e', shelf: '#7ccfc8', sky: '#0e2a3a', foam: '#d9f2ec' },
    beach: '#f1e2bb',
    token: { rim: '#1d4f8a', face: '#f3e3bf', ink: '#1f1a14', hot: '#c2412d', disc: '#173d6b' },
    light: { sky: '#fff5e0', ground: '#4a3a22', hemi: 0.95, ambient: 0.22, sun: '#fff1d6', sunIntensity: 2 },
    sea2d: ['#35b0b5', '#1f8a98', '#0f4a6e'],
    swatch: { bg: '#1f8a98', tiles: ['#4f7d3c', '#e0bd52', '#efdcaa'] },
  },
  skyport: {
    terrain: tiles({
      forest: ['#3f7045', '#26462b', '#2c5234'],
      hills: ['#b35a36', '#6e331c', '#7a3a22'],
      pasture: ['#9dc070', '#688a46', '#f4f1e6'],
      fields: ['#deb652', '#957528', '#b08d57'],
      mountains: ['#8a8680', '#58544f', '#c9a25a'],
      desert: ['#d9c9a8', '#9d8c6c', '#b08d57'],
      gold: GOLD,
    }),
    // Undiscovered tiles hide in cloud banks.
    fog: { top: '#f1ece8', side: '#c9bfc4', cloud: '#ffffff' },
    // The "sea" is a floor of cloud under a sunrise sky (themes/skyport.tsx).
    sea: { shallow: '#f8f0ec', deep: '#cfa6b8', shelf: '#fff4ea', sky: '#eec3a6', foam: '#ffffff' },
    // The island's rim is a rocky cliff edge.
    beach: '#8b7866',
    token: { rim: '#7a5a2a', face: '#f6eddb', ink: '#1f1a14', hot: '#c2412d', disc: '#5a3f1c' },
    light: { sky: '#fff0e0', ground: '#8a7a8a', hemi: 0.95, ambient: 0.22, sun: '#ffe4c4', sunIntensity: 1.9 },
    sea2d: ['#fbe9dc', '#efcfc4', '#cfa6b8'],
    sea2dPattern: CLOUD_BANKS,
    pier: { deck: '#9c6f42', plank: '#8a6139', post: '#b08d57' },
    swatch: { bg: '#cfa6b8', tiles: ['#3f7045', '#deb652', '#9dc070'] },
  },
  cyberpunk: {
    terrain: tiles({
      forest: ['#357058', '#1b3a30', '#3dffb0'],
      hills: ['#ad5638', '#58291b', '#ff8a5c'],
      pasture: ['#6eaa66', '#36633a', '#e8eef2'],
      fields: ['#c9a545', '#68521d', '#ffe066'],
      mountains: ['#727788', '#363a4a', '#3de8ff'],
      desert: ['#9a9284', '#57524a', '#ff3d9a'],
      gold: GOLD,
    }),
    // Undiscovered tiles lie under smog.
    fog: { top: '#6a5f78', side: '#3e3648', cloud: '#9a8fb0' },
    sea: { shallow: '#141a33', deep: '#06070f', shelf: '#1c2140', sky: '#07050f', foam: '#c02a8a' },
    // A dark concrete seawall.
    beach: '#2a2833',
    token: { rim: '#ff3d9a', face: '#f2f0f7', ink: '#141220', hot: '#e03050', disc: '#1a0f24' },
    // City night under a bright smog glow: the neon signs and windows (themes/cyberpunk.tsx) set the
    // mood, but the board stays lit enough to tell every terrain and player's pieces apart.
    light: { sky: '#a89cff', ground: '#0c0816', hemi: 0.85, ambient: 0.2, sun: '#d4daff', sunIntensity: 1.5, haze: 0.8 },
    sea2d: ['#1d1648', '#0e0b27', '#05050f'],
    sea2dPattern: NEON_RAIN,
    pier: { deck: '#3a3f4c', plank: '#2a2d38', post: '#5a606e' },
    gloom2d: {
      shade: '#05030f',
      opacity: 0.12,
      lights: [
        { lamp: '#3de8ff', glow: ['#8af4ff', '#3de8ff', '#12b8d8'] },
        { lamp: '#ff3d9a', glow: ['#ff8fcf', '#ff3d9a', '#d81f78'] },
      ],
      lampRim: '#140a24',
      ownerGlow: true,
    },
    swatch: { bg: '#0e0b27', tiles: ['#3dffb0', '#ffe066', '#ff3d9a'] },
  },
  orbital: {
    terrain: tiles({
      forest: ['#38795a', '#1f4a38', '#5ce1c6'],
      hills: ['#b8613f', '#6e3522', '#e08a5e'],
      pasture: ['#8fc46a', '#5a8a44', '#f4f1e6'],
      fields: ['#d9b44e', '#8f7427', '#ffe28a'],
      mountains: ['#7c8194', '#4a4f60', '#7fe3ff'],
      // Pale lunar dust, far lighter than the ore rock.
      desert: ['#c8c4d4', '#8b879a', '#e4e1ec'],
      gold: GOLD,
    }),
    // Undiscovered tiles drift in nebula.
    fog: { top: '#6a5a8f', side: '#453a66', cloud: '#a998d8' },
    // Space: stars and a ringed planet instead of water (themes/orbital.tsx).
    sea: { shallow: '#1a1640', deep: '#07061a', shelf: '#2a2560', sky: '#04030d', foam: '#3a8fbf' },
    // The asteroid's dark rocky rim.
    beach: '#3b3f52',
    token: { rim: '#26305e', face: '#eef3ff', ink: '#141a2e', hot: '#d9483b', disc: '#1c2350' },
    // Hard, white sunlight and no air to haze the distance.
    light: { sky: '#cfd8ff', ground: '#0d0d1f', hemi: 0.72, ambient: 0.16, sun: '#f4f6ff', sunIntensity: 1.8, haze: 2 },
    sea2d: ['#241d5c', '#140f3a', '#06051a'],
    sea2dPattern: STAR_FIELD,
    pier: { deck: '#5a6278', plank: '#454b5e', post: '#8a93a8' },
    swatch: { bg: '#07061a', tiles: ['#2e6b4f', '#d9b44e', '#8fc46a'] },
  },
  origami: {
    terrain: tiles({
      forest: ['#5a9a6a', '#3e7550', '#2f6b48'],
      hills: ['#d9825a', '#a85d3a', '#c26a44'],
      pasture: ['#b5d98a', '#88b060', '#fbf8f0'],
      fields: ['#f0cf6a', '#c9a640', '#f7e2a0'],
      mountains: ['#a3a9b8', '#7b8192', '#fbfcff'],
      desert: ['#f3e6c8', '#cdbb95', '#e0cfa6'],
      gold: GOLD,
    }),
    // Undiscovered tiles are wrapped in tissue paper.
    fog: { top: '#eef0f4', side: '#c8ccd6', cloud: '#ffffff' },
    // A sheet of blue paper folded into waves, on a pale craft table (themes/origami.tsx).
    sea: { shallow: '#8cc4e0', deep: '#5b9ac0', shelf: '#b8def0', sky: '#d6e4ec', foam: '#ffffff' },
    beach: '#f7f1e3',
    token: { rim: '#5b9ac0', face: '#ffffff', ink: '#2a2f3a', hot: '#e0503a', disc: '#3f7aa0' },
    // Soft, even light, like a model on a lightbox: shading shows the folds without hard shadows.
    light: { sky: '#ffffff', ground: '#c8d4dc', hemi: 1.05, ambient: 0.28, sun: '#ffffff', sunIntensity: 1.35 },
    sea2d: ['#a8d4ea', '#8cc4e0', '#5b9ac0'],
    sea2dPattern: PAPER_PLEATS,
    pier: { deck: '#f4efe4', plank: '#e4dccb', post: '#c9bfa8' },
    swatch: { bg: '#8cc4e0', tiles: ['#5a9a6a', '#f0cf6a', '#b5d98a'] },
  },
};
