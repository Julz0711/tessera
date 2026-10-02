import { describe, expect, it } from 'vitest';
import { DEFAULT_KNIGHT } from '@/shared/knight';
import { noopPersistence } from '../persistence';
import { Room, type RoomIO } from '../room';

const profile = { name: 'Host', color: 'red' as const, knight: DEFAULT_KNIGHT };
const host = { key: 'g:host', kind: 'guest' as const, id: 'host', displayName: 'Host', avatarUrl: null };

function setup() {
  const sent: string[] = [];
  const abandoned: string[] = [];
  const io: RoomIO = { send: (_sid, event, ..._args) => void sent.push(event), detach: () => {} };
  const persistence = { ...noopPersistence, seatAbandoned: (_g: string, playerId: string) => void abandoned.push(playerId) };
  const room = new Room('ABCDEFGH', host, undefined, { io, persistence, botDelayScale: 0 });
  room.join('s1', host, { profile });
  return { room, sent, abandoned };
}

describe('abandoning a seat', () => {
  it('frees a lobby seat', () => {
    const { room } = setup();
    room.addBot('s1');
    expect(room.abandon('g:host')).toBe(true);
    expect(room.seats.filter((s) => !s.isBot)).toHaveLength(0);
    expect(room.abandon('g:host')).toBe(false);
  });

  it('hands a running game seat to a bot for good and disconnects its sockets', () => {
    const { room, sent, abandoned } = setup();
    room.addBot('s1');
    room.addBot('s1');
    room.start('s1');
    const me = room.seats.find((s) => s.identityKey === 'g:host')!;
    const playerId = me.playerId;
    expect(room.abandon('g:host')).toBe(true);
    expect(me).toMatchObject({ isBot: true, identityKey: null, left: false });
    expect(me.sockets.size).toBe(0);
    expect(abandoned).toEqual([playerId]);
    expect(sent).toContain('room:closed');
    // Nobody human is left, so the table closes.
    expect(room.closed).toBe(true);
  });

  it('keeps the table running for the remaining humans', () => {
    const { room } = setup();
    const other = { key: 'g:other', kind: 'guest' as const, id: 'other', displayName: 'Other', avatarUrl: null };
    room.join('s2', other, { profile: { ...profile, name: 'Other', color: 'blue' } });
    room.addBot('s1');
    room.start('s1');
    expect(room.abandon('g:host')).toBe(true);
    expect(room.closed).toBe(false);
    expect(room.seats.filter((s) => s.isBot)).toHaveLength(2);
    expect(room.seats.some((s) => s.identityKey === 'g:other')).toBe(true);
    room.close('done');
  });
});
