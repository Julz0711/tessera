import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { botAction } from '@/bots';
import { actorsFor, tradesAwaiting, type PlayerView } from '@/engine';
import { DEFAULT_KNIGHT } from '@/shared/knight';
import type { AckResult, ChatMessage, ClientToServerEvents, RoomDTO, ServerToClientEvents } from '@/shared/protocol';

process.env.AUTH_SECRET = 'test-secret-for-realtime';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

let server: HttpServer;
let url: string;
let dispose: () => void;

beforeAll(async () => {
  const { attachRealtime } = await import('../realtime');
  const { handleHttp } = await import('../http');
  server = createServer((req, res) => {
    handleHttp(req, res).then((handled) => {
      if (!handled) {
        res.writeHead(404);
        res.end();
      }
    });
  });
  const { manager } = attachRealtime(server, { botDelayScale: 0, disconnectGraceMs: 300 });
  dispose = () => manager.dispose();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  dispose?.();
  server?.close();
});

async function guestCookie(): Promise<string> {
  const res = await fetch(`${url}/api/session/guest`, { method: 'POST' });
  expect(res.status).toBe(200);
  const cookie = res.headers.get('set-cookie')!;
  return cookie.split(';')[0];
}

function client(cookie: string, origin?: string): Client {
  return connect(url, {
    transports: ['websocket'],
    extraHeaders: { cookie, ...(origin ? { origin } : {}) },
    reconnection: false,
    forceNew: true,
  });
}

function call<T extends object>(emit: (ack: (r: AckResult<T>) => void) => void): Promise<AckResult<T>> {
  return new Promise((resolve) => emit(resolve));
}

const profile = (name: string, color: 'red' | 'blue' | 'orange' | 'white') => ({ name, color, knight: DEFAULT_KNIGHT });

/** Plays a seat with the bot AI from the client side, one request in flight at a time. */
function autoplay(c: Client, getSeat: () => number | null) {
  let latest: PlayerView | null = null;
  let busy = false;
  const step = () => {
    const view = latest;
    const seat = getSeat();
    if (!view || busy || seat === null || view.phase === 'ended') return;
    const mine = actorsFor(view).includes(seat) || tradesAwaiting(view, seat).length > 0;
    if (!mine) return;
    const action = botAction(view, seat, { tradeTimedOut: true });
    if (!action) return;
    busy = true;
    c.emit('game:action', action, () => {
      busy = false;
      step();
    });
  };
  c.on('game:state', ({ view }) => {
    latest = view;
    step();
  });
  return { view: () => latest };
}

describe('realtime server', () => {
  it('rejects sockets without an identity and from foreign origins', async () => {
    const anon = connect(url, { transports: ['websocket'], reconnection: false, forceNew: true });
    const err = await new Promise<Error>((resolve) => anon.on('connect_error', resolve));
    expect(err.message).toBe('NO_IDENTITY');
    anon.close();

    const cookie = await guestCookie();
    const evil = client(cookie, 'https://evil.example');
    const err2 = await new Promise<Error>((resolve) => evil.on('connect_error', resolve));
    expect(err2).toBeTruthy();
    evil.close();
  });

  it('runs a full game with two humans and two bots, with spectators, chat and reconnect', async () => {
    const hostCookie = await guestCookie();
    const guestCookieB = await guestCookie();
    const host = client(hostCookie);
    const guest = client(guestCookieB);
    let hostRoom: RoomDTO | null = null;
    let guestRoom: RoomDTO | null = null;
    host.on('room:state', (r) => (hostRoom = r));
    guest.on('room:state', (r) => (guestRoom = r));

    const created = await call<{ code: string }>((ack) => host.emit('room:create', { profile: profile('Alex', 'red') }, ack));
    expect(created.ok).toBe(true);
    const code = (created as { code: string }).code;
    expect(code).toMatch(/^[A-Z2-9]{8}$/);

    const missing = await call((ack) => guest.emit('room:join', { code: 'ZZZZZZZZ', profile: profile('Sam', 'blue') }, ack));
    expect(missing.ok).toBe(false);

    const joined = await call<{ room: RoomDTO }>((ack) => guest.emit('room:join', { code, profile: profile('Sam', 'red') }, ack));
    expect(joined.ok).toBe(true);
    const seatsAfterJoin = (joined as { room: RoomDTO }).room.seats;
    expect(seatsAfterJoin).toHaveLength(2);
    // Red was taken by the host, so Sam got another color.
    expect(seatsAfterJoin[1].color).not.toBe('red');
    expect(seatsAfterJoin[1].isGuest).toBe(true);
    expect(JSON.stringify(seatsAfterJoin)).not.toContain(hostCookie.split('=')[1]);

    expect((await call((ack) => guest.emit('room:start', ack))).ok).toBe(false);
    expect((await call((ack) => host.emit('room:addBot', ack))).ok).toBe(true);
    expect((await call((ack) => host.emit('room:addBot', ack))).ok).toBe(true);
    expect((await call((ack) => host.emit('room:addBot', ack))).ok).toBe(false);

    const hostPlay = autoplay(host, () => hostRoom?.you.seat ?? null);
    autoplay(guest, () => guestRoom?.you.seat ?? null);

    expect((await call((ack) => host.emit('room:start', ack))).ok).toBe(true);

    // A late visitor becomes a spectator and sees no private information.
    const watcher = client(await guestCookie());
    const firstSpectatorView = new Promise<PlayerView>((resolve) => watcher.once('game:state', ({ view }) => resolve(view)));
    const watched = await call<{ room: RoomDTO }>((ack) => watcher.emit('room:join', { code }, ack));
    expect(watched.ok).toBe(true);
    expect((watched as { room: RoomDTO }).room.you.isSpectator).toBe(true);
    const spectatorView = await firstSpectatorView;
    expect(spectatorView.viewer).toBeNull();
    expect(spectatorView.players.every((p) => p.devCards.length === 0)).toBe(true);
    expect((await call((ack) => watcher.emit('game:action', { type: 'endTurn' }, ack))).ok).toBe(false);

    // Chat reaches everyone; a burst gets rate-limited.
    const heard = new Promise<ChatMessage>((resolve) => watcher.on('chat:message', (m) => !m.system && resolve(m)));
    expect((await call((ack) => guest.emit('chat:send', 'gl hf <b>!</b>', ack))).ok).toBe(true);
    expect((await heard).text).toBe('gl hf <b>!</b>');
    const burst = await Promise.all(Array.from({ length: 8 }, () => call((ack) => guest.emit('chat:send', 'spam', ack))));
    expect(burst.some((r) => !r.ok)).toBe(true);

    // The guest drops and comes back with the same cookie → same seat.
    const seatBefore = guestRoom!.you.seat;
    guest.close();
    await new Promise((r) => setTimeout(r, 100));
    const guest2 = client(guestCookieB);
    // Listeners first: the server pushes room and game state before acknowledging the join.
    guest2.on('room:state', (r) => (guestRoom = r));
    autoplay(guest2, () => guestRoom?.you.seat ?? null);
    const rejoined = await call<{ room: RoomDTO }>((ack) => guest2.emit('room:join', { code }, ack));
    expect(rejoined.ok).toBe(true);
    expect((rejoined as { room: RoomDTO }).room.you.seat).toBe(seatBefore);

    // Play to the end.
    const deadline = Date.now() + 60_000;
    while (hostPlay.view()?.phase !== 'ended' && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
    const final = hostPlay.view()!;
    expect(final.phase).toBe('ended');
    expect(final.winner).not.toBeNull();
    expect(hostRoom!.status).toBe('finished');

    // Only the host decides what comes next.
    expect((await call((ack) => guest2.emit('room:toLobby', ack))).ok).toBe(false);

    // Back to the lobby, then start again from there.
    expect((await call((ack) => host.emit('room:toLobby', ack))).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 50));
    expect(hostRoom!.status).toBe('lobby');
    expect((await call((ack) => host.emit('room:start', ack))).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 50));
    expect(hostRoom!.status).toBe('playing');
    expect(hostRoom!.gameNumber).toBe(2);

    host.close();
    guest2.close();
    watcher.close();
  });

  it('plays a full Cities & Knights game through the server', async () => {
    const host = client(await guestCookie());
    let room: RoomDTO | null = null;
    host.on('room:state', (r) => (room = r));
    const play = autoplay(host, () => room?.you.seat ?? null);
    const created = await call<{ code: string }>((ack) => host.emit('room:create', { profile: profile('Kim', 'white'), settings: { mode: 'ck' } }, ack));
    expect(created.ok).toBe(true);
    for (let i = 0; i < 2; i++) expect((await call((ack) => host.emit('room:addBot', ack))).ok).toBe(true);
    expect((await call((ack) => host.emit('room:start', ack))).ok).toBe(true);
    const deadline = Date.now() + 60_000;
    while (play.view()?.phase !== 'ended' && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
    const final = play.view()!;
    expect(final.mode).toBe('ck');
    expect(final.phase).toBe('ended');
    expect(final.settings.vpToWin).toBe(13);
    host.close();
  });

  it('switches maps in the lobby and seats six players on the big ones', async () => {
    const host = client(await guestCookie());
    let room: RoomDTO | null = null;
    host.on('room:state', (r) => (room = r));
    expect((await call((ack) => host.emit('room:create', { profile: profile('Robin', 'red') }, ack))).ok).toBe(true);
    expect((await call((ack) => host.emit('room:settings', { map: 'large' }, ack))).ok).toBe(true);
    expect(room!.settings).toMatchObject({ map: 'large', maxPlayers: 6 });
    expect((await call((ack) => host.emit('room:settings', { map: 'blackForest' }, ack))).ok).toBe(true);
    expect(room!.settings).toMatchObject({ map: 'blackForest', maxPlayers: 6 });
    for (let i = 0; i < 5; i++) expect((await call((ack) => host.emit('room:addBot', ack))).ok).toBe(true);
    expect((await call((ack) => host.emit('room:addBot', ack))).ok).toBe(false);
    // Six players do not fit the standard island.
    expect((await call((ack) => host.emit('room:settings', { map: 'standard' }, ack))).ok).toBe(false);
    expect((await call((ack) => host.emit('room:start', ack))).ok).toBe(true);
    host.close();
  });

  it('flashes quick reactions to the table, rate-limited, and blocks repeated chat', async () => {
    const a = client(await guestCookie());
    const b = client(await guestCookie());
    const created = await call<{ code: string }>((ack) => a.emit('room:create', { profile: profile('Ria', 'red') }, ack));
    const code = (created as { code: string }).code;
    expect((await call((ack) => b.emit('room:join', { code, profile: profile('Bo', 'blue') }, ack))).ok).toBe(true);

    const seen: string[] = [];
    b.on('room:reaction', (r) => seen.push(r.reaction));
    expect((await call((ack) => a.emit('room:react', 'thumbs', ack))).ok).toBe(true);
    expect((await call((ack) => a.emit('room:react', 'gg', ack))).ok).toBe(true);
    // Two in a row, then a pause.
    expect((await call((ack) => a.emit('room:react', 'laugh', ack))).ok).toBe(false);
    expect((await call((ack) => b.emit('room:react', 'nope' as never, ack))).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 50));
    expect(seen).toEqual(['thumbs', 'gg']);

    expect((await call((ack) => a.emit('chat:send', 'hello', ack))).ok).toBe(true);
    expect((await call((ack) => a.emit('chat:send', 'hello', ack))).ok).toBe(false);
    expect((await call((ack) => a.emit('chat:send', 'hello again', ack))).ok).toBe(true);
    a.close();
    b.close();
  });
});
