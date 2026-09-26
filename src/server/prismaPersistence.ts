/**
 * Durable storage with Prisma. Every write is queued per room so rows land in order, and nothing
 * here ever blocks or fails the live game — errors are logged and the in-memory game continues.
 */
import { applyAction, victoryPoints, type Action, type GameEvent, type GameState } from '@/engine';
import { clampCosmetics, type Cosmetics } from '@/shared/cosmetics';
import { sanitizeKnight } from '@/shared/knight';
import type { JoinProfile, RoomSettings } from '@/shared/protocol';
import type { Db } from './db';
import type { Persistence, PersistGame, PersistRoom, PersistSeat } from './persistence';
import { START_RATING, placesFrom, ratingChanges } from './rating';

const GUEST_TTL_MS = 30 * 86400_000;

/** Plain JSON (drops undefined), as Prisma Json columns expect. */
function json<T>(value: T): never {
  return JSON.parse(JSON.stringify(value)) as never;
}

function identityRefs(key: string | null): { userId?: string; guestSessionId?: string } {
  if (!key) return {};
  if (key.startsWith('u:')) return { userId: key.slice(2) };
  if (key.startsWith('g:')) return { guestSessionId: key.slice(2) };
  return {};
}

export interface RestoredRoom {
  id: string;
  code: string;
  settings: RoomSettings;
  gameId: string;
  gameNumber: number;
  state: GameState;
  /** `cosmetics`: the frame and title the player saved, when they saved one. */
  seats: (PersistSeat & { cosmetics?: Cosmetics })[];
}

export interface DurablePersistence extends Persistence {
  rememberProfile(identityKey: string, profile: JoinProfile): void;
  restoreRoom(code: string): Promise<RestoredRoom | null>;
  /** Resolves once every queued write has been attempted. */
  flush(): Promise<void>;
}

export function createPrismaPersistence(db: Db): DurablePersistence {
  const queues = new Map<string, Promise<unknown>>();
  const gameRoom = new Map<string, string>();

  const enqueue = (key: string, label: string, job: () => Promise<unknown>) => {
    const prev = queues.get(key) ?? Promise.resolve();
    const next = prev.then(job).catch((err: unknown) => console.error(`[db] ${label} failed`, err));
    queues.set(key, next);
    void next.finally(() => {
      if (queues.get(key) === next) queues.delete(key);
    });
  };

  const upsertGuest = (guestId: string, profile?: { name: string; color: string; knight: unknown }) =>
    db.guestSession.upsert({
      where: { id: guestId },
      create: {
        id: guestId,
        expiresAt: new Date(Date.now() + GUEST_TTL_MS),
        displayName: profile?.name,
        color: profile?.color,
        knight: profile ? json(profile.knight) : undefined,
      },
      update: profile ? { displayName: profile.name, color: profile.color, knight: json(profile.knight), lastSeenAt: new Date() } : {},
    });

  /**
   * Upsert isn't atomic: a room's queue and the guest's own queue can both create the same new
   * guest at once, and the loser gets a unique violation. The row exists by then, so one retry
   * takes the update path.
   */
  const ensureGuest = async (guestId: string, profile?: { name: string; color: string; knight: unknown }) => {
    try {
      return await upsertGuest(guestId, profile);
    } catch (err) {
      if ((err as { code?: string }).code !== 'P2002') throw err;
      return upsertGuest(guestId, profile);
    }
  };

  return {
    enabled: true,

    async flush() {
      while (queues.size) await Promise.allSettled([...queues.values()]);
    },

    roomCreated(room: PersistRoom) {
      enqueue(room.id, 'room create', () =>
        db.room.create({ data: { id: room.id, code: room.code, status: room.status, settings: json(room.settings) } }),
      );
    },

    roomStatus(room: PersistRoom) {
      enqueue(room.id, 'room update', () =>
        db.room.update({ where: { id: room.id }, data: { status: room.status, settings: json(room.settings) } }),
      );
    },

    gameStarted(game: PersistGame) {
      gameRoom.set(game.gameId, game.room.id);
      enqueue(game.room.id, 'game start', async () => {
        await db.game.create({
          data: { id: game.gameId, roomId: game.room.id, mode: game.state.mode, status: 'playing', settings: json(game.room.settings) },
        });
        for (const [seat, s] of game.seats.entries()) {
          const refs = identityRefs(s.identityKey);
          if (refs.guestSessionId) await ensureGuest(refs.guestSessionId);
          await db.player.create({
            data: {
              id: s.playerId,
              gameId: game.gameId,
              seat,
              ...refs,
              isBot: s.isBot,
              displayName: s.name,
              color: s.color,
              knightCustomization: json(s.knight),
            },
          });
        }
        await db.gameSnapshot.create({ data: { gameId: game.gameId, seq: game.state.seq, state: json(game.state) } });
      });
    },

    gameAction(gameId: string, seq: number, playerId: string | null, action: Action, events: GameEvent[]) {
      const roomId = gameRoom.get(gameId);
      if (!roomId) return;
      enqueue(roomId, 'game event', () =>
        db.gameEvent.create({ data: { gameId, seq, playerId, type: action.type, payload: json({ action, events }) } }),
      );
    },

    snapshot(gameId: string, state: GameState) {
      const roomId = gameRoom.get(gameId);
      if (!roomId) return;
      enqueue(roomId, 'snapshot', () =>
        db.gameSnapshot.create({ data: { gameId, seq: state.seq, state: json(state) } }),
      );
    },

    gameEnded(game: PersistGame) {
      const state = game.state;
      enqueue(game.room.id, 'game end', async () => {
        const winner = state.winner;
        const vps = game.seats.map((_, seat) => victoryPoints(state, seat, true));
        const order = vps.map((vp, seat) => ({ vp, seat })).sort((a, b) => b.vp - a.vp);
        await db.game.update({
          where: { id: game.gameId },
          data: {
            status: 'finished',
            winnerPlayerId: winner !== null ? game.seats[winner].playerId : null,
            endedAt: new Date(),
            turns: state.turn.n,
          },
        });
        for (const [seat, s] of game.seats.entries()) {
          const won = seat === winner;
          await db.player.update({
            where: { id: s.playerId },
            data: { finalVp: vps[seat], rank: order.findIndex((o) => o.seat === seat) + 1, won },
          });
          const refs = identityRefs(s.identityKey);
          const inc = { gamesPlayed: { increment: 1 }, gamesWon: { increment: won ? 1 : 0 } };
          if (refs.userId) {
            await db.profile.upsert({
              where: { userId: refs.userId },
              create: { userId: refs.userId, displayName: s.name, gamesPlayed: 1, gamesWon: won ? 1 : 0 },
              update: inc,
            });
          } else if (refs.guestSessionId) {
            await db.guestSession.update({ where: { id: refs.guestSessionId }, data: inc });
          }
        }

        // Rating: signed-in players only, and only when at least two of them played.
        const places = placesFrom(vps, winner);
        const rated = game.seats
          .map((s, seat) => ({ seat, playerId: s.playerId, userId: s.isBot ? null : identityRefs(s.identityKey).userId }))
          .filter((r): r is { seat: number; playerId: string; userId: string } => !!r.userId);
        if (rated.length >= 2) {
          const profiles = await db.profile.findMany({ where: { userId: { in: rated.map((r) => r.userId) } } });
          const byUser = new Map(profiles.map((p) => [p.userId, p]));
          const deltas = ratingChanges(
            rated.map((r) => ({ rating: byUser.get(r.userId)?.rating ?? START_RATING, games: byUser.get(r.userId)?.ratedGames ?? 0, place: places[r.seat] })),
          );
          for (const [i, r] of rated.entries()) {
            await db.profile.update({ where: { userId: r.userId }, data: { rating: { increment: deltas[i] }, ratedGames: { increment: 1 } } });
            await db.player.update({ where: { id: r.playerId }, data: { ratingDelta: deltas[i] } });
          }
        }
      });
    },

    rememberProfile(identityKey: string, profile: JoinProfile) {
      const refs = identityRefs(identityKey);
      if (!refs.guestSessionId) return;
      const guestId = refs.guestSessionId;
      enqueue(`guest:${guestId}`, 'guest profile', () =>
        ensureGuest(guestId, { name: profile.name, color: profile.color, knight: sanitizeKnight(profile.knight) }),
      );
    },

    /** Rebuilds an in-progress game after a restart: latest snapshot + replay of later actions. */
    async restoreRoom(code: string): Promise<RestoredRoom | null> {
      const room = await db.room.findUnique({ where: { code } });
      if (!room || room.status !== 'playing') return null;
      const games = await db.game.findMany({ where: { roomId: room.id }, orderBy: { startedAt: 'asc' }, select: { id: true, status: true } });
      const current = games.at(-1);
      if (!current || current.status !== 'playing') return null;
      const [snapshot, players] = await Promise.all([
        db.gameSnapshot.findFirst({ where: { gameId: current.id }, orderBy: { seq: 'desc' } }),
        db.player.findMany({ where: { gameId: current.id }, orderBy: { seat: 'asc' } }),
      ]);
      if (!snapshot || !players.length) return null;
      let state = snapshot.state as unknown as GameState;
      const events = await db.gameEvent.findMany({ where: { gameId: current.id, seq: { gt: snapshot.seq } }, orderBy: { seq: 'asc' } });
      for (const ev of events) {
        const seat = players.findIndex((p) => p.id === ev.playerId);
        const { action } = ev.payload as unknown as { action: Action };
        const result = seat >= 0 ? applyAction(state, seat, action) : null;
        if (!result?.ok) {
          console.warn(`[db] replay stopped at seq ${ev.seq}`);
          break;
        }
        state = result.state;
      }
      gameRoom.set(current.id, room.id);
      // Frames and titles aren't stored per game: bring back each player's saved choice.
      const userIds = players.flatMap((p) => (p.userId ? [p.userId] : []));
      const guestIds = players.flatMap((p) => (p.guestSessionId ? [p.guestSessionId] : []));
      const [profiles, guests] = await Promise.all([
        db.profile.findMany({ where: { userId: { in: userIds } }, select: { userId: true, cosmetics: true, gamesPlayed: true, gamesWon: true, rating: true, ratedGames: true } }),
        db.guestSession.findMany({ where: { id: { in: guestIds } }, select: { id: true, cosmetics: true, gamesPlayed: true, gamesWon: true } }),
      ]);
      const saved = new Map<string, Cosmetics>();
      for (const p of profiles) {
        if (p.cosmetics) saved.set(`u:${p.userId}`, clampCosmetics(p.cosmetics, { gamesPlayed: p.gamesPlayed, gamesWon: p.gamesWon, rating: p.ratedGames > 0 ? p.rating : null }));
      }
      for (const g of guests) {
        if (g.cosmetics) saved.set(`g:${g.id}`, clampCosmetics(g.cosmetics, { gamesPlayed: g.gamesPlayed, gamesWon: g.gamesWon, rating: null }));
      }
      return {
        id: room.id,
        code: room.code,
        settings: room.settings as unknown as RoomSettings,
        gameId: current.id,
        gameNumber: games.length,
        state,
        seats: players.map((p) => {
          const identityKey = p.userId ? `u:${p.userId}` : p.guestSessionId ? `g:${p.guestSessionId}` : null;
          return {
            playerId: p.id,
            identityKey,
            isBot: p.isBot,
            name: p.displayName,
            color: p.color,
            knight: sanitizeKnight(p.knightCustomization),
            cosmetics: identityKey ? saved.get(identityKey) : undefined,
          };
        }),
      };
    },
  };
}
