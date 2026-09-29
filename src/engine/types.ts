/**
 * Core types of the rules engine. The engine is pure and deterministic: all randomness comes
 * from the seeded `rng` field, and no function performs I/O or reads the clock.
 */

// ── Cards ───────────────────────────────────────────────────────────────────
export type Resource = 'brick' | 'lumber' | 'wool' | 'grain' | 'ore';
export type Commodity = 'paper' | 'cloth' | 'coin';
export type Card = Resource | Commodity;
export type Hand = Record<Card, number>;
export type PartialHand = Partial<Record<Card, number>>;

export const RESOURCES: readonly Resource[] = ['brick', 'lumber', 'wool', 'grain', 'ore'];
export const COMMODITIES: readonly Commodity[] = ['cloth', 'coin', 'paper'];
export const CARDS: readonly Card[] = [...RESOURCES, ...COMMODITIES];

export function isResource(card: unknown): card is Resource {
  return typeof card === 'string' && (RESOURCES as readonly string[]).includes(card);
}
export function isCommodity(card: unknown): card is Commodity {
  return typeof card === 'string' && (COMMODITIES as readonly string[]).includes(card);
}
export function isCard(card: unknown): card is Card {
  return typeof card === 'string' && (CARDS as readonly string[]).includes(card);
}

// ── Board ───────────────────────────────────────────────────────────────────
/** `gold` (Black Forest) pays out a resource of the owner's choice. */
export type Terrain = 'forest' | 'hills' | 'pasture' | 'fields' | 'mountains' | 'desert' | 'gold' | 'sea';
/** Every terrain that carries a number token or resource; `sea` is open water (Voyagers). */
export type LandTerrain = Exclude<Terrain, 'sea'>;
export type HarborKind = 'any' | Resource;

export interface Hex {
  id: number;
  q: number;
  r: number;
  terrain: Terrain;
  /** Number token (2–12) or null for the desert. */
  token: number | null;
  /** Still under fog (Black Forest, Gold Rush, Vulcan). Views show fogged hexes as a blank desert until revealed. */
  fog?: boolean;
  /** Vulcan: part of a starting area. When a map has any, starting settlements must touch only these. */
  start?: boolean;
}

export interface Harbor {
  /** Coastal edge the harbor sits on; both of its vertices get the harbor. */
  edge: number;
  kind: HarborKind;
}

/** Veiled Isles treasure rewards. `devCard` is a progress card of a chosen track in C&K. */
export type TreasureKind = 'resource' | 'roadBuilding' | 'bundle' | 'devCard';
export const TREASURE_KINDS: readonly TreasureKind[] = ['resource', 'roadBuilding', 'bundle', 'devCard'];

export interface Treasure {
  /** Corner a ship must reach to collect it. */
  vertex: number;
  /** Hidden (null) in player views until collected. */
  kind: TreasureKind | null;
  /** Seat that collected it. */
  takenBy?: number;
}

export interface Board {
  hexes: Hex[];
  harbors: Harbor[];
  /** Voyagers: the sea hex the pirate starts on. */
  pirateStart?: number;
  /** Veiled Isles: treasure spots. */
  treasures?: Treasure[];
}

// ── Modes & settings ────────────────────────────────────────────────────────
export type Mode = 'classic' | 'ck';
/**
 * Board layout: the standard island, the larger 5–6 player island, the fog maps (Black Forest,
 * Gold Rush, Vulcan) or one of the land-only variants (Heartlake, Long Isle, Four Lakes).
 */
export type MapId =
  | 'standard'
  | 'large'
  | 'blackForest'
  | 'goldRush'
  | 'vulcan'
  | 'heartlake'
  | 'longIsle'
  | 'fourLakes'
  | 'farShores'
  | 'fourRealms'
  | 'veiledIsles';
export const MAP_IDS: readonly MapId[] = [
  'standard',
  'large',
  'blackForest',
  'goldRush',
  'vulcan',
  'heartlake',
  'longIsle',
  'fourLakes',
  'farShores',
  'fourRealms',
  'veiledIsles',
];
export const isMapId = (v: unknown): v is MapId => typeof v === 'string' && (MAP_IDS as readonly string[]).includes(v);
export type Track = 'trade' | 'politics' | 'science';
export const TRACKS: readonly Track[] = ['trade', 'politics', 'science'];

export interface GameSettings {
  mode: Mode;
  map: MapId;
  vpToWin: number;
  /** Players holding more than this many cards discard half on a 7 (C&K adds 2 per wall). */
  discardLimit: number;
  /** Robber may not target hexes touching opponents with ≤ 2 public VP. */
  friendlyRobber: boolean;
  /** Black Forest: whether two gold fields hide in the fog (default on; games from before lack it). */
  gold?: boolean;
  /** Random dice, or balanced ones drawn from a bag (see dice.ts). Games from before lack it (= random). */
  dice?: DiceMode;
}

export type DiceMode = 'random' | 'balanced';
export const isDiceMode = (v: unknown): v is DiceMode => v === 'random' || v === 'balanced';

/** Balanced dice: what's left in the bag (see dice.ts). */
export interface DiceBag {
  /** Remaining two-dice combinations, each (red − 1) × 6 + (yellow − 1). */
  cards: number[];
  /** The previous drawn total (0 before the first draw). */
  last: number;
}

// ── Pieces ──────────────────────────────────────────────────────────────────
export interface Building {
  owner: number;
  city: boolean;
  /** C&K city wall. */
  wall: boolean;
  /** C&K metropolis track on this city. */
  metropolis: Track | null;
}

export type KnightLevel = 1 | 2 | 3;

export interface Knight {
  id: number;
  owner: number;
  level: KnightLevel;
  active: boolean;
  /** Turn number of the last activation (an active knight cannot act on that same turn). */
  activatedOn: number;
  /** Turn number of the last promotion (one promotion per knight per turn). */
  promotedOn: number;
}

export type DevCardType = 'knight' | 'victoryPoint' | 'roadBuilding' | 'yearOfPlenty' | 'monopoly';
export interface DevCard {
  type: DevCardType;
  /** Turn number the card was bought (cannot be played on that turn). */
  boughtOn: number;
}

export type ScienceCard =
  | 'alchemist'
  | 'crane'
  | 'engineer'
  | 'inventor'
  | 'irrigation'
  | 'medicine'
  | 'mining'
  | 'printer'
  | 'roadBuilding'
  | 'smith';
export type PoliticsCard =
  | 'bishop'
  | 'constitution'
  | 'deserter'
  | 'diplomat'
  | 'intrigue'
  | 'saboteur'
  | 'spy'
  | 'warlord'
  | 'wedding';
export type TradeCard =
  | 'commercialHarbor'
  | 'masterMerchant'
  | 'merchant'
  | 'merchantFleet'
  | 'resourceMonopoly'
  | 'tradeMonopoly';
export type ProgressCardType = ScienceCard | PoliticsCard | TradeCard;

export interface ProgressCard {
  id: number;
  type: ProgressCardType;
  track: Track;
}

// ── Players ─────────────────────────────────────────────────────────────────
export type PlayerColor = 'red' | 'blue' | 'orange' | 'white' | 'green' | 'purple' | 'teal' | 'pink' | 'brown' | 'black';

export interface PlayerState {
  /** Random per-game player id (never an account or guest id). */
  id: string;
  name: string;
  color: PlayerColor;
  isBot: boolean;
  hand: Hand;
  /** Classic development cards (hidden from other players). */
  devCards: DevCard[];
  knightsPlayed: number;
  /** C&K progress cards in hand (hidden from other players). */
  progress: ProgressCard[];
  /** C&K city improvement levels (0–5). */
  improvements: Record<Track, number>;
  /** C&K "Defender of Catan" VP cards. */
  defender: number;
  /** C&K VP progress cards played (Printer, Constitution). */
  progressVP: number;
  /** Seats this player refuses trade offers from (an embargo). Missing in games saved before embargoes. */
  embargo?: number[];
}

// ── Turn flow ───────────────────────────────────────────────────────────────
export type EventFace = 'ship' | Track;

export interface Dice {
  red: number;
  yellow: number;
  /** C&K event die. */
  event?: EventFace;
}

export interface TurnState {
  seat: number;
  /** Monotonic turn counter: 0 during setup, 1 for the first regular turn. */
  n: number;
  rolled: boolean;
  dice: Dice | null;
  /** Classic: a development card was played this turn. */
  devPlayed: boolean;
  // C&K per-turn effects
  crane: boolean;
  merchantFleet: Card[];
  alchemist: { red: number; yellow: number } | null;
  /** Voyagers: edges of ships built this turn (they may not sail until next turn). */
  shipsBuilt: number[];
  /** Voyagers: a ship already sailed this turn. */
  shipsMoved: boolean;
}

export interface SetupState {
  /** Snake order of seats, e.g. [0,1,2,2,1,0]. */
  order: number[];
  index: number;
  placing: 'settlement' | 'road';
  lastVertex: number | null;
  /**
   * Fog maps: the hexes under fog when the game began. Starting settlements never touch them, not even
   * once a starting road has uncovered one, so everyone picks from the same corners. Missing in games
   * from before.
   */
  fog?: number[];
}

export type Phase = 'setup' | 'play' | 'ended';

/** A decision a specific seat must make before play can continue. All pending prompts are simultaneous. */
export type Prompt =
  | { kind: 'discard'; seat: number; count: number; reason: 'seven' | 'saboteur' }
  | { kind: 'robber'; seat: number; reason: 'seven' | 'knight' | 'bishop' }
  | { kind: 'freeRoads'; seat: number; count: number }
  | { kind: 'loseCity'; seat: number }
  | { kind: 'relocateKnight'; seat: number; from: number; knight: Knight }
  | { kind: 'rewardDeck'; seat: number; reason?: 'treasure' }
  | { kind: 'aqueduct'; seat: number }
  /** Over the progress card limit; `endTurn`: asked when ending the turn, which then carries on. */
  | { kind: 'discardProgress'; seat: number; endTurn?: boolean }
  | { kind: 'giveCards'; seat: number; to: number; count: number }
  | { kind: 'commercialHarbor'; seat: number; from: number }
  | { kind: 'deserterRemove'; seat: number; to: number }
  | { kind: 'deserterPlace'; seat: number; level: KnightLevel }
  /** Diplomat on your own open road: pick where it moves (it stays put until then). */
  | { kind: 'moveRoad'; seat: number; from: number }
  | { kind: 'spy'; seat: number; victim: number; cards: ProgressCard[] }
  | { kind: 'masterMerchant'; seat: number; victim: number; hand: Hand; count: number }
  | { kind: 'placeMetropolis'; seat: number; track: Track }
  /** Gold (Black Forest): pick `count` resources of your choice. */
  | { kind: 'goldPick'; seat: number; count: number; reason?: 'treasure' };

export type PromptKind = Prompt['kind'];

/** Deferred work run by `advance()` once no prompt is pending. */
export type Step =
  | { kind: 'produce' }
  | { kind: 'seven' }
  | { kind: 'barbarians' }
  | { kind: 'progressDraw'; track: Track }
  | { kind: 'prompts'; prompts: Prompt[] };

export interface TradeOffer {
  id: number;
  from: number;
  /** Seats allowed to respond. */
  to: number[];
  /** What `from` gives. */
  give: PartialHand;
  /** What `from` receives. */
  want: PartialHand;
  accepted: number[];
  declined: number[];
  /** Seats in `declined` that couldn't afford the offer (declined for them); only that seat sees it as declined. */
  auto?: number[];
}

// ── Events (game log + animation triggers) ──────────────────────────────────
interface EventBase {
  seq: number;
  /** Fields only visible to the seats listed in `secretTo`. */
  secret?: Record<string, unknown>;
  secretTo?: number[];
}

export type GameEventBody =
  | { type: 'gameStarted' }
  | { type: 'turnStarted'; seat: number; n: number }
  | { type: 'diceRolled'; seat: number; dice: Dice }
  | { type: 'produced'; gains: PartialHand[] }
  | { type: 'shortage'; card: Card }
  /** Fog lifted from these hexes (Black Forest), by `seat`'s road or settlement. */
  | { type: 'revealed'; seat: number; hexes: { id: number; terrain: Terrain; token: number | null }[] }
  | { type: 'built'; seat: number; piece: 'road' | 'ship' | 'settlement' | 'city' | 'wall'; at: number; free?: boolean }
  | { type: 'shipMoved'; seat: number; from: number; to: number }
  /** Voyagers: first settlement on a foreign island, worth `vp` special points. */
  /** Veiled Isles: a treasure collected at corner `at` (null: the bonus for finding hidden sea). */
  | { type: 'treasure'; seat: number; kind: TreasureKind; at: number | null }
  | { type: 'islandSettled'; seat: number; at: number; vp: number }
  | { type: 'robberMoved'; seat: number; hex: number; pirate?: boolean }
  | { type: 'stole'; seat: number; victim: number }
  | { type: 'discarded'; seat: number; cards: PartialHand }
  | { type: 'devBought'; seat: number }
  | { type: 'devPlayed'; seat: number; card: DevCardType }
  | { type: 'monopoly'; seat: number; card: Card; total: number }
  | { type: 'received'; seat: number; cards: PartialHand; reason: string }
  | { type: 'bankTrade'; seat: number; give: PartialHand; get: PartialHand }
  | { type: 'trade'; seat: number; partner: number; give: PartialHand; get: PartialHand }
  | { type: 'tradeOffered'; seat: number; id: number }
  | { type: 'longestRoad'; seat: number | null; length: number }
  | { type: 'largestArmy'; seat: number | null; knights: number }
  | { type: 'gameOver'; winner: number }
  // C&K
  | { type: 'barbarianAdvanced'; position: number }
  | {
      type: 'barbarianAttack';
      strength: number;
      defense: number;
      won: boolean;
      contributions: number[];
      losers: number[];
      defenders: number[];
    }
  | { type: 'cityLost'; seat: number; at: number }
  | { type: 'progressDrawn'; seat: number; track: Track }
  | { type: 'progressPlayed'; seat: number; card: ProgressCardType }
  | { type: 'progressDiscarded'; seat: number; track: Track }
  | { type: 'knightBuilt'; seat: number; at: number }
  | { type: 'knightActivated'; seat: number; at: number }
  | { type: 'knightPromoted'; seat: number; at: number; level: KnightLevel }
  | { type: 'knightMoved'; seat: number; from: number; to: number }
  | { type: 'knightDisplaced'; seat: number; victim: number; at: number }
  | { type: 'knightRemoved'; seat: number; at: number }
  | { type: 'improved'; seat: number; track: Track; level: number }
  | { type: 'metropolis'; seat: number; track: Track; at: number; from: number | null }
  | { type: 'merchantPlaced'; seat: number; hex: number }
  | { type: 'roadRemoved'; seat: number; owner: number; at: number }
  | { type: 'tokensSwapped'; seat: number; a: number; b: number }
  | { type: 'defenderAwarded'; seat: number }
  /** Everyone an offer went to declined it (or couldn't take it), so it closed. `seat` made the offer. */
  | { type: 'tradeClosed'; seat: number; id: number };

export type GameEvent = EventBase & GameEventBody;
export type GameEventType = GameEventBody['type'];

// ── Stats ───────────────────────────────────────────────────────────────────
/**
 * Running totals accumulated as the game plays, for the end-of-game stats screen. The event log is
 * capped (`LOG_LIMIT`), so these can't be rebuilt from it afterwards. Public information only: never
 * the stolen card's identity or which development card was bought/played in secret.
 */
export interface GameStats {
  /** Dice roll counts by total; indices 0 and 1 are unused, 2–12 hold the counts. */
  dice: number[];
  /** Resources/commodities gained from hex production, per seat (`produced` events). */
  produced: Hand[];
  /** Cards gained from any other public source, per seat: discovery, gold, monopoly, year of
   *  plenty, aqueduct, master merchant, etc. (`received`/`monopoly` events). Count only. */
  otherGain: number[];
  /** Cards taken from another player via the robber/pirate, per seat (thief side of `stole`). */
  stolen: number[];
  /** Cards lost to another player's steal, per seat (victim side of `stole`). */
  lost: number[];
  /** Cards discarded on a 7, per seat. */
  discarded: number[];
  /** Completed bank trades, per seat. */
  bankTrades: number[];
  /** Completed player-to-player trades (and forced gifts), per seat; counted for both sides. */
  playerTrades: number[];
  /** Classic development cards bought, per seat. */
  devBought: number[];
  /** Classic knight cards played, per seat. */
  knightsPlayed: number[];
  /** Cities & Knights progress cards played, per seat. */
  progressPlayed: number[];
}

// ── Whole game ──────────────────────────────────────────────────────────────
export interface GameState {
  v: 1;
  mode: Mode;
  settings: GameSettings;
  board: Board;
  players: PlayerState[];
  bank: Hand;
  devDeck: DevCardType[];
  progressDecks: Record<Track, ProgressCard[]>;
  /** Indexed by vertex id. */
  buildings: (Building | null)[];
  /** Indexed by edge id → owner seat. */
  roads: (number | null)[];
  /** Voyagers: indexed by edge id → owner seat. All null on maps without sea. */
  ships: (number | null)[];
  /** Indexed by vertex id (C&K). */
  knights: (Knight | null)[];
  robber: number;
  /** Voyagers: each seat's home islands (where it built during setup); set when setup ends. */
  homeIslands?: number[][];
  /** Voyagers: the pirate's sea hex; null (or missing in older games) on maps without sea. */
  pirate?: number | null;
  merchant: { hex: number; owner: number } | null;
  barbarian: { position: number; attacks: number };
  metropolis: Record<Track, number | null>;
  phase: Phase;
  setup: SetupState | null;
  turn: TurnState;
  pending: Prompt[];
  steps: Step[];
  trades: TradeOffer[];
  longestRoad: number | null;
  roadLengths: number[];
  largestArmy: number | null;
  winner: number | null;
  log: GameEvent[];
  /** Event sequence counter. */
  seq: number;
  /** Id counter for trades, knights and progress cards. */
  nextId: number;
  /** Seeded PRNG state — server-only, never sent to clients. */
  rng: number;
  /** Balanced dice: what's left in the bag — server-only, never sent to clients. */
  diceBag?: DiceBag;
  /** Running totals for the end-of-game stats screen; see `GameStats`. */
  stats: GameStats;
}

// ── Actions ─────────────────────────────────────────────────────────────────
export type ProgressParams = {
  red?: number;
  yellow?: number;
  vertex?: number;
  vertices?: number[];
  hex?: number;
  hexes?: number[];
  edge?: number;
  victim?: number;
  card?: Card;
  offers?: Partial<Record<number, Resource>>;
};

export type Action =
  | { type: 'rollDice' }
  | { type: 'endTurn' }
  | { type: 'buildRoad'; edge: number }
  | { type: 'buildShip'; edge: number }
  | { type: 'moveShip'; from: number; to: number }
  | { type: 'buildSettlement'; vertex: number }
  | { type: 'buildCity'; vertex: number }
  | { type: 'moveRobber'; hex: number; victim: number | null }
  | { type: 'discard'; cards: PartialHand }
  | { type: 'skipFreeRoads' }
  | { type: 'buyDevCard' }
  | { type: 'playKnight' }
  | { type: 'playRoadBuilding' }
  | { type: 'playYearOfPlenty'; resources: Resource[] }
  | { type: 'playMonopoly'; resource: Resource }
  | { type: 'bankTrade'; give: Card; get: Card; count: number }
  /** Several bank trades in one: each kind given in multiples of its rate, as many cards back as that buys. */
  | { type: 'bankExchange'; give: PartialHand; get: PartialHand }
  | { type: 'offerTrade'; give: PartialHand; want: PartialHand; to: number[] }
  | { type: 'respondTrade'; id: number; accept: boolean }
  | { type: 'confirmTrade'; id: number; partner: number }
  | { type: 'cancelTrade'; id: number }
  /** Refuse (or accept again) trade offers from `seat`. */
  | { type: 'embargo'; seat: number; on: boolean }
  // C&K
  | { type: 'buildKnight'; vertex: number }
  | { type: 'activateKnight'; vertex: number }
  | { type: 'promoteKnight'; vertex: number }
  | { type: 'moveKnight'; from: number; to: number }
  | { type: 'chaseRobber'; vertex: number; hex: number; victim: number | null }
  | { type: 'buildWall'; vertex: number }
  | { type: 'improveCity'; track: Track }
  | { type: 'playProgress'; card: number; params?: ProgressParams }
  | { type: 'loseCity'; vertex: number }
  | { type: 'relocateKnight'; vertex: number | null }
  | { type: 'chooseDeck'; track: Track }
  | { type: 'aqueduct'; resource: Resource }
  | { type: 'pickGold'; cards: PartialHand }
  | { type: 'discardProgress'; card: number }
  | { type: 'giveCards'; cards: PartialHand }
  | { type: 'removeKnight'; vertex: number }
  | { type: 'placeKnight'; vertex: number | null }
  | { type: 'takeProgress'; card: number }
  | { type: 'takeCards'; cards: PartialHand }
  | { type: 'placeMetropolis'; vertex: number };

export type ActionType = Action['type'];

export type ApplyResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string };
