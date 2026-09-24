import { randomInt } from 'node:crypto';
import type { RoomSettings } from '@/shared/protocol';
import type { ServerIdentity } from './identity';
import { noopPersistence, type Persistence } from './persistence';
import type { DurablePersistence } from './prismaPersistence';
import { Room, type RoomIO } from './room';

/** Unambiguous alphabet (no I/O/0/1): 32^8 ≈ 1.1·10¹² possible codes. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;

export function normalizeCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== CODE_LENGTH || [...code].some((c) => !CODE_ALPHABET.includes(c))) return null;
  return code;
}

export interface ManagerOptions {
  io: RoomIO;
  persistence?: Persistence;
  botDelayScale?: number;
  disconnectGraceMs?: number;
  /** Idle time before an unattended room is removed. */
  idleLobbyMs?: number;
  idleGameMs?: number;
}

export class RoomManager {
  readonly rooms = new Map<string, Room>();
  private sweeper: ReturnType<typeof setInterval>;

  constructor(private readonly opts: ManagerOptions) {
    this.sweeper = setInterval(() => this.sweep(), 60_000);
    this.sweeper.unref?.();
  }

  create(host: ServerIdentity, settings?: Partial<RoomSettings>): Room {
    let code: string;
    do {
      code = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
    } while (this.rooms.has(code));
    const room = new Room(code, host, settings, {
      io: this.opts.io,
      persistence: this.opts.persistence ?? noopPersistence,
      botDelayScale: this.opts.botDelayScale,
      disconnectGraceMs: this.opts.disconnectGraceMs,
    });
    this.rooms.set(code, room);
    return room;
  }

  get(code: unknown): Room | undefined {
    const normalized = normalizeCode(code);
    const room = normalized ? this.rooms.get(normalized) : undefined;
    return room && !room.closed ? room : undefined;
  }

  /** After a restart, brings a running game back from the database (if persistence is on). */
  async restore(code: unknown): Promise<Room | undefined> {
    const normalized = normalizeCode(code);
    const persistence = this.opts.persistence;
    if (!normalized || !persistence || !('restoreRoom' in persistence)) return undefined;
    const existing = this.get(normalized);
    if (existing) return existing;
    const pending = this.restoring.get(normalized) ?? this.doRestore(normalized, persistence as DurablePersistence);
    this.restoring.set(normalized, pending);
    try {
      return await pending;
    } finally {
      this.restoring.delete(normalized);
    }
  }

  private restoring = new Map<string, Promise<Room | undefined>>();

  private async doRestore(code: string, persistence: DurablePersistence): Promise<Room | undefined> {
    try {
      const data = await persistence.restoreRoom(code);
      if (!data) return undefined;
      const room = Room.restore(data, {
        io: this.opts.io,
        persistence,
        botDelayScale: this.opts.botDelayScale,
        disconnectGraceMs: this.opts.disconnectGraceMs,
      });
      this.rooms.set(code, room);
      console.log(`[rooms] restored ${code} from the database`);
      return room;
    } catch (err) {
      console.error('[rooms] restore failed', err);
      return undefined;
    }
  }

  /** Drops closed rooms and rooms nobody has touched for a while. */
  sweep(now = Date.now()): void {
    const idleLobby = this.opts.idleLobbyMs ?? 30 * 60_000;
    const idleGame = this.opts.idleGameMs ?? 3 * 60 * 60_000;
    for (const [code, room] of this.rooms) {
      const idle = now - room.lastActivity;
      const limit = room.status === 'lobby' ? idleLobby : idleGame;
      if (room.closed) this.rooms.delete(code);
      else if (!room.hasConnectedHumans() && idle > limit) {
        room.close('This room expired');
        this.rooms.delete(code);
      }
    }
  }

  dispose(): void {
    clearInterval(this.sweeper);
    for (const room of this.rooms.values()) room.close('Server shutting down');
    this.rooms.clear();
  }
}
