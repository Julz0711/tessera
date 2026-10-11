import { describe, expect, it } from 'vitest';
import { MIN_RATED_DECISIONS } from '@/bots/analysis/accuracy';
import type { GameAnalysis, PlayerAccuracy } from '@/bots/analysis/types';
import { humanSeats, planEloNudges } from '../gameAnalysis';

const accuracy = (seat: number, value: number | null, extra: Partial<PlayerAccuracy> = {}): PlayerAccuracy => ({
  seat, accuracy: value, decisions: 20, analysed: 20, averageLoss: 1, inaccuracies: 0, mistakes: 0, blunders: 0, complete: true, ...extra,
});
const analysis = (players: PlayerAccuracy[]): GameAnalysis => ({
  version: 1, players, moves: [], partial: false, search: { candidates: 5, rollouts: 2, horizonTurns: 0, level: 0 }, work: 0, ms: 0,
});
const row = (seat: number, extra: Partial<Parameters<typeof planEloNudges>[0][number]> = {}) => ({
  id: `p${seat}`, seat, isBot: false, userId: `u${seat}`, guestSessionId: null, ratingDelta: 12, ratingPool: 'classic', accuracyElo: null, ...extra,
});

describe('accuracy Elo nudge', () => {
  it('nudges rated players by their accuracy, capped at ±3', () => {
    const plan = planEloNudges([row(0), row(1), row(2), row(3)], analysis([accuracy(0, 100), accuracy(1, 1), accuracy(2, 86), accuracy(3, 75)]));
    expect(plan.map((n) => [n.playerId, n.delta])).toEqual([['p0', 3], ['p1', -3], ['p2', 1], ['p3', 0]]);
    expect(plan[0]).toMatchObject({ userId: 'u0', pool: 'classic' });
  });

  it('applies at most once per player and game', () => {
    const a = analysis([accuracy(0, 95), accuracy(1, 50)]);
    const first = planEloNudges([row(0), row(1)], a);
    expect(first).toHaveLength(2);
    // Once settled, the rows carry the adjustment and a second save plans nothing.
    const settled = [row(0, { accuracyElo: first[0].delta }), row(1, { accuracyElo: first[1].delta })];
    expect(planEloNudges(settled, a)).toEqual([]);
    expect(planEloNudges([row(0, { accuracyElo: 0 })], a)).toEqual([]);
  });

  it('skips unrated, guest, bot and abandoned seats, and partial or thin analyses', () => {
    const a = analysis([
      accuracy(0, 95),
      accuracy(1, 95),
      accuracy(2, 95),
      accuracy(3, 95, { complete: false, analysed: 12 }),
      accuracy(4, 95, { analysed: MIN_RATED_DECISIONS - 1, decisions: MIN_RATED_DECISIONS - 1 }),
      accuracy(5, null, { analysed: 0, decisions: 0 }),
    ]);
    const rows = [
      row(0, { ratingDelta: null }),
      row(1, { userId: null, guestSessionId: 'g1' }),
      row(2, { isBot: true }),
      row(3),
      row(4),
      row(5),
    ];
    expect(planEloNudges(rows, a)).toEqual([]);
  });

  it('puts people first, including seats a bot finished for them', () => {
    expect(humanSeats([
      { seat: 0, isBot: true, userId: null, guestSessionId: null },
      { seat: 1, isBot: false, userId: null, guestSessionId: 'g' },
      { seat: 2, isBot: true, userId: 'u', guestSessionId: null },
    ])).toEqual([1, 2]);
  });
});
