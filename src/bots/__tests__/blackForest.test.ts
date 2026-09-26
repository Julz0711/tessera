import { describe, expect, it } from 'vitest';
import { getTopology } from '@/engine/board/topology';
import type { Mode } from '@/engine';
import { simulateGame } from '../simulate';

/** The game right after setup (six players: two settlements and two roads each, plus any picks). */
function afterSetup(seed: number, mode: Mode) {
  for (let n = 24; n < 40; n++) {
    const { state } = simulateGame(seed, 6, mode, n, 'blackForest');
    if (state.phase === 'play') return state;
  }
  throw new Error('setup did not finish');
}

const placedIn = (buildings: ({ owner: number } | null)[]) => buildings.flatMap((b, v) => (b ? [{ v, owner: b.owner }] : []));

describe('Black Forest setup', () => {
  for (const mode of ['classic', 'ck'] as const) {
    it(`starts in the forest, on the lake harbors first and further out second (${mode})`, () => {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const s = afterSetup(seed, mode);
        const t = getTopology(s.board.hexes);
        const forest = (v: number) => t.vertices[v].hexes.every((h) => s.board.hexes[h].terrain === 'forest');
        const placed = placedIn(s.buildings);
        expect(placed).toHaveLength(12);
        // The rule: starting settlements stand in the forest (their roads may lead out).
        for (const { v } of placed) expect(forest(v)).toBe(true);

        // The bots' preference: the first round (12 actions: a settlement and a road each) takes the
        // harbors on the lake, the second round goes further out.
        const first = placedIn(simulateGame(seed, 6, mode, 12, 'blackForest').state.buildings);
        expect(first).toHaveLength(6);
        const harborCorners = new Set(s.board.harbors.flatMap((h) => [t.edges[h.edge].a, t.edges[h.edge].b]));
        expect(first.filter(({ v }) => harborCorners.has(v)).length).toBeGreaterThanOrEqual(4);
        const dist = (v: number) => Math.hypot(t.vertices[v].x, t.vertices[v].y);
        for (const { v, owner } of first) {
          const second = placed.find((p) => p.owner === owner && p.v !== v)!;
          expect(dist(second.v)).toBeGreaterThan(dist(v));
        }
      }
    });
  }
});
