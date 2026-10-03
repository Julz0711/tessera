import { generateBoard } from './board/generate';
import { getTopology, type Topology } from './board/topology';
import {
  BANK_PER_COMMODITY,
  BIG_MAPS,
  BANK_PER_RESOURCE,
  DEFAULT_VP,
  DEV_DECK,
  LARGE_BANK_PER_COMMODITY,
  LARGE_BANK_PER_RESOURCE,
  LARGE_DEV_DECK,
  LOG_LIMIT,
  MAX_PLAYERS,
  PROGRESS_DECKS,
} from './constants';
import { emptyHand } from './hand';
import { defaultVP, mapSupports } from './maps';
import { normalizeSeed, shuffle } from './rng';
import { newStats, recordStats } from './stats';
import {
  COMMODITIES,
  RESOURCES,
  TRACKS,
  type DevCardType,
  type GameEvent,
  type GameEventBody,
  type GameSettings,
  type GameState,
  type Hand,
  type MapId,
  type Mode,
  type PlayerColor,
  type ProgressCard,
  type Track,
} from './types';

export interface NewPlayer {
  id: string;
  name: string;
  color: PlayerColor;
  isBot: boolean;
}

export interface CreateGameOptions {
  seed: number;
  mode: Mode;
  /** Players in turn order. */
  players: NewPlayer[];
  settings?: Partial<Omit<GameSettings, 'mode'>>;
}

/** Mutable context handed to rule handlers for one action. */
export interface Ctx {
  s: GameState;
  seat: number;
  events: GameEvent[];
  topo: Topology;
}

export function topologyOf(s: Pick<GameState, 'board'>): Topology {
  return getTopology(s.board.hexes);
}

export function makeCtx(s: GameState, seat: number): Ctx {
  return { s, seat, events: [], topo: topologyOf(s) };
}

export function emit(ctx: Ctx, body: GameEventBody, secret?: { data: Record<string, unknown>; to: number[] }): void {
  const ev: GameEvent = { ...body, seq: ++ctx.s.seq };
  if (secret) {
    ev.secret = secret.data;
    ev.secretTo = secret.to;
  }
  ctx.events.push(ev);
  ctx.s.log.push(ev);
  if (ctx.s.log.length > LOG_LIMIT) ctx.s.log.splice(0, ctx.s.log.length - LOG_LIMIT);
  recordStats(ctx.s, ev);
}

export function nextId(s: GameState): number {
  return s.nextId++;
}

function fullBank(mode: Mode, map: MapId): Hand {
  const bank = emptyHand();
  // The bigger maps (large, Black Forest) use the extension's bigger bank and deck.
  const big = BIG_MAPS.has(map);
  for (const r of RESOURCES) bank[r] = big ? LARGE_BANK_PER_RESOURCE : BANK_PER_RESOURCE;
  if (mode === 'ck') for (const c of COMMODITIES) bank[c] = big ? LARGE_BANK_PER_COMMODITY : BANK_PER_COMMODITY;
  return bank;
}

export function createGame(opts: CreateGameOptions): GameState {
  const { mode, players } = opts;
  const map: MapId = opts.settings?.map ?? 'standard';
  if (!mapSupports(map, mode)) throw new Error(`Map ${map} is not compatible with ${mode} mode`);
  if (players.length < 2 || players.length > MAX_PLAYERS[map]) throw new Error(`This map seats 2–${MAX_PLAYERS[map]} players`);
  const rng = { rng: normalizeSeed(opts.seed) };
  // Unset means the map as designed (gold on). Rooms always pass the lobby choice, which starts off
  // (DEFAULT_ROOM_SETTINGS); this default only serves tests and demo boards.
  const gold = opts.settings?.gold ?? true;
  const board = generateBoard(rng, map, { gold });
  const topo = getTopology(board.hexes);

  const devDeck: DevCardType[] = [];
  if (mode === 'classic') {
    for (const [type, count] of Object.entries(BIG_MAPS.has(map) ? LARGE_DEV_DECK : DEV_DECK) as [DevCardType, number][]) {
      for (let i = 0; i < count; i++) devDeck.push(type);
    }
    shuffle(rng, devDeck);
  }

  let idCounter = 1;
  const progressDecks = { trade: [], politics: [], science: [] } as Record<Track, ProgressCard[]>;
  if (mode === 'ck') {
    for (const track of TRACKS) {
      for (const [type, count] of PROGRESS_DECKS[track]) {
        for (let i = 0; i < count; i++) progressDecks[track].push({ id: idCounter++, type, track });
      }
      shuffle(rng, progressDecks[track]);
    }
  }

  const settings: GameSettings = {
    mode,
    map,
    vpToWin: opts.settings?.vpToWin ?? defaultVP(map, mode, DEFAULT_VP[mode]),
    discardLimit: opts.settings?.discardLimit ?? 7,
    friendlyRobber: opts.settings?.friendlyRobber ?? false,
    gold,
    dice: opts.settings?.dice ?? 'random',
  };

  const n = players.length;
  const order = [...Array(n).keys(), ...[...Array(n).keys()].reverse()];
  // The robber starts in the desert; maps without one (Four Realms) start it on the 12, as the rules say.
  const robber =
    board.hexes[board.robberStart ?? -1] ??
    board.hexes.find((h) => h.terrain === 'desert') ??
    board.hexes.find((h) => h.token === 12 && !h.fog) ??
    board.hexes.find((h) => h.terrain !== 'sea' && !h.fog)!;
  const pirate = board.hexes.some((h) => h.terrain === 'sea') ? (board.pirateStart ?? board.hexes.find((h) => h.terrain === 'sea')!.id) : null;

  const s: GameState = {
    v: 1,
    mode,
    settings,
    board,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      isBot: p.isBot,
      hand: emptyHand(),
      devCards: [],
      knightsPlayed: 0,
      progress: [],
      improvements: { trade: 0, politics: 0, science: 0 },
      defender: 0,
      progressVP: 0,
      embargo: [],
    })),
    bank: fullBank(mode, map),
    devDeck,
    progressDecks,
    buildings: topo.vertices.map(() => null),
    roads: topo.edges.map(() => null),
    ships: topo.edges.map(() => null),
    knights: topo.vertices.map(() => null),
    robber: robber.id,
    pirate,
    merchant: null,
    barbarian: { position: 0, attacks: 0 },
    metropolis: { trade: null, politics: null, science: null },
    phase: 'setup',
    setup: { order, index: 0, placing: 'settlement', lastVertex: null, fog: board.hexes.filter((h) => h.fog).map((h) => h.id) },
    turn: {
      seat: order[0],
      n: 0,
      rolled: false,
      dice: null,
      devPlayed: false,
      crane: false,
      merchantFleet: [],
      alchemist: null,
      shipsBuilt: [],
      shipsMoved: false,
    },
    pending: [],
    steps: [],
    trades: [],
    longestRoad: null,
    roadLengths: players.map(() => 0),
    largestArmy: null,
    winner: null,
    log: [],
    seq: 0,
    nextId: idCounter,
    rng: rng.rng,
    stats: newStats(n),
  };
  const ctx = makeCtx(s, -1);
  emit(ctx, { type: 'gameStarted' });
  return s;
}
