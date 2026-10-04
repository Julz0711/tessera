import { describe, expect, it } from 'vitest';
import { DUEL_RULES } from '@/engine/maps';
import { handLimit } from '@/engine/queries';
import { createGame } from '@/engine/state';
import { autoSetup, rollTotal, setHand } from '@/engine/__tests__/kit';
import { DEFAULT_KNIGHT } from '@/shared/knight';
import { DEFAULT_ROOM_SETTINGS } from '@/shared/protocol';
import { ratingPoolFor } from '@/shared/ratings';
import type { ServerIdentity } from '../identity';
import { noopPersistence } from '../persistence';
import { Room, type RoomIO } from '../room';

const guest = (id: string): ServerIdentity => ({ key: `g:${id}`, kind: 'guest', id, displayName: id, avatarUrl: null });
const profile = (color: 'red' | 'blue' | 'orange') => ({ name: color, color, knight: DEFAULT_KNIGHT });
const io: RoomIO = { send: () => {}, detach: () => {} };
const room = (code: string) => new Room(code, guest('a'), undefined, { io, persistence: noopPersistence, botDelayScale: 0 });

const duelGame = () =>
  createGame({
    seed: 3,
    mode: 'classic',
    players: [
      { id: 'p0', name: 'P0', color: 'red', isBot: false },
      { id: 'p1', name: 'P1', color: 'blue', isBot: false },
    ],
    settings: { map: 'duel' },
  });

describe('ranked 1v1', () => {
  it('starts the lobby from the 1v1 rules and restores the usual table when leaving', () => {
    const r = room('DUELAAAA');
    r.join('s1', guest('a'), { profile: profile('red') });
    r.updateSettings('s1', { map: 'duel', mode: 'classic' });
    expect(r.dto('s1').settings).toMatchObject({ map: 'duel', maxPlayers: 2, vpToWin: 15, turnTimer: 60, friendlyRobber: true, dice: 'balanced' });

    // They're only defaults: the host can change them, but not the two seats.
    r.updateSettings('s1', { vpToWin: 12, dice: 'random', friendlyRobber: false, maxPlayers: 4, turnTimer: 90 });
    expect(r.dto('s1').settings).toMatchObject({ map: 'duel', maxPlayers: 2, vpToWin: 12, turnTimer: 90, friendlyRobber: false, dice: 'random' });
    r.updateSettings('s1', { friendlyRobber: true });

    r.updateSettings('s1', { map: 'standard', mode: 'classic' });
    expect(r.dto('s1').settings).toMatchObject({
      map: 'standard',
      maxPlayers: DEFAULT_ROOM_SETTINGS.maxPlayers,
      vpToWin: 10,
      turnTimer: DEFAULT_ROOM_SETTINGS.turnTimer,
      friendlyRobber: false,
      dice: 'random',
    });
    r.close('done');
  });

  it('refuses 1v1 with three people seated', () => {
    const r = room('DUELAAAB');
    r.join('s1', guest('a'), { profile: profile('red') });
    r.join('s2', guest('b'), { profile: profile('blue') });
    r.join('s3', guest('c'), { profile: profile('orange') });
    expect(() => r.updateSettings('s1', { map: 'duel', mode: 'classic' })).toThrow(/at most 2/);
    r.close('done');
  });

  it('starts games with the 1v1 rules', () => {
    const r = room('DUELAAAC');
    r.join('s1', guest('a'), { profile: profile('red') });
    r.updateSettings('s1', { map: 'duel', mode: 'classic' });
    r.addBot('s1');
    r.start('s1');
    expect(r.game!.settings).toMatchObject({ map: 'duel', vpToWin: 15, discardLimit: 9, friendlyRobber: true, dice: 'balanced' });
    expect(r.game!.board.hexes.filter((h) => h.terrain !== 'sea')).toHaveLength(19);
    r.close('done');
  });

  it('defaults the engine to the 1v1 rules on the duel map', () => {
    const s = duelGame();
    expect(s.settings).toMatchObject({ vpToWin: DUEL_RULES.vpToWin, discardLimit: 9, friendlyRobber: true, dice: 'balanced' });
    expect(handLimit(s, 0)).toBe(9);
  });

  it('keeps 9 cards safe from a 7, but not 10', () => {
    let s = autoSetup(duelGame());
    s.settings.dice = 'random'; // rollTotal steers the random dice
    setHand(s, 0, {});
    setHand(s, 1, { wool: 9 });
    s = rollTotal(s, 7);
    expect(s.pending.some((p) => p.kind === 'discard')).toBe(false);

    s = autoSetup(duelGame());
    s.settings.dice = 'random';
    setHand(s, 0, {});
    setHand(s, 1, { wool: 10 });
    s = rollTotal(s, 7);
    expect(s.pending).toContainEqual({ kind: 'discard', seat: 1, count: 5, reason: 'seven' });
  });

  it('rates 1v1 games on their own ladder', () => {
    expect(ratingPoolFor('classic', 'duel')).toBe('duel');
    expect(ratingPoolFor('classic', 'standard')).toBe('classic');
  });
});
