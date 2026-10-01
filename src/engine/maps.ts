import type { MapId, Mode } from './types';

export type MapRuleset = 'base' | 'seafarers';

/** Lobby grouping. Presentation only: rules come from `requires` and `modes`, never from the category. */
export type MapCategory = 'base' | 'voyagers' | 'special';

export const MAP_CATEGORIES: readonly { id: MapCategory; label: string }[] = [
  { id: 'base', label: 'Base game' },
  { id: 'voyagers', label: 'Voyagers' },
  { id: 'special', label: 'Special' },
];

export interface MapDefinition {
  id: MapId;
  category: MapCategory;
  name: string;
  blurb: string;
  maxPlayers: number;
  /** Uses the 5–6 player extension's bigger bank and development deck. */
  bigBank: boolean;
  /** Rules modules that must be enabled before this map can be selected. */
  requires: readonly MapRuleset[];
  /** Card/city rules this map has been tested with. */
  modes: readonly Mode[];
  /** Points to win, when the map sets its own (otherwise the mode's default). */
  vpToWin?: Partial<Record<Mode, number>>;
  /** Special points for a player's first settlement on each island that wasn't one of their home islands. */
  islandVP?: number;
}

const BASE_MODES: readonly Mode[] = ['classic', 'ck'];

/** Rules modules this build implements; a map needing anything else can't be picked. */
export const ENABLED_RULESETS: ReadonlySet<MapRuleset> = new Set<MapRuleset>(['base', 'seafarers']);

/**
 * Player-facing metadata and compatibility live here rather than in lobby components. Voyagers
 * (Seafarers) maps declare `requires: ['seafarers']`; the engine and room server enforce that tag
 * instead of treating it as decoration.
 */
export const MAPS: Record<MapId, MapDefinition> = {
  standard: { id: 'standard', category: 'base', name: 'Standard', blurb: 'The classic 19-hex island.', maxPlayers: 4, bigBank: false, requires: ['base'], modes: BASE_MODES },
  large: { id: 'large', category: 'base', name: 'Large (5–6)', blurb: 'A bigger island for 5–6 players, with a bigger bank and deck.', maxPlayers: 6, bigBank: true, requires: ['base'], modes: BASE_MODES },
  blackForest: { id: 'blackForest', category: 'base', name: 'Black Forest', blurb: 'Start inside a ring of forest; the rest of the island is hidden under fog until you explore it.', maxPlayers: 6, bigBank: true, requires: ['base'], modes: BASE_MODES },
  goldRush: { id: 'goldRush', category: 'base', name: 'Gold Rush', blurb: 'A ring island around seven hexes of fog, one of them a gold field on a 6 or 8. Build inward to find it.', maxPlayers: 6, bigBank: true, requires: ['base'], modes: BASE_MODES },
  vulcan: { id: 'vulcan', category: 'base', name: 'Vulcan', blurb: 'Start in the four far corners. Ore lies only around the volcano, a gold 6 in the fog-covered middle.', maxPlayers: 4, bigBank: true, requires: ['base'], modes: BASE_MODES },
  heartlake: { id: 'heartlake', category: 'base', name: 'Heartlake', blurb: 'A ring island around a lake. Three 3:1 harbors line the lake shore, reachable from the middle.', maxPlayers: 4, bigBank: false, requires: ['base'], modes: BASE_MODES },
  longIsle: { id: 'longIsle', category: 'base', name: 'Long Isle', blurb: 'A long, thin island: more coast, more harbors within reach, and tighter races for the long road.', maxPlayers: 4, bigBank: false, requires: ['base'], modes: BASE_MODES },
  fourLakes: { id: 'fourLakes', category: 'base', name: 'Four Lakes', blurb: 'A big pinwheel island with four lakes cut into it, and harbors on their shores. For up to 6.', maxPlayers: 6, bigBank: true, requires: ['base'], modes: BASE_MODES },
  crossroads: { id: 'crossroads', category: 'base', name: 'Crossroads', blurb: 'Four starting regions meet at a barren center. Claim the narrow roads between them before your rivals do.', maxPlayers: 4, bigBank: true, requires: ['base'], modes: BASE_MODES },
  farShores: {
    id: 'farShores',
    category: 'voyagers',
    name: 'Far Shores',
    blurb: 'Start on the big island, then sail for the small isles and their gold. 2 points for your first settlement on each small isle.',
    maxPlayers: 4,
    bigBank: false,
    requires: ['seafarers'],
    modes: BASE_MODES,
    vpToWin: { classic: 14, ck: 17 },
    islandVP: 2,
  },
  fourRealms: {
    id: 'fourRealms',
    category: 'voyagers',
    name: 'Four Realms',
    blurb: 'Four islands. Start on one or two of them; each other island you settle is worth 2 extra points.',
    maxPlayers: 4,
    bigBank: false,
    requires: ['seafarers'],
    modes: BASE_MODES,
    vpToWin: { classic: 13, ck: 16 },
    islandVP: 2,
  },
  veiledIsles: {
    id: 'veiledIsles',
    category: 'special',
    name: 'Veiled Isles',
    blurb: 'Voyagers meets Knights & Barbarians. Sail into the fog to uncover land, claim treasures and settle foreign isles for a point each.',
    maxPlayers: 4,
    bigBank: false,
    requires: ['seafarers'],
    modes: ['ck'],
    vpToWin: { ck: 16 },
    islandVP: 1,
  },
  citadel: {
    id: 'citadel',
    category: 'special',
    name: 'Ironbound',
    blurb: 'Six five-hex isles circle a great island: gold in the middle, six forests with lumber harbors on ponds around it, fog and desert, and a rim of ore. Sail across the sea to claim it. Up to 6 players.',
    maxPlayers: 6,
    bigBank: true,
    requires: ['seafarers'],
    modes: ['ck'],
    vpToWin: { ck: 16 },
    islandVP: 1,
  },
  zealand: {
    id: 'zealand',
    category: 'special',
    name: 'Zealand',
    blurb: 'Everyone starts on a ring of sheep around a lake, with twelve wool harbors on its shore, between its tiles. Sail for them and their treasures; a point for each isle you settle. The robber starts on a lone desert isle with three treasures of its own.',
    maxPlayers: 4,
    bigBank: true,
    requires: ['seafarers'],
    modes: BASE_MODES,
    vpToWin: { classic: 16, ck: 16 },
    islandVP: 1,
  },
};

/** Points to win on a map in a mode, before any host override. */
export const defaultVP = (id: MapId, mode: Mode, fallback: number): number => MAPS[id].vpToWin?.[mode] ?? fallback;

export const mapDefinition = (id: MapId): MapDefinition => MAPS[id];

export function mapSupports(id: MapId, mode: Mode, enabled: ReadonlySet<MapRuleset> = ENABLED_RULESETS): boolean {
  const map = MAPS[id];
  return map.modes.includes(mode) && map.requires.every((tag) => enabled.has(tag));
}

/** Maps grouped for the lobby picker, in category order, skipping empty categories. */
export function mapsByCategory(): { id: MapCategory; label: string; maps: MapDefinition[] }[] {
  return MAP_CATEGORIES.map((c) => ({ ...c, maps: Object.values(MAPS).filter((m) => m.category === c.id) })).filter(
    (g) => g.maps.length > 0,
  );
}

/**
 * What the lobby's Mode picker offers: the two base-game rule sets plus the map categories that bring
 * their own rules. Derived from `mode` and the map's category, never stored.
 */
export type GameType = 'classic' | 'ck' | 'voyagers' | 'special';

export const GAME_TYPES: readonly { id: GameType; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'ck', label: 'Knights & Barbarians' },
  { id: 'voyagers', label: 'Voyagers' },
  { id: 'special', label: 'Special' },
];

export function gameTypeOf(map: MapId, mode: Mode): GameType {
  const { category } = MAPS[map];
  return category === 'base' ? mode : category;
}

/** Maps listed under a game type, in definition order. */
export function mapsForType(type: GameType): MapDefinition[] {
  const category: MapCategory = type === 'classic' || type === 'ck' ? 'base' : type;
  return Object.values(MAPS).filter((m) => m.category === category && (category !== 'base' || m.modes.includes(type as Mode)));
}

/**
 * Settings that switch to a game type: keeps the current map when it belongs to the type, otherwise
 * picks the type's first map, and keeps the current rules when that map supports them.
 */
export function gameTypeSettings(type: GameType, current: { map: MapId; mode: Mode }): { map: MapId; mode: Mode } {
  const maps = mapsForType(type);
  const map = maps.some((m) => m.id === current.map) ? current.map : maps[0].id;
  const mode: Mode = type === 'classic' || type === 'ck' ? type : MAPS[map].modes.includes(current.mode) ? current.mode : MAPS[map].modes[0];
  return { map, mode };
}
