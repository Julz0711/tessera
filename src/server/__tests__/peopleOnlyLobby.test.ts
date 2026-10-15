import { describe, expect, it } from 'vitest';
import { DEFAULT_KNIGHT } from '@/shared/knight';
import { noopPersistence } from '../persistence';
import { Room, type RoomIO } from '../room';

const profile = { name: 'Host', color: 'red' as const, knight: DEFAULT_KNIGHT };
const host = { key: 'g:host', kind: 'guest' as const, id: 'host', displayName: 'Host', avatarUrl: null };
const io: RoomIO = { send: () => {}, detach: () => {} };

function lobby(settings?: { allowBots: boolean }) {
  const room = new Room('ABCDEFGH', host, settings, { io, persistence: noopPersistence, botDelayScale: 0 });
  room.join('s1', host, { profile });
  return room;
}

describe('people-only lobby', () => {
  it('refuses bots when created with allowBots: false', () => {
    const room = lobby({ allowBots: false });
    expect(() => room.addBot('s1')).toThrow(/people only/);
    expect(room.seats).toHaveLength(1);
  });

  it('allows bots by default and when allowBots is true', () => {
    for (const room of [lobby(), lobby({ allowBots: true })]) {
      room.addBot('s1');
      expect(room.seats).toHaveLength(2);
    }
  });
});
