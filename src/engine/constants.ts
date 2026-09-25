import type {
  Commodity,
  DevCardType,
  EventFace,
  HarborKind,
  KnightLevel,
  MapId,
  Mode,
  PartialHand,
  ProgressCardType,
  Resource,
  Terrain,
  Track,
} from './types';

export const COSTS = {
  road: { brick: 1, lumber: 1 },
  settlement: { brick: 1, lumber: 1, wool: 1, grain: 1 },
  city: { grain: 2, ore: 3 },
  devCard: { wool: 1, grain: 1, ore: 1 },
  knight: { wool: 1, ore: 1 },
  promote: { wool: 1, ore: 1 },
  activate: { grain: 1 },
  wall: { brick: 2 },
  medicineCity: { grain: 1, ore: 2 },
} as const satisfies Record<string, PartialHand>;

export const PIECE_LIMITS = { road: 15, settlement: 5, city: 4, wall: 3 } as const;
/** C&K: each player owns two knights of each level. */
export const KNIGHTS_PER_LEVEL: Record<KnightLevel, number> = { 1: 2, 2: 2, 3: 2 };

export const TERRAIN_COUNTS: Record<Terrain, number> = {
  forest: 4,
  hills: 3,
  pasture: 4,
  fields: 4,
  mountains: 3,
  desert: 1,
  gold: 0,
};

export const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

export const HARBOR_KINDS: HarborKind[] = ['any', 'any', 'any', 'any', 'brick', 'lumber', 'wool', 'grain', 'ore'];
/** Harbor positions as indices into the clockwise-ordered coast edges (30 on the standard board). */
export const HARBOR_COAST_SLOTS = [0, 3, 6, 10, 13, 16, 20, 23, 26];

export const TERRAIN_RESOURCE: Record<Terrain, Resource | null> = {
  forest: 'lumber',
  hills: 'brick',
  pasture: 'wool',
  fields: 'grain',
  mountains: 'ore',
  desert: null,
  gold: null,
};

export const TERRAIN_COMMODITY: Partial<Record<Terrain, Commodity>> = {
  forest: 'paper',
  pasture: 'cloth',
  mountains: 'coin',
};

/** The 5–6 player extension: 30 hexes, two deserts, 28 numbers, 11 harbors, a bigger bank and deck. */
export const LARGE_TERRAIN_COUNTS: Record<Terrain, number> = { forest: 6, hills: 5, pasture: 6, fields: 6, mountains: 5, desert: 2, gold: 0 };

/**
 * Black Forest: a desert island in a lake, ringed by 24 visible forests; 30 tiles beyond lie under
 * fog: the other resources plus two gold fields, whose number is always a 6 or an 8.
 */
export const BLACK_FOREST_TOKENS = [2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12];
export const BLACK_FOREST_FOG: Partial<Record<Terrain, number>> = { hills: 7, pasture: 7, fields: 7, mountains: 7, gold: 2 };
export const BLACK_FOREST_FOG_TOKENS = [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12];
export const LARGE_NUMBER_TOKENS = [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12];
export const LARGE_HARBOR_KINDS: HarborKind[] = ['any', 'any', 'any', 'any', 'any', 'brick', 'lumber', 'wool', 'wool', 'grain', 'ore'];
export const LARGE_BANK_PER_RESOURCE = 24;
export const LARGE_BANK_PER_COMMODITY = 16;
export const LARGE_DEV_DECK: Record<DevCardType, number> = { knight: 20, victoryPoint: 5, roadBuilding: 3, yearOfPlenty: 3, monopoly: 3 };

/** Seats each map has room for. */
export const MAX_PLAYERS: Record<MapId, number> = { standard: 4, large: 6, blackForest: 6, goldRush: 4, heartlake: 4, longIsle: 4 };
/** Maps that use the 5–6 player extension's bigger bank and development deck. */
export const BIG_MAPS: ReadonlySet<MapId> = new Set<MapId>(['large', 'blackForest']);

/** Gold Rush: the standard island with two gold fields (never on a 6 or 8) in place of a field and a pasture. */
export const GOLD_RUSH_TERRAIN_COUNTS: Record<Terrain, number> = { forest: 4, hills: 3, pasture: 3, fields: 3, mountains: 3, desert: 1, gold: 2 };

/** Heartlake: 18 hexes around a lake; one 12 fewer than the standard numbers. */
export const HEARTLAKE_TERRAIN_COUNTS: Record<Terrain, number> = { forest: 4, hills: 3, pasture: 4, fields: 3, mountains: 3, desert: 1, gold: 0 };
export const HEARTLAKE_NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11];
/** Six harbors on the sea coast; three more 3:1 harbors line the lake shore. */
export const HEARTLAKE_COAST_HARBORS: HarborKind[] = ['any', 'brick', 'lumber', 'wool', 'grain', 'ore'];
export const HEARTLAKE_LAKE_HARBORS: HarborKind[] = ['any', 'any', 'any'];

export const BANK_PER_RESOURCE = 19;
export const BANK_PER_COMMODITY = 12;

export const DEV_DECK: Record<DevCardType, number> = {
  knight: 14,
  victoryPoint: 5,
  roadBuilding: 2,
  yearOfPlenty: 2,
  monopoly: 2,
};

export const TRACK_COMMODITY: Record<Track, Commodity> = { trade: 'cloth', politics: 'coin', science: 'paper' };

export const PROGRESS_DECKS: Record<Track, [ProgressCardType, number][]> = {
  science: [
    ['alchemist', 2],
    ['crane', 2],
    ['engineer', 1],
    ['inventor', 2],
    ['irrigation', 2],
    ['medicine', 2],
    ['mining', 2],
    ['printer', 1],
    ['roadBuilding', 2],
    ['smith', 2],
  ],
  politics: [
    ['bishop', 2],
    ['constitution', 1],
    ['deserter', 2],
    ['diplomat', 2],
    ['intrigue', 2],
    ['saboteur', 2],
    ['spy', 3],
    ['warlord', 2],
    ['wedding', 2],
  ],
  trade: [
    ['commercialHarbor', 2],
    ['masterMerchant', 2],
    ['merchant', 6],
    ['merchantFleet', 2],
    ['resourceMonopoly', 4],
    ['tradeMonopoly', 2],
  ],
};

/** Progress cards that are worth 1 VP and are revealed immediately. */
export const VP_PROGRESS: ProgressCardType[] = ['printer', 'constitution'];

export const MAX_PROGRESS_IN_HAND = 4;
export const MAX_IMPROVEMENT = 5;
/** Improvement level from which the level-3 ability (and metropolis race at 4) applies. */
export const ABILITY_LEVEL = 3;
export const METROPOLIS_LEVEL = 4;

export const BARBARIAN_DISTANCE = 7;
export const EVENT_DIE: EventFace[] = ['ship', 'ship', 'ship', 'trade', 'politics', 'science'];

/** Probability "pips" of each number token (ways to roll it out of 36). */
export const PIPS: Record<number, number> = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

export const DEFAULT_VP: Record<Mode, number> = { classic: 10, ck: 13 };
export const LONGEST_ROAD_MIN = 5;
export const LARGEST_ARMY_MIN = 3;
export const MAX_OPEN_TRADES = 6;
export const LOG_LIMIT = 250;
