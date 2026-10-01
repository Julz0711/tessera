import { describe, expect, it } from 'vitest';
import { botAction } from '@/bots';
import { viewFor, type GameEvent, type GameState } from '@/engine';
import { LOG_LIMIT } from '@/engine/constants';
import { DEFAULT_KNIGHT } from '@/shared/knight';
import type { GameUpdate } from '@/shared/protocol';
import { noopPersistence } from '../persistence';
import { Room, type RoomIO } from '../room';

const tick = () => new Promise((r) => setTimeout(r, 0));

function harness() {
  const updates = new Map<string, GameUpdate[]>();
  const io: RoomIO = {
    send: (sid, event, ...args) => {
      if (event !== 'game:state') return;
      updates.set(sid, [...(updates.get(sid) ?? []), args[0] as GameUpdate]);
    },
    detach: () => {},
    logDeltas: (sid) => sid !== 'old-client',
  };
  const snapshots: number[] = [];
  const persistence = { ...noopPersistence, snapshot: (_id: string, s: GameState) => void snapshots.push(s.seq) };
  const identity = { key: 'g:host', kind: 'guest' as const, id: 'host', displayName: 'Host', avatarUrl: null };
  const room = new Room('ABCDEFGH', identity, undefined, { io, persistence, botDelayScale: 0 });
  room.join('host-socket', identity, { profile: { name: 'Host', color: 'red', knight: DEFAULT_KNIGHT } });
  room.addBot('host-socket');
  room.addBot('host-socket');
  return { room, updates, snapshots };
}

/** Plays the host's seat with the bot until the game ends (or `max` actions). */
async function playOut(room: Room, max = 3000) {
  for (let i = 0; i < max && room.game && room.game.phase !== 'ended'; i++) {
    const seat = room.seats.findIndex((s) => s.identityKey === 'g:host');
    const action = botAction(viewFor(room.game, seat), seat, { tradeTimedOut: true });
    if (action) {
      try {
        room.act('host-socket', action);
      } catch {
        // not the host's turn after all
      }
    }
    await tick();
  }
}

describe('room game updates', () => {
  it('sends the log once, then only new events that rebuild it exactly', async () => {
    const { room, updates } = harness();
    room.start('host-socket');
    await playOut(room, 400);

    const got = updates.get('host-socket')!;
    expect(got[0].view.log).toBeDefined();
    const deltas = got.filter((u) => !u.view.log);
    expect(deltas.length).toBeGreaterThan(got.length / 2);

    // Rebuild the log the way the client does and compare with the server's own view of it.
    let log: GameEvent[] = [];
    let seq = -1;
    for (const u of got) {
      if (u.view.log) log = u.view.log;
      else {
        if (u.events.length) expect(u.events[0].seq).toBe(seq + 1);
        log = [...log, ...u.events].slice(-LOG_LIMIT);
      }
      seq = u.view.seq;
    }
    const seat = room.seats.findIndex((s) => s.identityKey === 'g:host');
    expect(log.map((e) => e.seq)).toEqual(viewFor(room.game!, seat).log.map((e) => e.seq));
  });

  it('keeps sending older clients the whole log', async () => {
    const { room, updates } = harness();
    room.start('host-socket');
    room.join('old-client', { key: 'g:watcher', kind: 'guest', id: 'watcher', displayName: 'W', avatarUrl: null }, { spectate: true });
    await playOut(room, 40);
    expect(updates.get('old-client')!.length).toBeGreaterThan(5);
    expect(updates.get('old-client')!.every((u) => u.view.log)).toBe(true);
  });

  it('resends the whole log on request and at the end of the game', async () => {
    const { room, updates } = harness();
    room.start('host-socket');
    await playOut(room, 30);
    updates.clear();
    room.resync('host-socket');
    expect(updates.get('host-socket')![0].view.log).toBeDefined();

    await playOut(room);
    if (room.game!.phase === 'ended') expect(updates.get('host-socket')!.at(-1)!.view.log).toBeDefined();
  });

  it('snapshots every 25 events even when an action emits several', async () => {
    const { room, snapshots } = harness();
    room.start('host-socket');
    await playOut(room, 600);
    expect(snapshots.length).toBeGreaterThan(3);
    for (let i = 1; i < snapshots.length; i++) {
      const gap = snapshots[i] - snapshots[i - 1];
      // The final snapshot at the end of the game may come sooner.
      if (i < snapshots.length - 1 || room.game!.phase !== 'ended') expect(gap).toBeGreaterThanOrEqual(25);
      expect(gap).toBeLessThan(25 + 40);
    }
  });
});
