/** Typed Socket.IO protocol shared by client and server. */
import type { Action, GameEvent, Mode, PlayerColor } from '@/engine/types';
import type { PlayerView } from '@/engine/view';
import type { KnightCustomization } from './knight';

/** The PRD's conceptual identity: the game never cares whether a player is a guest. */
export interface PlayerIdentity {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isGuest: boolean;
}

export interface RoomSettings {
  mode: Mode;
  maxPlayers: number;
  vpToWin: number;
  /** Seconds per turn; 0 disables the timer. */
  turnTimer: number;
  friendlyRobber: boolean;
  allowSpectators: boolean;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  mode: 'classic',
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
}

export interface SeatDTO {
  /** Public per-game player id (never an account id). */
  playerId: string;
  name: string;
  color: PlayerColor;
  knight: KnightCustomization;
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
  'game:action': (action: Action, ack: Ack) => void;
  'chat:send': (text: string, ack: Ack) => void;
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
  'room:closed': (reason: string) => void;
  'session:replaced': () => void;
}

/** Summary of the current browser identity, served by GET /api/session. */
export interface SessionInfo {
  kind: 'guest' | 'user' | 'none';
  displayName: string | null;
  avatarUrl: string | null;
  color: PlayerColor | null;
  knight: KnightCustomization | null;
  stats: { gamesPlayed: number; gamesWon: number } | null;
  auth: { google: boolean; discord: boolean };
  persistence: boolean;
}
