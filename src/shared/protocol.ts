/** Typed Socket.IO protocol shared by client and server. */
import type { Action, GameEvent, MapId, Mode, PlayerColor } from '@/engine/types';
import type { PlayerView } from '@/engine/view';
import type { Cosmetics, UnlockStats } from './cosmetics';
import type { KnightCustomization } from './knight';
import type { ReactionId } from './reactions';

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
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  mode: 'classic',
  map: 'standard',
  maxPlayers: 4,
  vpToWin: 10,
  turnTimer: 0,
  friendlyRobber: false,
  allowSpectators: true,
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
  code: string;
  status: 'lobby' | 'playing' | 'finished';
  settings: RoomSettings;
  seats: SeatDTO[];
  spectators: { name: string; isYou: boolean }[];
  you: { playerId: string | null; seat: number | null; isHost: boolean; isSpectator: boolean };
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
}

export interface GameUpdate {
  view: PlayerView;
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
  players: { name: string; color: PlayerColor; vp: number | null; isBot: boolean; isYou: boolean; won: boolean }[];
}

/** GET /api/profile — only ever returned to the identity itself. */
export interface ProfileData {
  session: SessionInfo;
  preferences: ProfilePreferences;
  favoriteMode: Mode | null;
  providers: string[];
  history: GameSummary[];
  /** Signed-in players: rating and leaderboard place (null place until the first rated game). */
  rating: { rating: number; ratedGames: number; place: number | null } | null;
}

export interface ProfileUpdate {
  displayName?: string;
  color?: PlayerColor;
  knight?: KnightCustomization;
  cosmetics?: Cosmetics;
  preferences?: ProfilePreferences;
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
  place: number;
  gamesWon: number;
  isYou: boolean;
}

export interface LeaderboardData {
  enabled: boolean;
  entries: LeaderboardEntry[];
  /** Your own row when you're rated but not in the top list. */
  you: LeaderboardEntry | null;
}
