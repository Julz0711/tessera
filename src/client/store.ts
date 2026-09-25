'use client';

import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import type { Action, GameEvent } from '@/engine/types';
import type { PlayerView } from '@/engine/view';
import type {
  AckResult,
  ChatMessage,
  ClientToServerEvents,
  JoinProfile,
  RoomDTO,
  RoomSettings,
  ServerToClientEvents,
  SessionInfo,
} from '@/shared/protocol';
import { ensureSession } from './session';
import { play } from './sound';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type Conn = 'idle' | 'connecting' | 'online' | 'reconnecting' | 'offline';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'error' | 'good';
}

export interface GameStore {
  conn: Conn;
  session: SessionInfo | null;
  error: string | null;
  /** Room we belong to — used to re-join automatically after a reconnect. */
  code: string | null;
  room: RoomDTO | null;
  view: PlayerView | null;
  /** Events produced by the latest update (for animations and toasts). */
  events: GameEvent[];
  updateId: number;
  chat: ChatMessage[];
  unread: number;
  notice: string | null;
  toasts: Toast[];
}

const initial: GameStore = {
  conn: 'idle',
  session: null,
  error: null,
  code: null,
  room: null,
  view: null,
  events: [],
  updateId: 0,
  chat: [],
  unread: 0,
  notice: null,
  toasts: [],
};

export const useGame = create<GameStore>(() => ({ ...initial }));

let socket: ClientSocket | null = null;
let starting: Promise<void> | null = null;
let toastId = 0;

export function toast(text: string, tone: Toast['tone'] = 'info'): void {
  const id = ++toastId;
  useGame.setState((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }));
  setTimeout(() => useGame.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), tone === 'error' ? 4500 : 3200);
}

function wire(s: ClientSocket): void {
  let everConnected = false;
  s.on('connect', () => {
    useGame.setState({ conn: 'online', error: null });
    const code = useGame.getState().code;
    if (everConnected && code) {
      s.emit('room:join', { code }, (res) => {
        if (!res.ok) useGame.setState({ notice: res.error, code: null });
      });
    }
    everConnected = true;
  });
  s.on('disconnect', (reason) => {
    useGame.setState({ conn: reason === 'io client disconnect' ? 'offline' : 'reconnecting' });
  });
  s.io.on('reconnect_attempt', () => useGame.setState({ conn: 'reconnecting' }));
  s.on('connect_error', async (err) => {
    if (err.message === 'NO_IDENTITY') {
      try {
        useGame.setState({ session: await ensureSession() });
        s.connect();
      } catch (e) {
        useGame.setState({ conn: 'offline', error: (e as Error).message });
      }
      return;
    }
    useGame.setState({ conn: 'reconnecting' });
  });
  // Back in the lobby, the finished game's view goes away.
  s.on('room:state', (room) => useGame.setState(room.status === 'lobby' ? { room, view: null } : { room }));
  s.on('game:state', ({ view, events }) => useGame.setState((st) => ({ view, events, updateId: st.updateId + 1 })));
  s.on('chat:history', (chat) => useGame.setState({ chat }));
  s.on('chat:message', (m) => {
    useGame.setState((st) => ({ chat: [...st.chat.slice(-149), m], unread: st.unread + 1 }));
    if (!m.system) play('chat');
  });
  s.on('room:closed', (reason) => useGame.setState({ notice: reason, room: null, view: null, code: null }));
  s.on('session:replaced', () =>
    useGame.setState({ notice: 'This game is now open in another tab or window.', code: null, room: null, view: null }),
  );
}

/** Ensures a session and an open socket. Safe to call many times. */
export function startConnection(): Promise<void> {
  if (starting) return starting;
  starting = (async () => {
    useGame.setState({ conn: 'connecting', error: null });
    const session = await ensureSession();
    useGame.setState({ session });
    if (!socket) {
      socket = io({ transports: ['websocket', 'polling'], autoConnect: false, withCredentials: true });
      wire(socket);
    }
    if (!socket.connected) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Could not reach the game server')), 15_000);
        socket!.once('connect', () => {
          clearTimeout(timer);
          resolve();
        });
        socket!.connect();
      });
    }
  })().catch((err: Error) => {
    starting = null;
    useGame.setState({ conn: 'offline', error: err.message });
    throw err;
  });
  return starting;
}

export async function refreshSession(): Promise<void> {
  useGame.setState({ session: await ensureSession() });
}

function request<T extends object = object>(
  send: (s: ClientSocket, ack: (r: AckResult<T>) => void) => void,
): Promise<AckResult<T>> {
  return startConnection()
    .then(
      () =>
        new Promise<AckResult<T>>((resolve) => {
          const timer = setTimeout(() => resolve({ ok: false, error: 'The server did not answer — check your connection' }), 12_000);
          send(socket!, (r) => {
            clearTimeout(timer);
            resolve(r);
          });
        }),
    )
    .catch((err: Error) => ({ ok: false as const, error: err.message }));
}

export const api = {
  async createRoom(profile: JoinProfile, settings?: Partial<RoomSettings>) {
    const r = await request<{ code: string }>((s, ack) => s.emit('room:create', { profile, settings }, ack));
    if (r.ok) useGame.setState({ code: r.code, notice: null, view: null, events: [], chat: [] });
    return r;
  },
  async joinRoom(code: string, profile?: JoinProfile, spectate?: boolean) {
    const r = await request<{ room: RoomDTO }>((s, ack) => s.emit('room:join', { code, profile, spectate }, ack));
    if (r.ok) useGame.setState({ code: r.room.code, room: r.room, notice: null });
    return r;
  },
  async leaveRoom() {
    const r = await request((s, ack) => s.emit('room:leave', ack));
    useGame.setState({ code: null, room: null, view: null, events: [], chat: [], unread: 0 });
    return r;
  },
  settings: (patch: Partial<RoomSettings>) => request((s, ack) => s.emit('room:settings', patch, ack)).then(report),
  profile: (patch: Partial<JoinProfile>) => request((s, ack) => s.emit('room:profile', patch, ack)).then(report),
  addBot: () => request((s, ack) => s.emit('room:addBot', ack)).then(report),
  removeSeat: (playerId: string) => request((s, ack) => s.emit('room:removeSeat', playerId, ack)).then(report),
  start: () => request((s, ack) => s.emit('room:start', ack)).then(report),
  rematch: () => request((s, ack) => s.emit('room:rematch', ack)).then(report),
  backToLobby: () => request((s, ack) => s.emit('room:toLobby', ack)).then(report),
  act: (action: Action) => request((s, ack) => s.emit('game:action', action, ack)).then(report),
  chat: (text: string) => request((s, ack) => s.emit('chat:send', text, ack)).then(report),
};

function report<T extends AckResult>(r: T): T {
  if (!r.ok) {
    toast(r.error, 'error');
    play('error');
  }
  return r;
}

export function clearUnread(): void {
  useGame.setState({ unread: 0 });
}
