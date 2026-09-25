import { describe, expect, it } from 'vitest';
import { expected, placesFrom, ratingChanges } from '../rating';

describe('rating', () => {
  it('expects equal players to split the points', () => {
    expect(expected(1000, 1000)).toBeCloseTo(0.5);
    expect(expected(1400, 1000)).toBeGreaterThan(0.9);
  });

  it('moves the winner up and the loser down by the same amount between equals', () => {
    const [a, b] = ratingChanges([
      { rating: 1000, games: 40, place: 1 },
      { rating: 1000, games: 40, place: 2 },
    ]);
    expect(a).toBe(12);
    expect(b).toBe(-12);
  });

  it('rewards an upset more than an expected win', () => {
    const upset = ratingChanges([
      { rating: 900, games: 40, place: 1 },
      { rating: 1300, games: 40, place: 2 },
    ])[0];
    const expectedWin = ratingChanges([
      { rating: 1300, games: 40, place: 1 },
      { rating: 900, games: 40, place: 2 },
    ])[0];
    expect(upset).toBeGreaterThan(expectedWin);
  });

  it('ranks by standing in bigger games and treats equal points as a draw', () => {
    const places = placesFrom([10, 7, 7, 4], 0);
    expect(places).toEqual([1, 2, 2, 4]);
    const d = ratingChanges(places.map((place) => ({ rating: 1000, games: 50, place })));
    expect(d[0]).toBeGreaterThan(0);
    expect(d[1]).toBe(d[2]);
    expect(d[3]).toBeLessThan(0);
    expect(Math.abs(d.reduce((a, b) => a + b, 0))).toBeLessThanOrEqual(2);
  });

  it('puts the winner first even when others tie their points', () => {
    expect(placesFrom([10, 10, 3], 1)).toEqual([2, 1, 3]);
  });

  it('gives no rating for a lone rated player', () => {
    expect(ratingChanges([{ rating: 1000, games: 0, place: 1 }])).toEqual([0]);
  });
});
