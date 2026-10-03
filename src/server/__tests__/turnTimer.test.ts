import { describe, expect, it } from 'vitest';
import { DEFAULT_KNIGHT } from '@/shared/knight';
import type { ServerIdentity } from '../identity';
import { noopPersistence } from '../persistence';
import { Room, type RoomIO } from '../room';

const guest = (id: string): ServerIdentity => ({ key: `g:${id}`, kind: 'guest', id, displayName: id, avatarUrl: null });
const profile = (color: 'red' | 'blue') => ({ name: color, color, knight: DEFAULT_KNIGHT });
const io: RoomIO = { send: () => {}, detach: () => {} };

describe('turn timer', () => {
  it('only runs with two or more people at the table', () => {
    const solo = new Room('ABCDEFGH', guest('a'), { turnTimer: 60 }, { io, persistence: noopPersistence, botDelayScale: 0 });
    solo.join('s1', guest('a'), { profile: profile('red') });
    solo.addBot('s1');
    solo.start('s1');
    expect(solo.dto('s1').deadline).toBeNull();
    solo.close('done');

    const duo = new Room('ABCDEFGJ', guest('a'), { turnTimer: 60 }, { io, persistence: noopPersistence, botDelayScale: 0 });
    duo.join('s1', guest('a'), { profile: profile('red') });
    duo.join('s2', guest('b'), { profile: profile('blue') });
    duo.start('s1');
    expect(duo.dto('s1').deadline).toEqual(expect.any(Number));
    duo.close('done');
  });

  it('gives each setup placement the full timer', () => {
    const now = 1_000_000;
    const room = new Room('ABCDEFGK', guest('a'), { turnTimer: 120 }, { io, persistence: noopPersistence, botDelayScale: 0, now: () => now });
    room.join('s1', guest('a'), { profile: profile('red') });
    room.join('s2', guest('b'), { profile: profile('blue') });
    room.start('s1');
    expect(room.game!.phase).toBe('setup');
    expect(room.dto('s1').deadline).toBe(now + 120_000);
    room.close('done');
  });
});
