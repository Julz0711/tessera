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

  // A running two-human game on a fake clock, past setup, with `edit` applied to the state (e.g. open prompts).
  const playing = () => {
    const clock = { t: 1_000_000 };
    const room = new Room('ABCDEFGL', guest('a'), { turnTimer: 120 }, { io, persistence: noopPersistence, botDelayScale: 0, now: () => clock.t });
    room.join('s1', guest('a'), { profile: profile('red') });
    room.join('s2', guest('b'), { profile: profile('blue') });
    room.start('s1');
    const r = room as any;
    const me = r.seats.findIndex((x: any) => x.identityKey === 'g:a'); // seat order is shuffled
    const you = 1 - me;
    r.game = { ...r.game, phase: 'play', setup: null, turn: { ...r.game.turn, n: 1, seat: me }, pending: [] };
    r.updateWindow();
    const prompts = (...seats: number[]) => {
      r.game = { ...r.game, pending: seats.map((seat) => ({ kind: 'discard', seat, count: 1, reason: 'seven' })) };
      r.updateWindow();
    };
    const left = (sid: string) => {
      const d = room.dto(sid);
      return d.paused ?? (d.deadline! - clock.t);
    };
    return { room, r, clock, prompts, left, me, you };
  };

  it('does not restart the turn clock when a prompt opens or closes', () => {
    const { room, clock, prompts, left, me } = playing();
    clock.t += 50_000;
    prompts(me); // the active player's own prompt (robber, free roads…)
    expect(left('s1')).toBe(70_000);
    clock.t += 10_000;
    prompts();
    expect(left('s1')).toBe(60_000);
    room.close('done');
  });

  it('adds 5s per action taken in the red zone, kept across prompts', () => {
    const { room, r, clock, prompts, left, you } = playing();
    clock.t += 112_000;
    r.turnClock.bonusMs += 5_000; // what apply() does for an action at 8s left
    prompts(you);
    prompts();
    expect(left('s1')).toBe(13_000);
    room.close('done');
  });

  it('gives a prompt owed by another player 30s, pausing the active clock, then autopilots it', () => {
    const { room, r, clock, prompts, left, you } = playing();
    clock.t += 40_000;
    prompts(you);
    const answered: number[] = [];
    r.safeAutopilot = () => ({ type: 'endTurn' }); // stands in for the discard
    r.safeApply = (seat: number) => {
      answered.push(seat);
      prompts();
      return null;
    };
    expect(left('s2')).toBe(30_000);
    expect(left('s1')).toBe(80_000); // paused: frozen remaining time
    expect(room.dto('s1').deadline).toBeNull();
    clock.t += 29_000;
    r.tick();
    expect(answered).toEqual([]);
    clock.t += 1_000;
    r.tick();
    expect(answered).toEqual([you]); // autopilot answered for the other player
    expect(left('s1')).toBe(80_000); // resumes with the same remaining time
    clock.t += 5_000;
    prompts(you); // a later batch gets a fresh 30s
    expect(left('s2')).toBe(30_000);
    room.close('done');
  });

  it('starts a fresh clock on a new turn', () => {
    const { room, r, clock, left, you } = playing();
    clock.t += 100_000;
    r.game = { ...r.game, turn: { ...r.game.turn, n: 2, seat: you } };
    r.updateWindow();
    expect(left('s2')).toBe(120_000);
    room.close('done');
  });
});
