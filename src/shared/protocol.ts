/** Typed Socket.IO protocol shared by client and server. */
import type { Action, Card, DiceMode, EventFace, GameEvent, MapId, Mode, PlayerColor, ProgressCardType } from '@/engine/types';
import type { GameReport } from '@/engine/report';
import type { PlayerView } from '@/engine/view';
import type { Cosmetics, UnlockStats } from './cosmetics';
import type { KnightCustomization } from './knight';
import type { ReactionId } from './reactions';
import type { ModeRating, RatingPool } from './ratings';

/** The PRD's conceptual identity: the game never cares whether a player is a guest. */
export interface PlayerIdentity {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isGuest: boolean;
}

export interface RoomSettings {
  mode: Mode;
  map: MapId;
  maxPlayers: number;
  vpToWin: number;
  /** Seconds per turn; 0 disables the timer. */
  turnTimer: number;
  friendlyRobber: boolean;
  allowSpectators: boolean;
  /** Black Forest: gold fields in the fog (off for new rooms). Rooms saved before the toggle lack it (= on). */
  gold?: boolean;
  /** Random or balanced (bag-drawn) dice. Rooms saved before the option lack it (= random). */
  dice?: DiceMode;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  mode: 'classic',
  map: 'standard',
  maxPlayers: 4,
  vpToWin: 10,
  // Players who go quiet without disconnecting would otherwise hold the table up for good.
  turnTimer: 120,
  friendlyRobber: false,
  allowSpectators: true,
  gold: false,
  dice: 'random',
};

export const TURN_TIMER_OPTIONS = [0, 60, 90, 120, 180] as const;

/** Returned by room:join when the caller must pick a name/color before taking a seat. */
export const ERR_NEEDS_PROFILE = 'Choose a name and color first';

export interface JoinProfile {
  name: string;
  color: PlayerColor;
  knight: KnightCustomization;
  /** Frame and title; the server keeps only what this player has unlocked. */
  cosmetics?: Cosmetics;
}

export interface SeatDTO {
  /** Public per-game player id (never an account id). */
  playerId: string;
  name: string;
  color: PlayerColor;
  knight: KnightCustomization;
  cosmetics: Cosmetics;
  avatarUrl?: string;
  isBot: boolean;
  isGuest: boolean;
  isHost: boolean;
  connected: boolean;
  /** A bot is currently acting for this (disconnected or departed) human. */
  autopilot: boolean;
  isYou: boolean;
}

export interface RoomDTO {
  gameId?: string | null;
  code: string;
  status: 'lobby' | 'playing' | 'finished';
  settings: RoomSettings;
  seats: SeatDTO[];
  spectators: { name: string; isYou: boolean }[];
  /** `isAdmin`: a server admin, who gets the in-game admin tools (see `AdminGameCommand`). */
  you: { playerId: string | null; seat: number | null; isHost: boolean; isSpectator: boolean; isAdmin?: boolean };
  /** Epoch ms when the current decision window times out (turn timer / autopilot), if any. */
  deadline: number | null;
  gameNumber: number;
}

export interface ChatMessage {
  id: string;
  at: number;
  playerId: string | null;
  name: string;
  color?: PlayerColor;
  text: string;
  system?: boolean;
}

/**
 * In-game admin tools, for testing on a live server (admins only; every use is announced in the chat
 * and the game is no longer rated): undo the last move, give or take cards (to and from the bank:
 * negative counts take), hand out a progress card (C&K, taken from its deck), and set the dice of
 * the next roll.
 */
export type AdminGameCommand =
  | { type: 'undo' }
  | { type: 'cards'; seat: number; cards: Partial<Record<Card, number>> }
  | { type: 'progress'; seat: number; card: ProgressCardType }
  | { type: 'nextRoll'; red: number; yellow: number; event?: EventFace | null };

export type AckResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };
export type Ack<T extends object = object> = (res: AckResult<T>) => void;

export interface ClientToServerEvents {
  'room:create': (p: { profile: JoinProfile; settings?: Partial<RoomSettings> }, ack: Ack<{ code: string }>) => void;
  'room:join': (p: { code: string; profile?: JoinProfile; spectate?: boolean }, ack: Ack<{ room: RoomDTO }>) => void;
  'room:leave': (ack: Ack) => void;
  'room:settings': (p: Partial<RoomSettings>, ack: Ack) => void;
  'room:profile': (p: Partial<JoinProfile>, ack: Ack) => void;
  'room:addBot': (ack: Ack) => void;
  'room:removeSeat': (playerId: string, ack: Ack) => void;
  'room:start': (ack: Ack) => void;
  'room:rematch': (ack: Ack) => void;
  'room:toLobby': (ack: Ack) => void;
  'game:action': (action: Action, ack: Ack) => void;
  'chat:send': (text: string, ack: Ack) => void;
  'room:react': (reaction: ReactionId, ack: Ack) => void;
  /** The client's log no longer lines up with the updates (see `GameUpdate`): send the whole view again. */
  'game:sync': () => void;
  /** The match report so far, with nothing hidden in it (the full one once the game is over). */
  'game:stats': (ack: Ack<{ report: GameReport }>) => void;
  /** Admin tools (see `AdminGameCommand`); refused unless the caller is a server admin. */
  'admin:game': (cmd: AdminGameCommand, ack: Ack<{ message: string }>) => void;
}

export interface GameUpdate {
  /**
   * The viewer's game. Mid-game `log` is usually left out: the client appends `events` to the log it
   * already holds (the log is most of the view, and it only ever grows by these events). A view whose
   * `seq` doesn't follow on from the client's must be re-requested with `game:sync`.
   */
  view: Omit<PlayerView, 'log'> & { log?: PlayerView['log'] };
  /** Events produced by the latest action (redacted for this viewer), for animations and toasts. */
  events: GameEvent[];
}

export interface ServerToClientEvents {
  'room:state': (room: RoomDTO) => void;
  'game:state': (update: GameUpdate) => void;
  'chat:message': (message: ChatMessage) => void;
  'chat:history': (messages: ChatMessage[]) => void;
  /** A friend invites you to their room. */
  'friend:invite': (invite: { from: string; roomCode: string }) => void;
  /** A player's quick reaction (not kept in the chat). */
  'room:reaction': (r: { playerId: string; reaction: ReactionId; at: number }) => void;
  'room:closed': (reason: string) => void;
  'session:replaced': () => void;
}

export interface ProfilePreferences {
  view?: '3d' | '2d';
  graphics?: 'high' | 'low';
  volume?: number;
  language?: 'en';
  /** Use the OAuth picture as avatar (true) or the knight portrait (false). */
  useProviderAvatar?: boolean;
  /** The game settings below follow a signed-in player across devices (see client/prefs.ts, which validates them again). */
  buildHints?: boolean;
  confirmBuilds?: boolean;
  boardScale?: 'small' | 'medium' | 'large';
  motion?: 'system' | 'full' | 'reduced';
  boardTheme?: string;
  hudScale?: 'small' | 'medium' | 'large';
  hudLayout?: Record<string, { slot: string; order: number }>;
  sfxVolume?: Record<string, number>;
  weather?: boolean;
  autoDeclineTrades?: boolean;
  musicVolume?: number;
}

export interface GameSummary {
  gameId: string;
  mode: Mode;
  startedAt: string;
  endedAt: string | null;
  status: string;
  won: boolean;
  rank: number | null;
  finalVp: number | null;
  /** Rating change from this game (rated games only). */
  ratingDelta: number | null;
  ratingPool?: string | null;
  ratingBefore?: number | null;
  ratingAfter?: number | null;
  map?: string;
  turns?: number;
  hasReport?: boolean;
  players: { name: string; color: PlayerColor; vp: number | null; isBot: boolean; isYou: boolean; won: boolean }[];
}

/** GET /api/profile — only ever returned to the identity itself. */
export interface ProfileData {
  ratings: ModeRating[];
  session: SessionInfo;
  preferences: ProfilePreferences;
  favoriteMode: RatingPool | null;
  providers: string[];
  history: GameSummary[];
  /** Signed-in players: rating and leaderboard place (null place until the first rated game). */
  rating: { rating: number; ratedGames: number; place: number | null } | null;
  /** Listed in ADMIN_EMAILS: shows the link to /admin. */
  isAdmin: boolean;
}

export interface ProfileUpdate {
  displayName?: string;
  color?: PlayerColor;
  knight?: KnightCustomization;
  cosmetics?: Cosmetics;
  preferences?: ProfilePreferences;
}

/** A table you still hold a seat at (GET /api/rooms/active), for the main menu's "rejoin". */
export interface ActiveRoom {
  code: string;
  status: 'lobby' | 'playing';
  mode: Mode;
  map: MapId;
  /** Humans and bots seated / seats available. */
  players: number;
  maxPlayers: number;
  /** Game turn number; null in the lobby, during setup, or when not loaded yet (after a server restart). */
  turn: number | null;
  yourTurn: boolean;
  /** You left mid-game and autopilot is playing your seat. */
  autopilot: boolean;
}

/** Summary of the current browser identity, served by GET /api/session. */
export interface SessionInfo {
  kind: 'guest' | 'user' | 'none';
  displayName: string | null;
  avatarUrl: string | null;
  color: PlayerColor | null;
  knight: KnightCustomization | null;
  stats: { gamesPlayed: number; gamesWon: number } | null;
  /** Chosen frame/title, and what counts towards unlocking more (null without a database). */
  cosmetics: Cosmetics | null;
  unlocks: UnlockStats | null;
  auth: { google: boolean; discord: boolean };
  persistence: boolean;
}

// ── Friends & leaderboard ───────────────────────────────────────────────────

export type FriendStatus = 'offline' | 'online' | 'lobby' | 'playing';

/** Another player as friends and the leaderboard see them. `code` is their public friend code. */
export interface PlayerCard {
  code: string;
  name: string;
  color: PlayerColor;
  knight: KnightCustomization;
  avatarUrl: string | null;
  cosmetics: Cosmetics;
  rating: number;
  ratedGames: number;
}

export interface FriendInfo extends PlayerCard {
  status: FriendStatus;
  /** Their room (friends only), so you can join them. */
  roomCode: string | null;
}

/** Read-only profile shared with accepted friends. No account or preference data. */
export interface FriendProfileData {
  ratings: ModeRating[];
  headToHead: { games: number; yourWins: number; theirWins: number };
  friend: FriendInfo;
  stats: { gamesPlayed: number; gamesWon: number };
  recentGames: Pick<GameSummary, 'mode' | 'map' | 'endedAt' | 'startedAt' | 'won' | 'rank' | 'finalVp' | 'ratingDelta' | 'ratingPool'>[];
}

export interface FriendsData {
  /** False without a database or when not signed in: friends need an account. */
  enabled: boolean;
  myCode: string | null;
  friends: FriendInfo[];
  incoming: PlayerCard[];
  outgoing: PlayerCard[];
  /** Signed-in players from your recent games who aren't friends yet. */
  recent: PlayerCard[];
}

export interface LeaderboardEntry extends PlayerCard {
  isFriend?: boolean;
  place: number;
  gamesWon: number;
  isYou: boolean;
}

export interface LeaderboardData {
  pool?: RatingPool;
  scope?: 'world' | 'friends';
  signInRequired?: boolean;
  page?: number;
  total?: number;
  pages?: number;
  enabled: boolean;
  entries: LeaderboardEntry[];
  /** Your own row when you're rated but not in the top list. */
  you: LeaderboardEntry | null;
}

export interface HistoryData {
  games: GameSummary[];
  nextCursor: string | null;
  summary: { games: number; wins: number; averageVp: number | null; averagePlace: number | null };
}
