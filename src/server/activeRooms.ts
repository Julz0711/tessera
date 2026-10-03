/**
 * Tables the caller still holds a seat at, for the main menu's "rejoin". Live rooms come from
 * memory; running games not loaded since a restart come from the database (opening the room
 * restores them).
 */
import type { MapId, Mode } from '@/engine';
import { DEFAULT_ROOM_SETTINGS, type ActiveRoom, type RoomSettings } from '@/shared/protocol';
import type { Db } from './db';
import type { ServerIdentity } from './identity';
import { ABANDONED_SEAT, identityRefs } from './prismaPersistence';
import type { RoomManager } from './rooms';

/** Older unfinished games in the database are treated as abandoned. */
const RESTORE_WINDOW_MS = 2 * 86400_000;
const MAX_ROOMS = 3;

/**
 * Drops the caller's seat at `code` for good: a live room swaps in a bot, a game only in the database
 * is rewritten the same way (it comes back as a bot after a restart). False when they held no seat.
 */
export async function abandonRoom(identity: ServerIdentity, code: string, rooms: RoomManager, db: Db | null): Promise<boolean> {
  const room = await rooms.live(code);
  if (room) return room.abandon(identity.key);
  if (!db) return false;
  const { count } = await db.player.updateMany({
    where: { ...identityRefs(identity.key), isBot: false, game: { status: 'playing', room: { code, status: 'playing' } } },
    data: ABANDONED_SEAT,
  });
  // Someone may have opened the room meanwhile, and its restore may have read the seat before our
  // write: give it up in the live room too (a no-op when the restore already saw the bot).
  const restored = await rooms.live(code);
  if (restored) restored.abandon(identity.key);
  return count > 0;
}

export async function activeRoomsFor(identity: ServerIdentity, rooms: RoomManager, db: Db | null, now = Date.now()): Promise<ActiveRoom[]> {
  const out: (ActiveRoom & { at: number })[] = [];
  for (const room of rooms.rooms.values()) {
    if (room.closed || (room.status !== 'lobby' && room.status !== 'playing')) continue;
    const seat = room.seats.findIndex((s) => s.identityKey === identity.key);
    if (seat < 0) continue;
    const game = room.status === 'playing' ? room.game : null;
    out.push({
      code: room.code, status: room.status, mode: room.settings.mode, map: room.settings.map,
      players: room.seats.length, maxPlayers: room.settings.maxPlayers,
      turn: game?.phase === 'play' ? game.turn.n : null, yourTurn: !!game && game.phase !== 'ended' && game.turn.seat === seat,
      autopilot: room.seats[seat].left, at: room.lastActivity,
    });
  }
  if (db) {
    const games = await db.game.findMany({
      where: {
        status: 'playing', startedAt: { gte: new Date(now - RESTORE_WINDOW_MS) }, room: { status: 'playing' },
        players: { some: { ...identityRefs(identity.key), isBot: false } },
      },
      orderBy: { startedAt: 'desc' }, take: MAX_ROOMS,
      select: { startedAt: true, room: { select: { code: true, settings: true } }, _count: { select: { players: true } } },
    });
    for (const g of games) {
      // In memory means it's live (listed above) or over (left out on purpose).
      if (rooms.rooms.has(g.room.code)) continue;
      const settings = { ...DEFAULT_ROOM_SETTINGS, ...(g.room.settings as Partial<RoomSettings> | null) };
      out.push({
        code: g.room.code, status: 'playing', mode: settings.mode as Mode, map: settings.map as MapId,
        players: g._count.players, maxPlayers: settings.maxPlayers, turn: null, yourTurn: false, autopilot: false, at: g.startedAt.getTime(),
      });
    }
  }
  // Your turn first, then the most recently active.
  return out.sort((a, b) => Number(b.yourTurn) - Number(a.yourTurn) || b.at - a.at).slice(0, MAX_ROOMS).map(({ at: _, ...room }) => room);
}
