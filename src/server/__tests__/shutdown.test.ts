import { describe, expect, it } from 'vitest';
import { DEFAULT_KNIGHT } from '@/shared/knight';
import type { ServerIdentity } from '../identity';
import { noopPersistence, type PersistRoom } from '../persistence';
import type { RoomIO } from '../room';
import { RoomManager } from '../rooms';

const guest = (id: string): ServerIdentity => ({ key: `g:${id}`, kind: 'guest', id, displayName: id, avatarUrl: null });
const profile = { name: 'Me', color: 'red' as const, knight: DEFAULT_KNIGHT };

function setup(durable: boolean) {
  const sent: string[] = [];
  const statuses: PersistRoom[] = [];
  const gamesAbandoned: string[] = [];
  const io: RoomIO = { send: (_sid, event, ..._args) => void sent.push(event), detach: () => {} };
  const persistence = {
    ...noopPersistence,
    roomStatus: (room: PersistRoom) => void statuses.push(room),
    gameAbandoned: (id: string) => void gamesAbandoned.push(id),
    ...(durable ? { restoreRoom: async () => null, rememberProfile() {}, flush: async () => {} } : {}),
  };
  const manager = new RoomManager({ io, persistence, botDelayScale: 0 });
  const me = guest('me');
  const playing = manager.create(me);
  playing.join('s1', me, { profile });
  playing.addBot('s1');
  playing.start('s1');
  const lobby = manager.create(me);
  lobby.join('s2', me, { profile });
  statuses.length = 0;
  sent.length = 0;
  return { manager, playing, lobby, sent, statuses, gamesAbandoned };
}

describe('server shutdown', () => {
  it('leaves saved running games open so the next server restores them', () => {
    const { manager, playing, lobby, sent, statuses, gamesAbandoned } = setup(true);
    manager.dispose();
    expect(playing.closed).toBe(true);
    // Nothing written for the running game: it stays "playing" in storage, and its players aren't told
    // the room closed (their clients reconnect and rejoin it on the next server).
    expect(statuses.filter((r) => r.id === playing.id)).toEqual([]);
    expect(gamesAbandoned).toEqual([]);
    expect(statuses.filter((r) => r.id === lobby.id).map((r) => r.status)).toEqual(['closed']);
    expect(sent.filter((e) => e === 'room:closed')).toHaveLength(1);
  });

  it('closes everything when games are kept only in memory', () => {
    const { manager, playing, statuses } = setup(false);
    manager.dispose();
    expect(statuses.filter((r) => r.id === playing.id).map((r) => r.status)).toEqual(['closed']);
  });
});
