import { describe, expect, it } from 'vitest';
import { botAction } from '@/bots';
import { seatsToAsk } from '@/bots/simulate';
import { applyAction } from '../apply';
import { buildReplay, type ReplayStep } from '../replay';
import { createGame } from '../state';
import type { GameState, Mode } from '../types';
import { handTotal } from '../hand';
import { viewFor } from '../view';

/** Plays a bot game to its end, recording (seat, action) like the server's stored events. */
function record(seed: number, mode: Mode) {
  const initial = createGame({
    seed,
    mode,
    players: [0, 1, 2].map((i) => ({ id: `b${i}`, name: `Bot ${i}`, color: (['red', 'blue', 'orange'] as const)[i], isBot: true })),
  });
  // The server stores JSON, so the opening state travels through it.
  const stored = JSON.parse(JSON.stringify(initial)) as GameState;
  const steps: ReplayStep[] = [];
  let s = initial;
  while (s.phase !== 'ended' && steps.length < 6000) {
    const seat = seatsToAsk(s)[0];
    if (seat === undefined) throw new Error('stalled');
    const action = botAction(viewFor(s, seat), seat, { tradeTimedOut: true });
    if (!action) throw new Error('no action');
    const r = applyAction(s, seat, action);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    steps.push({ seat, action: JSON.parse(JSON.stringify(action)) });
  }
  return { stored, steps, final: s };
}

describe('replay', () => {
  for (const mode of ['classic', 'ck'] as const) {
    it(`rebuilds a finished ${mode} game exactly from its actions`, () => {
      const { stored, steps, final } = record(7, mode);
      expect(final.phase).toBe('ended');
      const replay = buildReplay({ initial: stored, steps });
      expect(replay.stopped).toBe(false);
      expect(replay.total).toBe(steps.length);
      expect(replay.stateAt(replay.total)).toEqual(final);
      // The timeline: points per step, turn starts, and the win at the end.
      expect(replay.points).toHaveLength(steps.length + 1);
      expect(replay.markers.at(-1)?.kind).toBe('win');
      expect(replay.turns.length).toBeGreaterThan(5);
      expect(Math.max(...replay.points.at(-1)!)).toBeGreaterThanOrEqual(10);
    });
  }

  it('scrubbing in any order gives the same states as playing straight through', () => {
    const { stored, steps } = record(11, 'classic');
    const replay = buildReplay({ initial: stored, steps });
    const straight: GameState[] = [replay.stateAt(0)];
    for (let i = 0; i < steps.length; i++) {
      const r = applyAction(straight[i], steps[i].seat, steps[i].action);
      if (!r.ok) throw new Error(r.error);
      straight.push(r.state);
    }
    const probes = [steps.length, 3, Math.floor(steps.length / 2), 0, steps.length - 1, 41, 40, 42, 17, Math.floor(steps.length * 0.9)];
    for (const k of probes) expect(replay.stateAt(k)).toEqual(straight[k]);
  });

  it('stops where an action no longer applies', () => {
    const { stored, steps } = record(5, 'classic');
    const bad = steps.slice();
    bad[30] = { seat: bad[30].seat, action: { type: 'endTurn' } };
    bad[31] = { seat: (bad[31].seat + 1) % 3, action: { type: 'rollDice' } };
    const replay = buildReplay({ initial: stored, steps: bad });
    expect(replay.stopped).toBe(true);
    expect(replay.total).toBeLessThan(steps.length);
    expect(replay.stateAt(replay.total).phase).not.toBe('ended');
  });

  it('can reveal hidden cards in a game that is still running', () => {
    const { stored, steps } = record(3, 'classic');
    const replay = buildReplay({ initial: stored, steps });
    const mid = replay.stateAt(Math.floor(steps.length / 2));
    expect(mid.phase).not.toBe('ended');
    const hidden = viewFor(mid, null);
    const open = viewFor(mid, null, true);
    expect(hidden.players.every((p) => p.vp === null)).toBe(true);
    expect(open.players.map((p) => p.vp)).toEqual(mid.players.map((_, i) => replay.points[Math.floor(steps.length / 2)][i]));
    expect(open.players.reduce((n, p) => n + handTotal(p.hand), 0)).toBeGreaterThan(0);
    expect(hidden.players.reduce((n, p) => n + handTotal(p.hand), 0)).toBe(0);
  });
});
