import { generateBoard } from './board/generate';
import { getTopology, type Topology } from './board/topology';
import {
  BANK_PER_COMMODITY,
  BANK_PER_RESOURCE,
  DEFAULT_VP,
  DEV_DECK,
  LOG_LIMIT,
  PROGRESS_DECKS,
} from './constants';
import { emptyHand } from './hand';
import { normalizeSeed, shuffle } from './rng';
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
}

export function nextId(s: GameState): number {
  return s.nextId++;
}

function fullBank(mode: Mode): Hand {
  const bank = emptyHand();
  for (const r of RESOURCES) bank[r] = BANK_PER_RESOURCE;
  if (mode === 'ck') for (const c of COMMODITIES) bank[c] = BANK_PER_COMMODITY;
  return bank;
}

export function createGame(opts: CreateGameOptions): GameState {
  const { mode, players } = opts;
  if (players.length < 2 || players.length > 4) throw new Error('A game needs 2–4 players');
  const rng = { rng: normalizeSeed(opts.seed) };
  const board = generateBoard(rng);
  const topo = getTopology(board.hexes);

  const devDeck: DevCardType[] = [];
  if (mode === 'classic') {
    for (const [type, count] of Object.entries(DEV_DECK) as [DevCardType, number][]) {
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
    vpToWin: opts.settings?.vpToWin ?? DEFAULT_VP[mode],
    discardLimit: opts.settings?.discardLimit ?? 7,
    friendlyRobber: opts.settings?.friendlyRobber ?? false,
  };

  const n = players.length;
  const order = [...Array(n).keys(), ...[...Array(n).keys()].reverse()];
  const desert = board.hexes.find((h) => h.terrain === 'desert')!;

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
    })),
    bank: fullBank(mode),
    devDeck,
    progressDecks,
    buildings: topo.vertices.map(() => null),
    roads: topo.edges.map(() => null),
    knights: topo.vertices.map(() => null),
    robber: desert.id,
    merchant: null,
    barbarian: { position: 0, attacks: 0 },
    metropolis: { trade: null, politics: null, science: null },
    phase: 'setup',
    setup: { order, index: 0, placing: 'settlement', lastVertex: null },
    turn: {
      seat: order[0],
      n: 0,
      rolled: false,
      dice: null,
      devPlayed: false,
      crane: false,
      merchantFleet: [],
      alchemist: null,
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
  };
  const ctx = makeCtx(s, -1);
  emit(ctx, { type: 'gameStarted' });
  return s;
}
