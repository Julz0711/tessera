import { describe, expect, it } from 'vitest';
import { generateBoard } from '../board/generate';
import { STANDARD_HEX_COORDS, getTopology } from '../board/topology';
import { HARBOR_KINDS, NUMBER_TOKENS, TERRAIN_COUNTS } from '../constants';

const topo = getTopology(STANDARD_HEX_COORDS);

describe('generateBoard', () => {
  const seeds = Array.from({ length: 200 }, (_, i) => i * 7919 + 1);

  it('uses the standard terrain and token distribution', () => {
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed });
      const counts: Record<string, number> = {};
      for (const h of board.hexes) counts[h.terrain] = (counts[h.terrain] ?? 0) + 1;
      expect(counts).toEqual(TERRAIN_COUNTS);
      for (const h of board.hexes) expect(h.token === null).toBe(h.terrain === 'desert');
      const tokens = board.hexes.flatMap((h) => (h.token === null ? [] : [h.token])).sort((a, b) => a - b);
      expect(tokens).toEqual([...NUMBER_TOKENS].sort((a, b) => a - b));
    }
  });

  it('never puts red numbers (6/8) or equal numbers next to each other', () => {
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed });
      for (const h of topo.hexes) {
        const t = board.hexes[h.id].token;
        if (t === null) continue;
        for (const n of h.neighbors) {
          const u = board.hexes[n].token;
          if (u === null) continue;
          expect(t === u, `seed ${seed}: equal tokens ${t} adjacent`).toBe(false);
          expect((t === 6 || t === 8) && (u === 6 || u === 8), `seed ${seed}: red tokens adjacent`).toBe(false);
        }
      }
    }
  });

  it('places 9 harbors on distinct coastal edges without shared corners', () => {
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed });
      expect(board.harbors).toHaveLength(9);
      expect(board.harbors.map((h) => h.kind).sort()).toEqual([...HARBOR_KINDS].sort());
      const corners = new Set<number>();
      for (const harbor of board.harbors) {
        const e = topo.edges[harbor.edge];
        expect(e.coastal).toBe(true);
        expect(corners.has(e.a) || corners.has(e.b)).toBe(false);
        corners.add(e.a);
        corners.add(e.b);
      }
    }
  });

  it('is deterministic for a seed', () => {
    expect(generateBoard({ rng: 42 })).toEqual(generateBoard({ rng: 42 }));
    expect(generateBoard({ rng: 42 })).not.toEqual(generateBoard({ rng: 43 }));
  });
});
