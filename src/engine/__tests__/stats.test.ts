import { describe, expect, it } from 'vitest';
import { simulateGame } from '@/bots/simulate';
import { handTotal } from '../hand';
import { newStats, recordStats } from '../stats';
import { CARDS } from '../types';
import { newGame } from './kit';

describe('newStats', () => {
  it('zero-fills every counter for the given player count', () => {
    const stats = newStats(3);
    expect(stats.dice).toHaveLength(13);
    expect(stats.dice.every((n) => n === 0)).toBe(true);
    expect(stats.produced).toHaveLength(3);
    for (const hand of stats.produced) expect(handTotal(hand)).toBe(0);
    const scalarKeys = ['otherGain', 'stolen', 'lost', 'discarded', 'bankTrades', 'playerTrades', 'devBought', 'knightsPlayed', 'progressPlayed'] as const;
    for (const key of scalarKeys) expect(stats[key]).toEqual([0, 0, 0]);
  });
});

describe('recordStats', () => {
  it('tallies dice rolls by total, leaving impossible totals at zero', () => {
    const s = newGame(3);
    recordStats(s, { type: 'diceRolled', seat: 0, dice: { red: 3, yellow: 5 }, seq: 1 });
    recordStats(s, { type: 'diceRolled', seat: 1, dice: { red: 6, yellow: 6 }, seq: 2 });
    expect(s.stats.dice[8]).toBe(1);
    expect(s.stats.dice[12]).toBe(1);
    expect(s.stats.dice[0]).toBe(0);
    expect(s.stats.dice[1]).toBe(0);
    expect(s.stats.dice.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('adds hex production per seat and per card type', () => {
    const s = newGame(3);
    recordStats(s, { type: 'produced', gains: [{ brick: 2 }, {}, { ore: 1, wool: 1 }], seq: 1 });
    recordStats(s, { type: 'produced', gains: [{ brick: 1 }, {}, {}], seq: 2 });
    expect(s.stats.produced[0].brick).toBe(3);
    expect(s.stats.produced[2]).toMatchObject({ ore: 1, wool: 1 });
    expect(handTotal(s.stats.produced[1])).toBe(0);
  });

  it('counts received cards as other income, but not the starting setup deal', () => {
    const s = newGame(2);
    recordStats(s, { type: 'received', seat: 0, cards: { lumber: 2 }, reason: 'setup', seq: 1 });
    expect(s.stats.otherGain).toEqual([0, 0]);
    recordStats(s, { type: 'received', seat: 0, cards: { ore: 1, grain: 1 }, reason: 'yearOfPlenty', seq: 2 });
    expect(s.stats.otherGain[0]).toBe(2);
    recordStats(s, { type: 'monopoly', seat: 1, card: 'wool', total: 5, seq: 3 });
    expect(s.stats.otherGain).toEqual([2, 5]);
  });

  it('counts a steal once for the thief and once for the victim', () => {
    const s = newGame(2);
    recordStats(s, { type: 'stole', seat: 0, victim: 1, seq: 1 });
    recordStats(s, { type: 'stole', seat: 1, victim: 0, seq: 2 });
    expect(s.stats.stolen).toEqual([1, 1]);
    expect(s.stats.lost).toEqual([1, 1]);
  });

  it('counts discards, bank trades, and player trades (on both sides)', () => {
    const s = newGame(2);
    recordStats(s, { type: 'discarded', seat: 0, cards: { brick: 2, lumber: 1 }, seq: 1 });
    expect(s.stats.discarded[0]).toBe(3);
    recordStats(s, { type: 'bankTrade', seat: 1, give: { ore: 4 }, get: { wool: 1 }, seq: 2 });
    expect(s.stats.bankTrades).toEqual([0, 1]);
    recordStats(s, { type: 'trade', seat: 0, partner: 1, give: { wool: 1 }, get: { grain: 1 }, seq: 3 });
    expect(s.stats.playerTrades).toEqual([1, 1]);
  });

  it('splits classic dev cards into bought vs. knights played (other plays uncounted)', () => {
    const s = newGame(2);
    recordStats(s, { type: 'devBought', seat: 0, seq: 1 });
    recordStats(s, { type: 'devBought', seat: 0, seq: 2 });
    recordStats(s, { type: 'devPlayed', seat: 0, card: 'knight', seq: 3 });
    recordStats(s, { type: 'devPlayed', seat: 0, card: 'roadBuilding', seq: 4 });
    expect(s.stats.devBought[0]).toBe(2);
    expect(s.stats.knightsPlayed[0]).toBe(1);
  });

  it('counts Cities & Knights progress cards played', () => {
    const s = newGame(2);
    recordStats(s, { type: 'progressPlayed', seat: 1, card: 'smith', seq: 1 });
    expect(s.stats.progressPlayed).toEqual([0, 1]);
  });

  it('lazily initializes stats for a game saved before this field existed', () => {
    const s = newGame(2);
    // Simulate an old snapshot loaded from before `stats` existed on GameState.
    (s as { stats?: unknown }).stats = undefined;
    recordStats(s, { type: 'bankTrade', seat: 0, give: { ore: 4 }, get: { wool: 1 }, seq: 1 });
    expect(s.stats.bankTrades).toEqual([1, 0]);
  });
});

describe('stats over a full simulated game', () => {
  it('produces a consistent dice histogram and plausible production totals', () => {
    for (let i = 0; i < 4; i++) {
      const players = 2 + (i % 3);
      const seed = 42 + i * 101;
      const result = simulateGame(seed, players);
      if (result.error) throw new Error(`seed ${seed} (${players}p): ${result.error}`);
      const { stats } = result.state;

      // Only totals 2–12 are reachable with two dice.
      expect(stats.dice).toHaveLength(13);
      expect(stats.dice[0]).toBe(0);
      expect(stats.dice[1]).toBe(0);
      const totalRolls = stats.dice.reduce((a, b) => a + b, 0);
      expect(totalRolls).toBeGreaterThan(0);
      for (const n of stats.dice) expect(Number.isInteger(n) && n >= 0).toBe(true);

      // Every seat produced a non-negative, plausible amount (loose ceiling: a full game never
      // hands out more than a handful of cards per seat per roll on average).
      const totalProduced = stats.produced.reduce((sum, hand) => sum + CARDS.reduce((n, c) => n + hand[c], 0), 0);
      expect(totalProduced).toBeGreaterThan(0);
      expect(totalProduced).toBeLessThan(totalRolls * players * 10);

      // Steals always move exactly one card from a victim to a thief.
      expect(stats.stolen).toHaveLength(players);
      expect(stats.stolen.reduce((a, b) => a + b, 0)).toBe(stats.lost.reduce((a, b) => a + b, 0));
      // Trades always touch two seats, so the total is even.
      expect(stats.playerTrades.reduce((a, b) => a + b, 0) % 2).toBe(0);

      for (const n of [...stats.otherGain, ...stats.discarded, ...stats.bankTrades, ...stats.devBought, ...stats.knightsPlayed, ...stats.progressPlayed]) {
        expect(Number.isInteger(n) && n >= 0).toBe(true);
      }
    }
  });
});
