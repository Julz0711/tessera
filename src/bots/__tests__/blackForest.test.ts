import { describe, expect, it } from 'vitest';
import { getTopology } from '@/engine/board/topology';
import { simulateGame } from '../simulate';

describe('Black Forest setup', () => {
  it('places every starting settlement on a corner touching only forest', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      // Six players place two settlements and two roads each: stop just after setup.
      const { state: s } = simulateGame(seed, 6, 'classic', 26, 'blackForest');
      expect(s.phase).toBe('play');
      const t = getTopology(s.board.hexes);
      const placed = s.buildings.flatMap((b, v) => (b ? [v] : []));
      expect(placed).toHaveLength(12);
      for (const v of placed) for (const h of t.vertices[v].hexes) expect(s.board.hexes[h].terrain).toBe('forest');
    }
  });
});
