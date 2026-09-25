import { describe, expect, it } from 'vitest';
import { getTopology } from '@/engine/board/topology';
import { simulateGame } from '../simulate';

describe('Black Forest setup', () => {
  it('places every starting settlement and road in the forest', () => {
    for (const mode of ['classic', 'ck'] as const) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        // Six players place two settlements and two roads each: stop just after setup.
        const { state: s } = simulateGame(seed, 6, mode, 24, 'blackForest');
        expect(s.phase).toBe('play');
        const t = getTopology(s.board.hexes);
        const forest = (v: number) => t.vertices[v].hexes.every((h) => s.board.hexes[h].terrain === 'forest');
        const placed = s.buildings.flatMap((b, v) => (b ? [v] : []));
        expect(placed).toHaveLength(12);
        for (const v of placed) expect(forest(v)).toBe(true);
        const roads = s.roads.flatMap((o, e) => (o === null ? [] : [e]));
        expect(roads).toHaveLength(12);
        for (const e of roads) expect(forest(t.edges[e].a) && forest(t.edges[e].b)).toBe(true);
        // Nothing under the fog was discovered during setup.
        expect(s.board.hexes.filter((h) => h.fog)).toHaveLength(30);
      }
    }
  });
});
