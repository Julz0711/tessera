import { describe, expect, it } from 'vitest';
import { victoryPoints } from '@/engine';
import { simulateGame } from '../simulate';

describe('classic bot self-play', () => {
  it('finishes 150 games with a legal winner and no rejected actions', () => {
    const turns: number[] = [];
    for (let i = 0; i < 150; i++) {
      const players = 2 + (i % 3);
      const result = simulateGame(1000 + i * 17, players);
      if (result.error) throw new Error(`seed ${1000 + i * 17} (${players}p): ${result.error}`);
      const s = result.state;
      expect(s.phase).toBe('ended');
      expect(victoryPoints(s, s.winner!)).toBeGreaterThanOrEqual(s.settings.vpToWin);
      turns.push(s.turn.n);
    }
    const avg = turns.reduce((a, b) => a + b, 0) / turns.length;
    console.log(`classic self-play: avg ${avg.toFixed(1)} turns, max ${Math.max(...turns)}`);
    expect(avg).toBeLessThan(160);
  });
});
