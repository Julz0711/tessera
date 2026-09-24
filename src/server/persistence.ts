import type { Action, GameEvent, GameState } from '@/engine';
import type { RoomSettings } from '@/shared/protocol';

/** Seat info the persistence layer needs (identity keys never leave the server). */
export interface PersistSeat {
  playerId: string;
  identityKey: string | null;
  isBot: boolean;
  name: string;
  color: string;
  knight: unknown;
}

export interface PersistRoom {
  id: string;
  code: string;
  status: string;
  settings: RoomSettings;
}

export interface PersistGame {
  gameId: string;
  room: PersistRoom;
  seats: PersistSeat[];
  state: GameState;
}

/** Optional durable storage. The in-memory game never waits on it; failures are logged only. */
export interface Persistence {
  readonly enabled: boolean;
  roomCreated(room: PersistRoom): void;
  roomStatus(room: PersistRoom): void;
  gameStarted(game: PersistGame): void;
  gameAction(gameId: string, seq: number, playerId: string | null, action: Action, events: GameEvent[]): void;
  snapshot(gameId: string, state: GameState): void;
  gameEnded(game: PersistGame): void;
}

export const noopPersistence: Persistence = {
  enabled: false,
  roomCreated() {},
  roomStatus() {},
  gameStarted() {},
  gameAction() {},
  snapshot() {},
  gameEnded() {},
};
