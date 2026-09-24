import type { IncomingMessage, Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { Action } from '@/engine';
import type { ClientToServerEvents, JoinProfile, RoomSettings, ServerToClientEvents } from '@/shared/protocol';
import { resolveIdentity, type ServerIdentity } from './identity';
import type { Persistence } from './persistence';
import { limits } from './rateLimit';
import { UserError, type Room, type RoomIO } from './room';
import { RoomManager } from './rooms';

export interface SocketData {
  identity: ServerIdentity;
  ip: string;
  roomCode: string | null;
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
    pingInterval: 20_000,
    pingTimeout: 25_000,
    allowRequest: (req, cb) => cb(null, originAllowed(req)),
  });

  const roomIO: RoomIO = {
    send: (sid, event, ...args) => {
      io.sockets.sockets.get(sid)?.emit(event, ...args);
    },
    detach: (sid) => {
      const s = io.sockets.sockets.get(sid);
      if (s) s.data.roomCode = null;
    },
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
      next();
    } catch (err) {
      console.error('[io] identity error', err);
      next(new Error('AUTH_FAILED'));
    }
  });

  io.on('connection', (socket: GameSocket) => {
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

    socket.on('room:create', (p: { profile: JoinProfile; settings?: Partial<RoomSettings> }, ack) =>
      reply(ack, () => {
        if (!limits.roomCreate.take(socket.data.ip)) throw new UserError('Too many rooms created — try again in a minute');
        if (!p || typeof p !== 'object' || !p.profile) throw new UserError('Choose a name first');
        leaveCurrent();
        const room = manager.create(socket.data.identity, p.settings);
        room.join(socket.id, socket.data.identity, { profile: p.profile });
        socket.data.roomCode = room.code;
        return { code: room.code };
      }),
    );

    socket.on('room:join', (p: { code: string; profile?: JoinProfile; spectate?: boolean }, ack) =>
      reply(ack, () => {
        if (!limits.roomJoin.take(socket.data.ip)) throw new UserError('Too many attempts — wait a moment');
        const room = manager.get(p?.code);
        if (!room) throw new UserError("That room doesn't exist (or has ended)");
        if (socket.data.roomCode && socket.data.roomCode !== room.code) leaveCurrent();
        const dto = room.join(socket.id, socket.data.identity, { profile: p.profile, spectate: !!p.spectate });
        socket.data.roomCode = room.code;
        return { room: dto };
      }),
    );

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
        currentRoom().updateProfile(socket.id, p ?? {});
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

    socket.on('disconnect', () => {
      const room = socket.data.roomCode ? manager.get(socket.data.roomCode) : undefined;
      room?.disconnect(socket.id);
    });
  });

  return { io, manager };
}
