import { randomInt, randomUUID } from 'node:crypto';
import { botAction } from '@/bots';
import { seatsToAsk } from '@/bots/simulate';
import {
  CARDS,
  DEFAULT_VP,
  EVENT_DIE,
  MAX_PLAYERS,
  RESOURCES,
  actorsFor,
  applyAction,
  createGame,
  eventsFor,
  isDiceMode,
  isMapId,
  viewFor,
  type Action,
  type Card,
  type GameEvent,
  type GameState,
  type PlayerColor,
  type PlayerView,
} from '@/engine';
import { buildReport, type GameReport } from '@/engine/report';
import { MAPS, defaultVP, mapSupports } from '@/engine/maps';
import { COLOR_ORDER, isPlayerColor } from '@/shared/colors';
import { DEFAULT_COSMETICS, sanitizeCosmetics, type Cosmetics } from '@/shared/cosmetics';
import { DEFAULT_KNIGHT, sanitizeKnight, type KnightCustomization } from '@/shared/knight';
import {
  DEFAULT_ROOM_SETTINGS,
  ERR_NEEDS_PROFILE,
  TURN_TIMER_OPTIONS,
  type AdminGameCommand,
  type ChatMessage,
  type JoinProfile,
  type RoomDTO,
  type RoomSettings,
  type ServerToClientEvents,
} from '@/shared/protocol';
import { sanitizeChat, sanitizeName } from '@/shared/text';
import { autopilotAction } from './autopilot';
import { BOT_NAMES } from './botNames';
import type { ServerIdentity } from './identity';
import type { Persistence } from './persistence';
import type { RestoredRoom } from './prismaPersistence';
import type { ReactionId } from '@/shared/reactions';

/** Errors whose message is safe to show the user. */
export class UserError extends Error {}

export interface RoomIO {
  send<E extends keyof ServerToClientEvents>(socketId: string, event: E, ...args: Parameters<ServerToClientEvents[E]>): void;
  /** Forget the socket's room association (it was replaced, kicked, or the room closed). */
  detach(socketId: string): void;
  /** Whether the client appends log events itself (see `GameUpdate`); older clients need every view whole. */
  logDeltas?(socketId: string): boolean;
  /** Whether the socket belongs to a server admin (in-game admin tools). */
  isAdmin?(socketId: string): boolean;
}

export interface RoomDeps {
  io: RoomIO;
  persistence: Persistence;
  now?: () => number;
  /** Multiplier for bot "thinking" delays (tests use 0). */
  botDelayScale?: number;
  /** Grace period before autopilot acts for a disconnected player. */
  disconnectGraceMs?: number;
}

interface Seat {
  playerId: string;
  identityKey: string | null;
  isBot: boolean;
  isGuest: boolean;
  name: string;
  color: PlayerColor;
  knight: KnightCustomization;
  cosmetics: Cosmetics;
  /** Restored after a restart without a saved frame/title: the player's next join may set it, once. */
  cosmeticsPending?: boolean;
  avatarUrl?: string;
  sockets: Set<string>;
  lastSeen: number;
  /** Human left mid-game: autopilot plays until they come back. */
  left: boolean;
}

interface Spectator {
  identityKey: string;
  name: string;
}

const CHAT_HISTORY = 100;
/** Events between saved snapshots (a restart replays at most this many actions). */
const SNAPSHOT_EVERY = 25;
const MAX_BOT_ACTIONS_PER_TURN = 120;
/** Game states kept for the admins' undo (in memory only, and only while an admin is in the room). */
const UNDO_DEPTH = 30;
/** After an admin change, bots wait this long before moving, so the admin can undo again (or look). */
const ADMIN_BOT_PAUSE_MS = 4000;

/** 'buildRoad' → 'build road', for the chat line an undo leaves. */
const actionName = (type: string) => type.replace(/([A-Z])/g, ' $1').toLowerCase();

export class Room {
  id: string = randomUUID();
  hostKey: string;
  settings: RoomSettings;
  seats: Seat[] = [];
  spectators = new Map<string, Spectator>();
  /** Each identity's last chat line, for the repeat check (spectators have no player id to go by). */
  private lastSaid = new Map<string, { text: string; at: number }>();
  /** Every attached socket → identity key. */
  sockets = new Map<string, string>();
  status: 'lobby' | 'playing' | 'finished' = 'lobby';
  game: GameState | null = null;
  gameId: string | null = null;
  gameNumber = 0;
  chat: ChatMessage[] = [];
  lastActivity: number;
  closed = false;
  private window = { key: '', startedAt: 0 };
  /** Extra time earned by acting while in the red zone (last 10s); resets with the window. */
  private bonusMs = 0;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private botGuard = { marker: '', count: 0 };
  /** Sockets holding this game's full log (later updates send only the new events), by game id. */
  private logSynced = new Map<string, string>();
  /** The room as each socket last received it. */
  private roomSent = new Map<string, string>();
  /** Seq of the latest saved snapshot (snapshots are taken every `SNAPSHOT_EVERY` events). */
  private snapshotSeq = 0;
  /** Earlier states of the running game, newest last, each with what came after it (admin undo). */
  private history: { state: GameState; label: string }[] = [];
  /** Bots hold off until then (see `ADMIN_BOT_PAUSE_MS`). */
  private botPauseUntil = 0;
  private readonly now: () => number;

  constructor(
    readonly code: string,
    host: ServerIdentity | { key: string },
    settings: Partial<RoomSettings> | undefined,
    private readonly deps: RoomDeps,
    restoring = false,
  ) {
    this.now = deps.now ?? Date.now;
    this.hostKey = host.key;
    this.settings = { ...DEFAULT_ROOM_SETTINGS };
    this.lastActivity = this.now();
    if (settings) this.applySettings(settings);
    if (!restoring) deps.persistence.roomCreated(this.persistRoom());
  }

  /** Rebuilds a running game from the database after a server restart. */
  static restore(data: RestoredRoom, deps: RoomDeps): Room {
    const host = data.seats.find((s) => s.identityKey)?.identityKey ?? '';
    const room = new Room(data.code, { key: host }, data.settings, deps, true);
    room.id = data.id;
    room.seats = data.seats.map((s) => ({
      playerId: s.playerId,
      identityKey: s.identityKey,
      isBot: s.isBot,
      isGuest: !!s.identityKey?.startsWith('g:'),
      name: s.name,
      color: s.color as PlayerColor,
      knight: sanitizeKnight(s.knight),
      cosmetics: s.cosmetics ?? DEFAULT_COSMETICS,
      cosmeticsPending: !s.isBot && !s.cosmetics,
      sockets: new Set<string>(),
      lastSeen: room.now(),
      left: false,
    }));
    // Seats abandoned after the snapshot are bots now (the replayed actions don't say so).
    room.game = { ...data.state, players: data.state.players.map((p, i) => (room.seats[i]?.isBot && !p.isBot ? { ...p, isBot: true } : p)) };
    room.snapshotSeq = data.snapshotSeq;
    room.gameId = data.gameId;
    room.gameNumber = data.gameNumber;
    room.status = data.state.phase === 'ended' ? 'finished' : 'playing';
    room.window = { key: '', startedAt: room.now() };
    room.system('The server restarted and your game was restored. Welcome back!');
    if (room.status === 'playing') {
      room.updateWindow();
      room.startTicker();
      room.scheduleBots();
    }
    return room;
  }

  // ── Membership ────────────────────────────────────────────────────────────

  join(socketId: string, identity: ServerIdentity, opts: { profile?: JoinProfile; spectate?: boolean }): RoomDTO {
    this.assertOpen();
    this.touch();
    const key = identity.key;
    const seat = this.seats.find((s) => s.identityKey === key);
    if (seat) {
      for (const old of seat.sockets) {
        if (old === socketId) continue;
        this.deps.io.send(old, 'session:replaced');
        this.forgetSocket(old);
        this.deps.io.detach(old);
      }
      const wasAway = seat.sockets.size === 0 && this.status === 'playing';
      seat.sockets = new Set([socketId]);
      seat.left = false;
      seat.lastSeen = this.now();
      if (opts.profile && this.status === 'lobby') this.applyProfile(seat, opts.profile);
      // Mid-game the look is fixed. Only a seat restored without a saved frame/title takes the one
      // the player brings, on their first rejoin.
      else if (seat.cosmeticsPending && opts.profile?.cosmetics !== undefined) {
        seat.cosmetics = sanitizeCosmetics(opts.profile.cosmetics);
        seat.cosmeticsPending = false;
      }
      this.sockets.set(socketId, key);
      if (wasAway) this.system(`${seat.name} is back`);
    } else {
      const wantsSeat = !opts.spectate && this.status === 'lobby' && this.seats.length < this.settings.maxPlayers;
      if (wantsSeat) {
        if (!opts.profile) throw new UserError(ERR_NEEDS_PROFILE);
        const newSeat: Seat = {
          playerId: randomUUID(),
          identityKey: key,
          isBot: false,
          isGuest: identity.kind === 'guest',
          name: sanitizeName(opts.profile.name),
          color: this.freeColor(opts.profile.color),
          knight: sanitizeKnight(opts.profile.knight),
          cosmetics: sanitizeCosmetics(opts.profile.cosmetics),
          avatarUrl: identity.avatarUrl ?? undefined,
          sockets: new Set([socketId]),
          lastSeen: this.now(),
          left: false,
        };
        this.seats.push(newSeat);
        this.sockets.set(socketId, key);
        this.system(`${newSeat.name} joined`);
      } else {
        if (!this.settings.allowSpectators) {
          throw new UserError(
            opts.spectate ? 'Spectating is turned off for this room' : this.status === 'lobby' ? 'This room is full' : 'The game has already started',
          );
        }
        const name = sanitizeName(opts.profile?.name ?? identity.displayName, 'Spectator');
        this.spectators.set(socketId, { identityKey: key, name });
        this.sockets.set(socketId, key);
      }
    }
    this.deps.io.send(socketId, 'chat:history', this.chat);
    this.broadcastRoom();
    if (this.game) this.sendGame(socketId, [], true);
    return this.dto(socketId);
  }

  /** Explicit leave. Mid-game a departing player's seat is handed to autopilot. */
  leave(socketId: string): void {
    const key = this.sockets.get(socketId);
    if (!key) return;
    this.forgetSocket(socketId);
    const seat = this.seats.find((s) => s.identityKey === key);
    if (seat) {
      seat.sockets.delete(socketId);
      if (this.status === 'lobby') {
        this.seats = this.seats.filter((s) => s !== seat);
        this.system(`${seat.name} left`);
      } else if (this.status === 'playing') {
        seat.left = true;
        seat.lastSeen = this.now();
        this.system(`${seat.name} left. Autopilot is playing for them.`);
      }
    }
    this.migrateHost();
    this.broadcastRoom();
    this.closeIfAbandoned();
  }

  /**
   * Gives up the identity's seat for good (the main menu's "abandon"; the player may have no socket
   * here). In the lobby the seat is freed; mid-game a bot takes it over, and the game is gone from
   * the player's rejoin list. Returns whether the identity held a seat.
   */
  abandon(identityKey: string): boolean {
    const seat = this.seats.find((s) => s.identityKey === identityKey);
    if (!seat || this.closed || (this.status !== 'lobby' && this.status !== 'playing')) return false;
    for (const sid of seat.sockets) {
      this.forgetSocket(sid);
      this.deps.io.send(sid, 'room:closed', 'You abandoned this game');
      this.deps.io.detach(sid);
    }
    seat.sockets.clear();
    if (this.status === 'lobby') {
      this.seats = this.seats.filter((s) => s !== seat);
      this.system(`${seat.name} left`);
    } else {
      seat.isBot = true;
      seat.isGuest = false;
      seat.identityKey = null;
      seat.avatarUrl = undefined;
      seat.left = false;
      const index = this.seats.indexOf(seat);
      // The end-of-game report reads this, so it marks the seat as bot-played too.
      if (this.game) this.game = { ...this.game, players: this.game.players.map((p, i) => (i === index ? { ...p, isBot: true } : p)) };
      if (this.gameId) this.deps.persistence.seatAbandoned(this.gameId, seat.playerId);
      this.system(`${seat.name} abandoned the game. A bot took their seat.`);
    }
    this.touch();
    this.migrateHost();
    this.broadcastRoom();
    if (this.status === 'playing' && !this.seats.some((s) => !s.isBot) && this.spectators.size === 0) this.close('Everyone left');
    else {
      this.closeIfAbandoned();
      this.scheduleBots();
    }
    return true;
  }

  disconnect(socketId: string): void {
    const key = this.sockets.get(socketId);
    if (!key) return;
    this.forgetSocket(socketId);
    const seat = this.seats.find((s) => s.identityKey === key);
    if (seat) {
      seat.sockets.delete(socketId);
      seat.lastSeen = this.now();
      if (this.status === 'lobby' && seat.sockets.size === 0) {
        // Lobby seats are released after a short grace period so a refresh keeps your seat.
        setTimeout(() => this.releaseLobbySeat(seat), this.deps.disconnectGraceMs ?? 20_000).unref?.();
      }
    }
    this.broadcastRoom();
  }

  private releaseLobbySeat(seat: Seat): void {
    if (this.closed || this.status !== 'lobby' || seat.sockets.size > 0 || !this.seats.includes(seat)) return;
    this.seats = this.seats.filter((s) => s !== seat);
    this.system(`${seat.name} left`);
    this.migrateHost();
    this.broadcastRoom();
  }

  private migrateHost(): void {
    const hostSeated = this.seats.some((s) => s.identityKey === this.hostKey && !s.left);
    const hostWatching = [...this.spectators.values()].some((sp) => sp.identityKey === this.hostKey);
    if (hostSeated || hostWatching) return;
    const next = this.seats.find((s) => !s.isBot && !s.left && s.sockets.size > 0);
    if (next?.identityKey) {
      this.hostKey = next.identityKey;
      this.system(`${next.name} is now the host`);
    }
  }

  hasConnectedHumans(): boolean {
    return this.sockets.size > 0;
  }

  // ── Lobby controls ────────────────────────────────────────────────────────

  updateSettings(socketId: string, patch: Partial<RoomSettings>): void {
    this.requireHost(socketId);
    if (this.status !== 'lobby') throw new UserError('Settings can only change in the lobby');
    this.applySettings(patch);
    this.deps.persistence.roomStatus(this.persistRoom());
    this.broadcastRoom();
  }

  private applySettings(patch: Partial<RoomSettings>): void {
    const next = { ...this.settings };
    if (patch.mode === 'classic' || patch.mode === 'ck') {
      // Mode and map may change together (the lobby's game type picker): check against the new map.
      const map = isMapId(patch.map) ? patch.map : (next.map ?? 'standard');
      if (!mapSupports(map, patch.mode)) throw new UserError('That map is not available in this mode');
      if (patch.mode !== next.mode) next.vpToWin = defaultVP(next.map ?? 'standard', patch.mode, DEFAULT_VP[patch.mode]);
      next.mode = patch.mode;
    }
    next.map ??= 'standard'; // rooms saved before maps existed
    if (isMapId(patch.map)) {
      // A map made for one mode (Veiled Isles: Knights & Barbarians) switches the room to it.
      const only = MAPS[patch.map].modes;
      if (!only.includes(next.mode) && only.length === 1) next.mode = only[0];
      if (!mapSupports(patch.map, next.mode)) throw new UserError('That map is not available in this mode');
      if (patch.map !== next.map) next.vpToWin = defaultVP(patch.map, next.mode, DEFAULT_VP[next.mode]);
      const seats = MAX_PLAYERS[patch.map];
      if (this.seats.length > seats) throw new UserError(`That map seats at most ${seats} players`);
      // The big island is for bigger tables: open its extra seats by default.
      if (patch.map !== next.map) next.maxPlayers = patch.map === 'large' ? seats : Math.min(next.maxPlayers, seats);
      next.map = patch.map;
    }
    if (Number.isInteger(patch.maxPlayers)) {
      next.maxPlayers = Math.min(MAX_PLAYERS[next.map], Math.max(2, Math.max(patch.maxPlayers!, this.seats.length)));
    }
    if (Number.isInteger(patch.vpToWin)) next.vpToWin = Math.min(20, Math.max(3, patch.vpToWin!));
    if (typeof patch.turnTimer === 'number' && (TURN_TIMER_OPTIONS as readonly number[]).includes(patch.turnTimer)) {
      next.turnTimer = patch.turnTimer;
    }
    if (typeof patch.friendlyRobber === 'boolean') next.friendlyRobber = patch.friendlyRobber;
    if (typeof patch.allowSpectators === 'boolean') next.allowSpectators = patch.allowSpectators;
    if (typeof patch.gold === 'boolean') next.gold = patch.gold;
    if (isDiceMode(patch.dice)) next.dice = patch.dice;
    this.settings = next;
  }

  updateProfile(socketId: string, patch: Partial<JoinProfile>): void {
    const seat = this.seatOf(socketId);
    if (!seat) throw new UserError('You are not seated in this room');
    if (this.status !== 'lobby') throw new UserError('You can change this in the lobby');
    this.applyProfile(seat, patch);
    this.broadcastRoom();
  }

  private applyProfile(seat: Seat, patch: Partial<JoinProfile>): void {
    if (patch.name !== undefined) seat.name = sanitizeName(patch.name, seat.name);
    if (patch.color !== undefined && isPlayerColor(patch.color)) {
      const taken = this.seats.some((s) => s !== seat && s.color === patch.color);
      if (taken) throw new UserError('That color is taken');
      seat.color = patch.color;
    }
    if (patch.knight !== undefined) seat.knight = sanitizeKnight(patch.knight);
    // Already limited to what the player has unlocked by the socket layer.
    if (patch.cosmetics !== undefined) seat.cosmetics = sanitizeCosmetics(patch.cosmetics);
  }

  addBot(socketId: string): void {
    this.requireHost(socketId);
    if (this.status !== 'lobby') throw new UserError('Bots can only be added in the lobby');
    if (this.seats.length >= this.settings.maxPlayers) throw new UserError('The table is full');
    const used = new Set(this.seats.map((s) => s.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${this.seats.length + 1}`;
    this.seats.push({
      playerId: randomUUID(),
      identityKey: null,
      isBot: true,
      isGuest: false,
      name,
      color: this.freeColor(),
      knight: DEFAULT_KNIGHT,
      cosmetics: DEFAULT_COSMETICS,
      sockets: new Set(),
      lastSeen: this.now(),
      left: false,
    });
    this.broadcastRoom();
  }

  removeSeat(socketId: string, playerId: string): void {
    this.requireHost(socketId);
    if (this.status !== 'lobby') throw new UserError('Players can only be removed in the lobby');
    const seat = this.seats.find((s) => s.playerId === playerId);
    if (!seat) throw new UserError('No such player');
    if (seat.identityKey === this.hostKey) throw new UserError("You can't remove yourself");
    this.seats = this.seats.filter((s) => s !== seat);
    for (const sid of seat.sockets) {
      this.forgetSocket(sid);
      this.deps.io.send(sid, 'room:closed', 'You were removed from the room');
      this.deps.io.detach(sid);
    }
    if (!seat.isBot) this.system(`${seat.name} was removed`);
    this.broadcastRoom();
  }

  start(socketId: string): void {
    this.requireHost(socketId);
    if (this.status !== 'lobby') throw new UserError('The game has already started');
    this.startGame();
  }

  rematch(socketId: string): void {
    this.requireHost(socketId);
    if (this.status !== 'finished') throw new UserError('The game is not over yet');
    // Players who left don't come back; the rest play again in a new random order.
    this.seats = this.seats.filter((s) => s.isBot || !s.left);
    if (this.seats.length < 2) throw new UserError('Not enough players for a rematch');
    this.startGame();
  }

  /** After a game: everyone goes back to the lobby, where the host can change settings and seats. */
  backToLobby(socketId: string): void {
    this.requireHost(socketId);
    if (this.status !== 'finished') throw new UserError('The game is not over yet');
    this.seats = this.seats.filter((s) => s.isBot || !s.left);
    this.stopTicker();
    this.game = null;
    this.gameId = null;
    this.history = [];
    this.status = 'lobby';
    this.deps.persistence.roomStatus(this.persistRoom());
    this.system('Back in the lobby.');
    this.broadcastRoom();
  }

  private startGame(): void {
    if (this.seats.length < 2) throw new UserError('Add at least one more player or bot');
    if (this.settings.mode === 'ck' && !CK_READY) throw new UserError('Knights & Barbarians is coming soon');
    // Random turn order (Fisher–Yates with crypto randomness).
    for (let i = this.seats.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [this.seats[i], this.seats[j]] = [this.seats[j], this.seats[i]];
    }
    this.game = createGame({
      seed: randomInt(0, 2 ** 32 - 1),
      mode: this.settings.mode,
      players: this.seats.map((s) => ({ id: s.playerId, name: s.name, color: s.color, isBot: s.isBot })),
      settings: {
        vpToWin: this.settings.vpToWin,
        friendlyRobber: this.settings.friendlyRobber,
        map: this.settings.map ?? 'standard',
        gold: this.settings.gold ?? DEFAULT_ROOM_SETTINGS.gold,
        dice: this.settings.dice ?? 'random',
      },
    });
    this.gameId = randomUUID();
    this.snapshotSeq = this.game.seq;
    this.history = [];
    this.gameNumber++;
    this.status = 'playing';
    this.window = { key: '', startedAt: this.now() };
    this.bonusMs = 0;
    this.botGuard = { marker: '', count: 0 };
    this.deps.persistence.gameStarted(this.persistGame());
    this.deps.persistence.roomStatus(this.persistRoom());
    this.system(this.gameNumber > 1 ? 'Rematch! New board, new order.' : 'The game has begun. Good luck!');
    this.afterChange([]);
    this.startTicker();
  }

  // ── Gameplay ──────────────────────────────────────────────────────────────

  act(socketId: string, action: Action): void {
    this.assertOpen();
    const seatIndex = this.seatIndexOf(socketId);
    if (seatIndex < 0) throw new UserError('Spectators cannot play');
    if (this.status !== 'playing' || !this.game) throw new UserError('The game is not running');
    this.touch();
    const err = this.apply(seatIndex, action);
    if (err) throw new UserError(err);
  }

  /** Applies an action for a seat; returns an error message or null. */
  private apply(seat: number, action: Action): string | null {
    if (!this.game) return 'No game';
    const dl = this.deadline();
    const inRedZone = dl !== null && dl - this.now() <= 10_000;
    const prevKey = this.window.key;
    const result = applyAction(this.game, seat, action);
    if (!result.ok) return result.error;
    // States are never mutated (see `applyAction`): keeping the old one is all an undo needs. Only
    // tables with an admin at them keep any, so ordinary games don't carry the memory.
    if (this.adminPresent()) this.remember(this.game, `${this.seats[seat]?.name ?? 'someone'}: ${actionName(action.type)}`);
    this.game = result.state;
    if (this.gameId) {
      this.deps.persistence.gameAction(this.gameId, result.state.seq, this.seats[seat]?.playerId ?? null, action, result.events);
      // An action can emit several events, so `seq` may step over any fixed multiple: count instead.
      if (result.state.seq - this.snapshotSeq >= SNAPSHOT_EVERY) {
        this.snapshotSeq = result.state.seq;
        this.deps.persistence.snapshot(this.gameId, result.state);
      }
    }
    this.afterChange(result.events);
    // Acting with the clock nearly out earns a bit more time, but only within the same decision
    // window — starting a new window (new turn/prompt) already gets a fresh deadline.
    if (inRedZone && this.window.key === prevKey) this.bonusMs += 5_000;
    return null;
  }

  private afterChange(events: GameEvent[]): void {
    const g = this.game!;
    if (g.phase === 'ended' && this.status === 'playing') {
      this.status = 'finished';
      this.stopTicker();
      const winner = g.winner !== null ? this.seats[g.winner] : null;
      if (winner) this.system(`${winner.name} wins the game!`);
      if (this.gameId) {
        this.deps.persistence.snapshot(this.gameId, g);
        this.deps.persistence.gameEnded(this.persistGame());
      }
      this.deps.persistence.roomStatus(this.persistRoom());
    }
    this.updateWindow();
    this.broadcastGame(events);
    this.broadcastRoom();
    this.scheduleBots();
  }

  // ── Bots, autopilot and timers ────────────────────────────────────────────

  private scheduleBots(): void {
    if (this.botTimer) clearTimeout(this.botTimer);
    this.botTimer = null;
    const g = this.game;
    if (!g || g.phase === 'ended' || this.closed) return;
    const botSeat = seatsToAsk(g).find((i) => this.seats[i].isBot);
    if (botSeat === undefined) return;
    const base = g.pending.length ? 750 : g.phase === 'setup' ? 850 : g.turn.rolled ? 600 : 800;
    const pause = Math.max(0, this.botPauseUntil - this.now());
    const delay = Math.round((base + randomInt(0, 400)) * (this.deps.botDelayScale ?? 1)) + pause;
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      this.runBots();
    }, delay);
  }

  private runBots(): void {
    const g = this.game;
    if (!g || g.phase === 'ended' || this.closed) return;
    for (const seat of seatsToAsk(g)) {
      if (!this.seats[seat].isBot) continue;
      const marker = `${g.turn.n}:${seat}`;
      if (this.botGuard.marker !== marker) this.botGuard = { marker, count: 0 };
      // A bot or engine bug must not escape the timer: that would take down every room on the server.
      let action: Action | null;
      try {
        action = botAction(viewFor(g, seat), seat, { tradeTimedOut: true });
      } catch (err) {
        console.error(`[room ${this.code}] bot ${seat} crashed`, err);
        action = this.safeAutopilot(seat);
      }
      if (!action) continue;
      if (++this.botGuard.count > MAX_BOT_ACTIONS_PER_TURN) action = this.safeAutopilot(seat) ?? action;
      const err = this.safeApply(seat, action);
      if (err) {
        console.error(`[room ${this.code}] bot ${seat} action rejected: ${err}`, JSON.stringify(action));
        const fallback = this.safeAutopilot(seat);
        if (!fallback || this.safeApply(seat, fallback)) console.error(`[room ${this.code}] bot ${seat} is stuck`);
      }
      return;
    }
  }

  /** `apply` for timer-driven moves: an engine exception is reported as an error, not thrown. */
  private safeApply(seat: number, action: Action): string | null {
    try {
      return this.apply(seat, action);
    } catch (err) {
      console.error(`[room ${this.code}] seat ${seat} action crashed`, JSON.stringify(action), err);
      return 'crashed';
    }
  }

  private safeAutopilot(seat: number): Action | null {
    try {
      return this.game ? autopilotAction(viewFor(this.game, seat), seat) : null;
    } catch (err) {
      console.error(`[room ${this.code}] autopilot crashed for seat ${seat}`, err);
      return null;
    }
  }

  /** A decision window restarts whenever the set of owed decisions changes (new turn, new prompts). */
  private updateWindow(): void {
    const g = this.game;
    if (!g) return;
    const key = `${g.turn.n}:${g.phase}:${g.setup?.index ?? ''}:${g.pending.map((p) => `${p.kind}${p.seat}`).join(',')}`;
    if (key !== this.window.key) {
      this.window = { key, startedAt: this.now() };
      this.bonusMs = 0;
    }
  }

  private windowLimitMs(): number {
    const g = this.game!;
    const t = this.settings.turnTimer;
    // Bots don't mind waiting: the clock only runs while two or more people share the table.
    if (!t || this.seats.filter((s) => !s.isBot).length < 2) return Infinity;
    // Prompts (discards, robber…) and setup placements get a shorter window than a full turn.
    return (g.pending.length || g.phase === 'setup' ? Math.min(t, 45) : t) * 1000;
  }

  private deadline(): number | null {
    const g = this.game;
    if (!g || g.phase === 'ended' || this.status !== 'playing') return null;
    const humans = actorsFor(g).filter((i) => !this.seats[i].isBot);
    if (!humans.length) return null;
    const grace = this.deps.disconnectGraceMs ?? 20_000;
    let at = this.window.startedAt + this.windowLimitMs() + this.bonusMs;
    for (const i of humans) {
      const s = this.seats[i];
      if (s.sockets.size === 0) at = Math.min(at, s.left ? this.now() : Math.max(s.lastSeen, this.window.startedAt) + grace);
    }
    return Number.isFinite(at) ? at : null;
  }

  private startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => this.tick(), 1000);
    this.ticker.unref?.();
  }

  private stopTicker(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  /** Once per second: act for humans whose decision window expired or who are away. */
  tick(): void {
    const g = this.game;
    if (!g || g.phase === 'ended' || this.closed) return;
    const deadline = this.deadline();
    if (deadline === null || this.now() < deadline) return;
    const grace = this.deps.disconnectGraceMs ?? 20_000;
    const timedOut = this.now() >= this.window.startedAt + this.windowLimitMs() + this.bonusMs;
    for (const seat of actorsFor(g)) {
      const s = this.seats[seat];
      if (s.isBot) continue;
      const away = s.sockets.size === 0 && (s.left || this.now() - Math.max(s.lastSeen, this.window.startedAt) >= grace);
      if (!away && !timedOut) continue;
      const action = this.safeAutopilot(seat);
      if (action && !this.safeApply(seat, action)) return;
    }
  }

  // ── Live stats & admin tools ──────────────────────────────────────────────

  /** The match report so far, for anyone in the room: public information only until the game ends. */
  liveReport(socketId: string): GameReport {
    if (!this.sockets.has(socketId)) throw new UserError('You are not in this room');
    if (!this.game) throw new UserError('No game is running');
    return buildReport(this.game, { live: this.game.phase !== 'ended' });
  }

  /**
   * Admin tools for testing a running game (see `AdminGameCommand`). Server admins only; every change
   * is announced in the chat, can itself be undone, and leaves the game unrated. Returns what happened.
   */
  admin(socketId: string, cmd: AdminGameCommand): string {
    this.assertOpen();
    if (!this.deps.io.isAdmin?.(socketId)) throw new UserError('Only admins can do that');
    const g = this.game;
    if (this.status !== 'playing' || !g || g.phase === 'ended') throw new UserError('The game is not running');
    this.touch();
    switch (cmd?.type) {
      case 'undo': {
        const last = this.history.pop();
        if (!last) throw new UserError('Nothing to undo');
        const message = `An admin undid the last move (${last.label})`;
        this.replaceGame(last.state, message);
        return message;
      }
      case 'cards': {
        const seat = cmd.seat;
        if (!Number.isInteger(seat) || seat < 0 || seat >= g.players.length) throw new UserError('Unknown player');
        const allowed: readonly string[] = g.mode === 'ck' ? CARDS : RESOURCES;
        const next = structuredClone(g);
        const changed: string[] = [];
        for (const [card, n] of Object.entries(cmd.cards && typeof cmd.cards === 'object' ? cmd.cards : {})) {
          if (!allowed.includes(card)) throw new UserError(`Unknown card: ${card}`);
          if (!Number.isInteger(n) || Math.abs(n!) > 20) throw new UserError('Pick between -20 and 20 of each card');
          const c = card as Card;
          // Through the bank: a give takes what the bank has, a take what the hand has.
          const moved = n! > 0 ? Math.min(n!, next.bank[c]) : -Math.min(-n!, next.players[seat].hand[c]);
          if (!moved) continue;
          next.bank[c] -= moved;
          next.players[seat].hand[c] += moved;
          changed.push(`${moved > 0 ? '+' : ''}${moved} ${c}`);
        }
        if (!changed.length) throw new UserError('Nothing changed: the bank (or their hand) is out of those cards');
        const message = `An admin changed ${this.seats[seat]?.name ?? 'a player'}'s cards: ${changed.join(', ')}`;
        this.remember(g, `cards for ${this.seats[seat]?.name ?? 'a player'}`);
        this.replaceGame(next, message);
        return message;
      }
      case 'nextRoll': {
        const die = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 6;
        if (!die(cmd.red) || !die(cmd.yellow)) throw new UserError('Pick both dice (1 to 6)');
        if (cmd.event != null && (g.mode !== 'ck' || !EVENT_DIE.includes(cmd.event))) throw new UserError('Unknown event die face');
        const nextRoll = { red: cmd.red, yellow: cmd.yellow, ...(cmd.event ? { event: cmd.event } : {}) };
        // The chat says only that the dice were set, not to what: the roll stays a surprise for the table.
        this.replaceGame({ ...g, nextRoll }, 'An admin set the dice for the next roll');
        return `The next roll will be ${cmd.red} + ${cmd.yellow}${cmd.event ? ` (${cmd.event})` : ''}`;
      }
      default:
        throw new UserError('Unknown admin command');
    }
  }

  private adminPresent(): boolean {
    for (const sid of this.sockets.keys()) if (this.deps.io.isAdmin?.(sid)) return true;
    return false;
  }

  /** Keeps a state for the admins' undo, `label` naming the move that came after it. */
  private remember(state: GameState, label: string): void {
    this.history.push({ state, label });
    if (this.history.length > UNDO_DEPTH) this.history.shift();
  }

  /**
   * Swaps in an admin-edited game. Its seq moves past every event already stored (so new ones never
   * collide, and a restart restores this state from its snapshot instead of replaying what was
   * undone), the decision window starts afresh, and every client gets the whole view again (their
   * logs may hold events that no longer happened).
   */
  private replaceGame(next: GameState, message: string): void {
    const prev = this.game!;
    this.game = { ...next, seq: Math.max(prev.seq, next.seq) + 1, adminEdited: true };
    if (this.gameId) {
      this.snapshotSeq = this.game.seq;
      this.deps.persistence.snapshot(this.gameId, this.game);
    }
    this.system(message);
    this.window = { key: '', startedAt: this.now() };
    this.updateWindow();
    this.botPauseUntil = this.now() + ADMIN_BOT_PAUSE_MS;
    for (const sid of this.sockets.keys()) this.sendGame(sid, [], true);
    this.broadcastRoom();
    this.scheduleBots();
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  say(socketId: string, raw: string): void {
    const key = this.sockets.get(socketId);
    if (!key) throw new UserError('You are not in this room');
    const text = sanitizeChat(raw);
    if (!text) return;
    const seat = this.seats.find((s) => s.identityKey === key);
    const spectator = this.spectators.get(socketId);
    const name = seat?.name ?? `${spectator?.name ?? 'Spectator'} (watching)`;
    // The same message again from the same person within a few seconds is spam, not conversation.
    const last = this.lastSaid.get(key);
    if (last && last.text === text && this.now() - last.at < 10_000) throw new UserError('You just said that');
    this.lastSaid.set(key, { text, at: this.now() });
    this.pushChat({
      id: randomUUID(),
      at: this.now(),
      playerId: seat?.playerId ?? null,
      name,
      color: seat?.color,
      text,
    });
  }

  /** A seated player's quick reaction, flashed to everyone (not kept in the chat). */
  react(socketId: string, reaction: ReactionId): void {
    const key = this.sockets.get(socketId);
    const seat = key ? this.seats.find((s) => s.identityKey === key) : undefined;
    if (!seat) throw new UserError('Only players can react');
    const msg = { playerId: seat.playerId, reaction, at: this.now() };
    for (const sid of this.sockets.keys()) this.deps.io.send(sid, 'room:reaction', msg);
  }

  private system(text: string): void {
    this.pushChat({ id: randomUUID(), at: this.now(), playerId: null, name: '', text, system: true });
  }

  private pushChat(msg: ChatMessage): void {
    this.chat.push(msg);
    if (this.chat.length > CHAT_HISTORY) this.chat.splice(0, this.chat.length - CHAT_HISTORY);
    for (const sid of this.sockets.keys()) this.deps.io.send(sid, 'chat:message', msg);
  }

  // ── Broadcasting ──────────────────────────────────────────────────────────

  dto(socketId: string): RoomDTO {
    const key = this.sockets.get(socketId) ?? '';
    const seatIndex = this.seats.findIndex((s) => s.identityKey === key);
    return {
      code: this.code,
      gameId: this.gameId,
      status: this.status,
      settings: { ...this.settings },
      seats: this.seats.map((s) => ({
        playerId: s.playerId,
        name: s.name,
        color: s.color,
        knight: s.knight,
        cosmetics: s.cosmetics,
        avatarUrl: s.avatarUrl,
        isBot: s.isBot,
        isGuest: s.isGuest,
        isHost: s.identityKey !== null && s.identityKey === this.hostKey,
        connected: s.isBot || s.sockets.size > 0,
        autopilot: !s.isBot && this.status === 'playing' && (s.left || s.sockets.size === 0),
        isYou: s.identityKey === key,
      })),
      spectators: [...this.spectators.entries()].map(([sid, sp]) => ({ name: sp.name, isYou: sid === socketId })),
      you: {
        playerId: seatIndex >= 0 ? this.seats[seatIndex].playerId : null,
        seat: seatIndex >= 0 ? seatIndex : null,
        isHost: key === this.hostKey,
        isSpectator: this.spectators.has(socketId),
        ...(this.deps.io.isAdmin?.(socketId) ? { isAdmin: true } : {}),
      },
      deadline: this.deadline(),
      gameNumber: this.gameNumber,
    };
  }

  broadcastRoom(): void {
    for (const sid of this.sockets.keys()) {
      const dto = this.dto(sid);
      // Most game actions leave the room as it was: don't resend it with every move.
      const json = JSON.stringify(dto);
      if (this.roomSent.get(sid) === json) continue;
      this.roomSent.set(sid, json);
      this.deps.io.send(sid, 'room:state', dto);
    }
  }

  private viewerSeat(socketId: string): number | null {
    const i = this.seatIndexOf(socketId);
    return i >= 0 ? i : null;
  }

  /** Sends a socket its view; the log only in full when the socket lacks it (see `GameUpdate`). */
  private sendGame(socketId: string, events: GameEvent[], full = false, views?: Map<number | null, PlayerView>): void {
    if (!this.game || !this.gameId) return;
    const viewer = this.viewerSeat(socketId);
    // The end of the game reveals every secret in the log, so it goes out whole once more.
    const reveal = this.game.phase === 'ended';
    let whole = views?.get(viewer);
    if (!whole) {
      whole = viewFor(this.game, viewer);
      views?.set(viewer, whole);
    }
    const { log, ...view } = whole;
    const sendLog = full || reveal || !this.deps.io.logDeltas?.(socketId) || this.logSynced.get(socketId) !== this.gameId;
    this.logSynced.set(socketId, this.gameId);
    this.deps.io.send(socketId, 'game:state', { view: sendLog ? { ...view, log } : view, events: eventsFor(events, viewer, reveal) });
  }

  /** The client's log fell out of step with the updates: send everything again. */
  resync(socketId: string): void {
    if (this.sockets.has(socketId)) this.sendGame(socketId, [], true);
  }

  private forgetSocket(socketId: string): void {
    this.sockets.delete(socketId);
    this.spectators.delete(socketId);
    this.logSynced.delete(socketId);
    this.roomSent.delete(socketId);
  }

  private broadcastGame(events: GameEvent[]): void {
    // Spectators (and a player's extra tabs) share a view: work each one out once.
    const views = new Map<number | null, PlayerView>();
    for (const sid of this.sockets.keys()) this.sendGame(sid, events, false, views);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  close(reason: string): void {
    if (this.closed) return;
    this.closed = true;
    this.stopTicker();
    if (this.botTimer) clearTimeout(this.botTimer);
    for (const sid of this.sockets.keys()) {
      this.deps.io.send(sid, 'room:closed', reason);
      this.deps.io.detach(sid);
    }
    this.sockets.clear();
    this.logSynced.clear();
    this.roomSent.clear();
    // A game that can't go on anymore is recorded as abandoned, not left "playing" for good.
    if (this.status === 'playing' && this.gameId) this.deps.persistence.gameAbandoned(this.gameId);
    this.status = this.status === 'playing' ? 'finished' : this.status;
    this.deps.persistence.roomStatus({ ...this.persistRoom(), status: 'closed' });
  }

  /**
   * Server shutdown with the game still running: stop playing, but leave it open in storage so the
   * next server restores it when the players reconnect (their clients rejoin on their own).
   */
  suspend(): void {
    if (this.closed) return;
    this.system('The server is restarting. Your game will be back in a moment.');
    this.closed = true;
    this.stopTicker();
    if (this.botTimer) clearTimeout(this.botTimer);
  }

  /** Closes the room when nobody human is left in the lobby. */
  private closeIfAbandoned(): void {
    if (this.status === 'lobby' && !this.seats.some((s) => !s.isBot) && this.spectators.size === 0) this.close('Everyone left');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private touch(): void {
    this.lastActivity = this.now();
  }

  private assertOpen(): void {
    if (this.closed) throw new UserError('This room is closed');
  }

  private requireHost(socketId: string): void {
    if (this.sockets.get(socketId) !== this.hostKey) throw new UserError('Only the host can do that');
  }

  private seatOf(socketId: string): Seat | undefined {
    const key = this.sockets.get(socketId);
    return key ? this.seats.find((s) => s.identityKey === key) : undefined;
  }

  private seatIndexOf(socketId: string): number {
    const key = this.sockets.get(socketId);
    return key && !this.spectators.has(socketId) ? this.seats.findIndex((s) => s.identityKey === key) : -1;
  }

  private freeColor(preferred?: PlayerColor): PlayerColor {
    const used = new Set(this.seats.map((s) => s.color));
    if (preferred && isPlayerColor(preferred) && !used.has(preferred)) return preferred;
    return COLOR_ORDER.find((c) => !used.has(c)) ?? 'red';
  }

  persistRoom() {
    return { id: this.id, code: this.code, status: this.status, settings: { ...this.settings } };
  }

  persistGame() {
    return {
      gameId: this.gameId!,
      room: this.persistRoom(),
      seats: this.seats.map((s) => ({
        playerId: s.playerId,
        identityKey: s.identityKey,
        isBot: s.isBot,
        name: s.name,
        color: s.color,
        knight: s.knight,
      })),
      state: this.game!,
    };
  }
}

/** Flipped to true once the Cities & Knights engine is complete. */
export const CK_READY = true;
