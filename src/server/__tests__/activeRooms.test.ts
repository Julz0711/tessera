import { describe, expect, it } from 'vitest';
import { DEFAULT_KNIGHT } from '@/shared/knight';
import { activeRoomsFor } from '../activeRooms';
import type { ServerIdentity } from '../identity';
import type { RoomIO } from '../room';
import { RoomManager } from '../rooms';

const io: RoomIO = { send: () => {}, detach: () => {} };
const guest = (id: string): ServerIdentity => ({ key: `g:${id}`, kind: 'guest', id, displayName: id, avatarUrl: null });
const profile = (name: string) => ({ name, color: 'red' as const, knight: DEFAULT_KNIGHT });

describe('active rooms for the main menu', () => {
  it('lists lobbies and running games you hold a seat at, your turn first', async () => {
    const manager = new RoomManager({ io, botDelayScale: 0 });
    const [me, other] = [guest('me'), guest('other')];
    const lobby = manager.create(me);
    lobby.join('s1', me, { profile: profile('Me') });
    const running = manager.create(other);
    running.join('o1', other, { profile: profile('Other') });
    running.join('s2', me, { profile: profile('Me') });
    running.start('o1');
    const notMine = manager.create(other);
    notMine.join('o2', other, { profile: profile('Other') });

    const rooms = await activeRoomsFor(me, manager, null);
    expect(rooms.map((r) => r.code).sort()).toEqual([lobby.code, running.code].sort());
    expect(rooms.find((r) => r.code === lobby.code)).toMatchObject({ status: 'lobby', players: 1, turn: null, yourTurn: false });
    const mySeat = running.seats.findIndex((s) => s.identityKey === me.key);
    const game = rooms.find((r) => r.code === running.code)!;
    expect(game).toMatchObject({ status: 'playing', players: 2, autopilot: false });
    expect(game.yourTurn).toBe(running.game!.turn.seat === mySeat);

    // Leaving mid-game keeps the seat (autopilot plays it); leaving a lobby gives it up.
    running.leave('s2');
    lobby.leave('s1');
    expect(await activeRoomsFor(me, manager, null)).toMatchObject([{ code: running.code, autopilot: true }]);
    running.close('done');
    expect(await activeRoomsFor(me, manager, null)).toEqual([]);
    manager.dispose();
  });
});
