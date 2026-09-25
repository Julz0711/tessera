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

describe('large map self-play', () => {
  it('finishes 5–6 player games on the large map in both modes', () => {
    for (let i = 0; i < 8; i++) {
      const players = 5 + (i % 2);
      const mode = i % 4 < 2 ? 'classic' : 'ck';
      const seed = 5000 + i * 31;
      const result = simulateGame(seed, players, mode, 12000, 'large');
      if (result.error) throw new Error(`seed ${seed} (${players}p ${mode}): ${result.error}`);
      expect(result.state.phase).toBe('ended');
      expect(result.state.board.hexes).toHaveLength(30);
      expect(result.state.players).toHaveLength(players);
    }
  });
});

describe('Black Forest self-play', () => {
  it('finishes games in both modes, discovering fog tiles along the way', () => {
    let revealed = 0;
    for (let i = 0; i < 6; i++) {
      const players = 3 + (i % 2);
      const mode = i < 3 ? 'classic' : 'ck';
      const seed = 9000 + i * 43;
      const result = simulateGame(seed, players, mode, 12000, 'blackForest');
      if (result.error) throw new Error(`seed ${seed} (${players}p ${mode}): ${result.error}`);
      expect(result.state.phase).toBe('ended');
      revealed += 30 - result.state.board.hexes.filter((h) => h.fog).length;
    }
    expect(revealed).toBeGreaterThan(0);
  });
});
