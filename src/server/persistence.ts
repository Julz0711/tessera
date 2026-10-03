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
  /**
   * A player gave up their seat for good: a bot plays it from now on (also after a restart). The seat
   * stays theirs on record, so the game still counts for them (as a forfeit) when it ends.
   */
  seatAbandoned(gameId: string, playerId: string): void;
  gameEnded(game: PersistGame): void;
  /** The room closed before the game ended (everyone left, or it expired): it will never finish. */
  gameAbandoned(gameId: string): void;
}

export const noopPersistence: Persistence = {
  enabled: false,
  roomCreated() {},
  roomStatus() {},
  gameStarted() {},
  gameAction() {},
  snapshot() {},
  seatAbandoned() {},
  gameEnded() {},
  gameAbandoned() {},
};
