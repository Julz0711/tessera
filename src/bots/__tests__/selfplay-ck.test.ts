import { describe, expect, it } from 'vitest';
import { victoryPoints } from '@/engine';
import { simulateGame } from '../simulate';

describe('cities & knights bot self-play', () => {
  it('finishes 120 games with a legal winner and no rejected actions', () => {
    const turns: number[] = [];
    let attacks = 0;
    let improvements = 0;
    let progressPlayed = 0;
    for (let i = 0; i < 120; i++) {
      const players = 2 + (i % 3);
      const seed = 5000 + i * 31;
      const result = simulateGame(seed, players, 'ck', 12_000);
      if (result.error) throw new Error(`seed ${seed} (${players}p): ${result.error}`);
      const s = result.state;
      expect(s.phase).toBe('ended');
      expect(victoryPoints(s, s.winner!)).toBeGreaterThanOrEqual(s.settings.vpToWin);
      turns.push(s.turn.n);
      attacks += s.barbarian.attacks;
      improvements += s.players.reduce((n, p) => n + p.improvements.trade + p.improvements.politics + p.improvements.science, 0);
      progressPlayed += s.log.filter((e) => e.type === 'progressPlayed').length;
    }
    const avg = turns.reduce((a, b) => a + b, 0) / turns.length;
    console.log(
      `ck self-play: avg ${avg.toFixed(1)} turns (max ${Math.max(...turns)}), ${attacks} barbarian attacks, ${improvements} improvement levels, ${progressPlayed} progress plays in recent logs`,
    );
    expect(attacks).toBeGreaterThan(0);
    expect(improvements).toBeGreaterThan(0);
  });
});
