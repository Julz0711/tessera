import { describe, expect, it } from 'vitest';
import { simulateGame } from '@/bots/simulate';
import { generateBoard } from '../board/generate';
import { getTopology } from '../board/topology';
import { GOLD_RUSH_TERRAIN_COUNTS, HEARTLAKE_NUMBER_TOKENS, HEARTLAKE_TERRAIN_COUNTS, TERRAIN_COUNTS } from '../constants';
import { victoryPoints } from '../vp';
import type { Board, Terrain } from '../types';

const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 3);

function counts(board: Board): Partial<Record<Terrain, number>> {
  const out: Partial<Record<Terrain, number>> = {};
  for (const h of board.hexes) out[h.terrain] = (out[h.terrain] ?? 0) + 1;
  return out;
}
const nonZero = (c: Record<Terrain, number>) => Object.fromEntries(Object.entries(c).filter(([, n]) => n > 0));

/** Harbors never share a corner, and every harbor sits on a coastal edge. */
function harborsValid(board: Board): boolean {
  const topo = getTopology(board.hexes);
  const corners = board.harbors.flatMap((h) => [topo.edges[h.edge].a, topo.edges[h.edge].b]);
  return new Set(corners).size === corners.length && board.harbors.every((h) => topo.edges[h.edge].coastal);
}

describe('map variants', () => {
  it('Gold Rush has two gold fields, never on a 6 or 8', () => {
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'goldRush');
      expect(counts(board)).toEqual(nonZero(GOLD_RUSH_TERRAIN_COUNTS));
      for (const h of board.hexes.filter((x) => x.terrain === 'gold')) expect([6, 8]).not.toContain(h.token);
      expect(board.harbors).toHaveLength(9);
      expect(harborsValid(board)).toBe(true);
    }
  });

  it('Heartlake rings a lake, with three harbors on the lake shore', () => {
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'heartlake');
      expect(board.hexes).toHaveLength(18);
      expect(board.hexes.some((h) => h.q === 0 && h.r === 0)).toBe(false);
      expect(counts(board)).toEqual(nonZero(HEARTLAKE_TERRAIN_COUNTS));
      const tokens = board.hexes.flatMap((h) => (h.token === null ? [] : [h.token])).sort((a, b) => a - b);
      expect(tokens).toEqual([...HEARTLAKE_NUMBER_TOKENS].sort((a, b) => a - b));
      const topo = getTopology(board.hexes);
      const lakeSide = board.harbors.filter((h) => Math.hypot(topo.edges[h.edge].x, topo.edges[h.edge].y) < 1.5);
      expect(lakeSide).toHaveLength(3);
      expect(lakeSide.every((h) => h.kind === 'any')).toBe(true);
      expect(board.harbors).toHaveLength(9);
      expect(harborsValid(board)).toBe(true);
    }
  });

  it('Long Isle is three rows of 6-7-6 with the standard tiles', () => {
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'longIsle');
      expect(board.hexes).toHaveLength(19);
      expect(new Set(board.hexes.map((h) => h.r))).toEqual(new Set([-1, 0, 1]));
      expect(counts(board)).toEqual(nonZero(TERRAIN_COUNTS));
      expect(board.harbors).toHaveLength(9);
      expect(harborsValid(board)).toBe(true);
    }
  });

  it('bots finish games on every new map, in both modes', () => {
    for (const map of ['goldRush', 'heartlake', 'longIsle'] as const) {
      for (const mode of ['classic', 'ck'] as const) {
        for (const seed of [11, 12, 13]) {
          const result = simulateGame(seed, 4, mode, 12_000, map);
          if (result.error) throw new Error(`${map}/${mode} seed ${seed}: ${result.error}`);
          const s = result.state;
          expect(s.phase, `${map}/${mode} seed ${seed}`).toBe('ended');
          expect(victoryPoints(s, s.winner!)).toBeGreaterThanOrEqual(s.settings.vpToWin);
        }
      }
    }
  });
});
