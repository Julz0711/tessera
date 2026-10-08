import type { IncomingMessage, Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { Action } from '@/engine';
import type { ClientToServerEvents, JoinProfile, RoomSettings, ServerToClientEvents } from '@/shared/protocol';
import { resolveIdentity, type ServerIdentity } from './identity';
import type { Persistence } from './persistence';
import type { DurablePersistence } from './prismaPersistence';
import { limits } from './rateLimit';
import { UserError, type Room, type RoomIO } from './room';
import { RoomManager } from './rooms';
import { isReactionId } from '@/shared/reactions';
import { isBoardPoint } from '@/shared/cursors';
import { setPresenceSource } from './presence';
import { cosmeticStateFor, seatCosmetics } from './cosmetics';
import { NO_UNLOCKS } from '@/shared/cosmetics';
import { isAdminIdentity } from './admin';

export interface SocketData {
  identity: ServerIdentity;
  ip: string;
  roomCode: string | null;
  /** The client keeps the game log itself and takes only new events (see `GameUpdate`). */
  logDeltas: boolean;
  /** Cosmetics state, refreshed whenever the socket creates or joins a room. */
  cosmetics: Awaited<ReturnType<typeof cosmeticStateFor>>;
  /** A server admin (see `isAdminIdentity`): gets the in-game admin tools. Checked once per connection. */
  isAdmin: boolean;
}

export type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export interface RealtimeOptions {
  persistence?: Persistence;
  botDelayScale?: number;
  disconnectGraceMs?: number;
}

/** Rejects cross-site WebSocket hijacking: browsers always send Origin, and it must be ours. */
export function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const o = new URL(origin);
    if (o.host === req.headers.host) return true;
    const allowed = [process.env.APP_URL, ...(process.env.ALLOWED_ORIGINS ?? '').split(',')]
      .map((s) => s?.trim())
      .filter((s): s is string => !!s)
      .map((s) => new URL(s).origin);
    return allowed.includes(o.origin);
  } catch {
    return false;
  }
}

export function clientIp(req: { headers: IncomingMessage['headers']; address?: string }, fallback = 'unknown'): string {
  if (process.env.TRUST_PROXY === '1') {
    const fwd = req.headers['x-forwarded-for'];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.address ?? fallback;
}

function reply(ack: unknown, fn: () => object | void): void {
  const send = typeof ack === 'function' ? (ack as (r: unknown) => void) : () => {};
  try {
    const result = fn();
    send({ ok: true, ...(result ?? {}) });
  } catch (err) {
    if (err instanceof UserError) send({ ok: false, error: err.message });
    else {
      console.error('[io] handler error', err);
      send({ ok: false, error: 'Something went wrong' });
    }
  }
}

export function attachRealtime(server: HttpServer, opts: RealtimeOptions = {}): { io: IO; manager: RoomManager } {
  const io: IO = new Server(server, {
    destroyUpgrade: false,
    maxHttpBufferSize: 100_000,
    // Game views are repetitive JSON: compressed they shrink about sixfold.
    perMessageDeflate: { threshold: 1024 },
    pingInterval: 20_000,
    pingTimeout: 25_000,
    allowRequest: (req, cb) => cb(null, originAllowed(req)),
  });

  const roomIO: RoomIO = {
    send: (sid, event, ...args) => {
      io.sockets.sockets.get(sid)?.emit(event, ...args);
    },
    sendVolatile: (sid, event, ...args) => {
      io.sockets.sockets.get(sid)?.volatile.emit(event, ...args);
    },
    detach: (sid) => {
      const s = io.sockets.sockets.get(sid);
      if (s) s.data.roomCode = null;
    },
    logDeltas: (sid) => io.sockets.sockets.get(sid)?.data.logDeltas === true,
    isAdmin: (sid) => io.sockets.sockets.get(sid)?.data.isAdmin === true,
  };
  const manager = new RoomManager({
    io: roomIO,
    persistence: opts.persistence,
    botDelayScale: opts.botDelayScale,
    disconnectGraceMs: opts.disconnectGraceMs,
  });

  io.use(async (socket, next) => {
    try {
      const identity = await resolveIdentity(socket.handshake.headers.cookie);
      if (!identity) return next(new Error('NO_IDENTITY'));
      socket.data.identity = identity;
      socket.data.ip = clientIp({ headers: socket.handshake.headers, address: socket.handshake.address });
      socket.data.roomCode = null;
      socket.data.logDeltas = (socket.handshake.auth as { logDeltas?: unknown } | undefined)?.logDeltas === true;
      socket.data.cosmetics = { unlocks: NO_UNLOCKS, chosen: null };
      socket.data.isAdmin = await isAdminIdentity(identity);
      next();
    } catch (err) {
      console.error('[io] identity error', err);
      next(new Error('AUTH_FAILED'));
    }
  });

  // Presence: which identities have a socket open, and in which room.
  const socketsOf = new Map<string, Set<string>>();
  setPresenceSource({
    lookup(key) {
      const ids = socketsOf.get(key);
      if (!ids?.size) return { status: 'offline', roomCode: null };
      for (const id of ids) {
        const code = io.sockets.sockets.get(id)?.data.roomCode;
        const room = code ? manager.get(code) : undefined;
        if (room) return { status: room.status === 'playing' ? 'playing' : 'lobby', roomCode: room.code };
      }
      return { status: 'online', roomCode: null };
    },
    invite(key, invite) {
      const ids = socketsOf.get(key);
      if (!ids?.size) return false;
      for (const id of ids) io.sockets.sockets.get(id)?.emit('friend:invite', invite);
      return true;
    },
  });

  io.on('connection', (socket: GameSocket) => {
    const key = socket.data.identity.key;
    socketsOf.set(key, (socketsOf.get(key) ?? new Set()).add(socket.id));
    socket.on('disconnect', () => {
      const ids = socketsOf.get(key);
      ids?.delete(socket.id);
      if (ids && !ids.size) socketsOf.delete(key);
    });

    const currentRoom = (): Room => {
      const room = socket.data.roomCode ? manager.get(socket.data.roomCode) : undefined;
      if (!room) throw new UserError('You are not in a room');
      return room;
    };
    const leaveCurrent = () => {
      const room = socket.data.roomCode ? manager.get(socket.data.roomCode) : undefined;
      room?.leave(socket.id);
      socket.data.roomCode = null;
    };
    const lobbyLimit = () => {
      if (!limits.lobby.take(socket.id)) throw new UserError('Slow down a little');
    };

    /** Limits a profile's frame/title to what this player has unlocked (re-read from storage). */
    const withCosmetics = async <P extends Partial<JoinProfile> | undefined>(profile: P): Promise<P> => {
      socket.data.cosmetics = await cosmeticStateFor(socket.data.identity);
      if (!profile || typeof profile !== 'object') return profile;
      return { ...profile, cosmetics: seatCosmetics(profile.cosmetics, socket.data.cosmetics) };
    };

    const remember = (profile: JoinProfile | undefined) => {
      if (profile && opts.persistence && 'rememberProfile' in opts.persistence) {
        (opts.persistence as DurablePersistence).rememberProfile(socket.data.identity.key, profile);
      }
    };

    socket.on('room:create', async (p: { profile: JoinProfile; settings?: Partial<RoomSettings> }, ack) => {
      if (!limits.roomCreate.take(socket.data.ip)) {
        return reply(ack, () => {
          throw new UserError('Too many new rooms. Try again in a minute.');
        });
      }
      const profile = p && typeof p === 'object' && p.profile && typeof p.profile === 'object' ? await withCosmetics(p.profile) : null;
      // The socket may have dropped during the lookup; seating it now would leave a seat nobody holds.
      if (!socket.connected) return;
      reply(ack, () => {
        if (!profile) throw new UserError('Choose a name first');
        leaveCurrent();
        const room = manager.create(socket.data.identity, p.settings);
        room.join(socket.id, socket.data.identity, { profile });
        socket.data.roomCode = room.code;
        remember(profile);
        return { code: room.code };
      });
    });

    socket.on('room:join', async (p: { code: string; profile?: JoinProfile; spectate?: boolean }, ack) => {
      if (!limits.roomJoin.take(socket.data.ip)) {
        return reply(ack, () => {
          throw new UserError('Too many tries. Wait a moment.');
        });
      }
      // Not in memory? It may be a running game from before a server restart.
      const room = manager.get(p?.code) ?? (await manager.restore(p?.code));
      const profile = await withCosmetics(p?.profile);
      if (!socket.connected) return; // dropped while we looked things up (see room:create)
      reply(ack, () => {
        if (!room) throw new UserError("That room doesn't exist (or has ended)");
        if (socket.data.roomCode && socket.data.roomCode !== room.code) leaveCurrent();
        const dto = room.join(socket.id, socket.data.identity, { profile, spectate: !!p.spectate });
        socket.data.roomCode = room.code;
        remember(profile);
        return { room: dto };
      });
    });

    socket.on('room:leave', (ack) => reply(ack, () => leaveCurrent()));

    socket.on('room:settings', (p, ack) =>
      reply(ack, () => {
        lobbyLimit();
        currentRoom().updateSettings(socket.id, p ?? {});
      }),
    );

    socket.on('room:profile', (p, ack) =>
      reply(ack, () => {
        lobbyLimit();
        const patch = { ...(p && typeof p === 'object' ? p : {}) };
        // Only frames/titles already checked at join; a lobby edit can't claim new ones.
        if (patch.cosmetics !== undefined) patch.cosmetics = seatCosmetics(patch.cosmetics, { ...socket.data.cosmetics, chosen: null });
        currentRoom().updateProfile(socket.id, patch);
      }),
    );

    socket.on('room:addBot', (ack) =>
      reply(ack, () => {
        lobbyLimit();
        currentRoom().addBot(socket.id);
      }),
    );

    socket.on('room:removeSeat', (playerId, ack) =>
      reply(ack, () => {
        lobbyLimit();
        currentRoom().removeSeat(socket.id, String(playerId));
      }),
    );

    socket.on('room:start', (ack) =>
      reply(ack, () => {
        lobbyLimit();
        currentRoom().start(socket.id);
      }),
    );

    socket.on('room:rematch', (ack) =>
      reply(ack, () => {
        lobbyLimit();
        currentRoom().rematch(socket.id);
      }),
    );

    socket.on('room:toLobby', (ack) =>
      reply(ack, () => {
        lobbyLimit();
        currentRoom().backToLobby(socket.id);
      }),
    );

    socket.on('game:action', (action: Action, ack) =>
      reply(ack, () => {
        if (!limits.action.take(socket.id)) throw new UserError('Slow down a little');
        currentRoom().act(socket.id, action);
      }),
    );

    socket.on('chat:send', (text, ack) =>
      reply(ack, () => {
        if (!limits.chat.take(socket.data.identity.key)) throw new UserError('You are sending messages too quickly');
        currentRoom().say(socket.id, text);
      }),
    );

    socket.on('room:react', (reaction, ack) =>
      reply(ack, () => {
        if (!isReactionId(reaction)) throw new UserError('Unknown reaction');
        if (!limits.reaction.take(socket.data.identity.key)) throw new UserError('Easy there. Wait a moment.');
        currentRoom().react(socket.id, reaction);
      }),
    );

    // Mouse positions are best-effort: bad or too-frequent ones are dropped without a word.
    socket.on('room:cursor', (at) => {
      if (at !== null && !isBoardPoint(at)) return;
      if (!limits.cursor.take(socket.id)) return;
      try {
        currentRoom().cursor(socket.id, at === null ? null : { x: at.x, y: at.y });
      } catch {
        // not in a room
      }
    });

    socket.on('game:stats', (ack) =>
      reply(ack, () => {
        if (!limits.stats.take(socket.id)) throw new UserError('Slow down a little');
        return { report: currentRoom().liveReport(socket.id) };
      }),
    );

    socket.on('admin:game', (cmd, ack) =>
      reply(ack, () => {
        if (!socket.data.isAdmin) throw new UserError('Only admins can do that');
        if (!limits.admin.take(socket.id)) throw new UserError('Slow down a little');
        return { message: currentRoom().admin(socket.id, cmd) };
      }),
    );

    socket.on('game:sync', () => {
      // Its own budget: lobby clicks must never use up the client's way back to a whole log.
      if (!limits.sync.take(socket.id)) return;
      const room = socket.data.roomCode ? manager.get(socket.data.roomCode) : undefined;
      room?.resync(socket.id);
    });

    socket.on('disconnect', () => {
      const room = socket.data.roomCode ? manager.get(socket.data.roomCode) : undefined;
      room?.disconnect(socket.id);
    });
  });

  return { io, manager };
}
