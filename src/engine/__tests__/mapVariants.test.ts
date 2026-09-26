import { describe, expect, it } from 'vitest';
import { simulateGame } from '@/bots/simulate';
import { generateBoard } from '../board/generate';
import { VULCAN_TILES, getTopology } from '../board/topology';
import { FOUR_LAKES_TERRAIN_COUNTS, GOLD_RUSH_TERRAIN_COUNTS, HEARTLAKE_NUMBER_TOKENS, HEARTLAKE_TERRAIN_COUNTS, TERRAIN_COUNTS } from '../constants';
import { legalSettlementSpots } from '../queries';
import { createGame } from '../state';
import { victoryPoints } from '../vp';
import { MAP_IDS, type Board, type Terrain } from '../types';

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
  it('Gold Rush rings seven fogged hexes, one of them gold', () => {
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'goldRush');
      expect(board.hexes).toHaveLength(31);
      const fog = board.hexes.filter((h) => h.fog);
      expect(fog).toHaveLength(7);
      for (const h of fog) expect(Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r))).toBeLessThanOrEqual(1);
      expect(fog.filter((h) => h.terrain === 'gold')).toHaveLength(1);
      expect(board.hexes.filter((h) => h.terrain === 'gold')).toHaveLength(1);
      for (const h of board.hexes.filter((x) => x.terrain === 'gold')) expect([6, 8]).not.toContain(h.token);
      expect(counts({ ...board, hexes: board.hexes.filter((h) => !h.fog) })).toEqual(nonZero(GOLD_RUSH_TERRAIN_COUNTS));
      expect(board.harbors).toHaveLength(9);
      expect(harborsValid(board)).toBe(true);
    }
  });

  it('Vulcan keeps the reference layout, shuffling the corners and numbers from its own sets', () => {
    const code: Record<string, string> = { hills: 'B', pasture: 'W', fields: 'Gr', forest: 'L', mountains: 'O', desert: 'D', gold: 'G' };
    const kindOf = (c: string) => /^[A-Z][a-z]?/.exec(c)?.[0] ?? '?';
    const numberOf = (c: string) => Number(/\d+/.exec(c)?.[0]);
    const isCorner = (c: string) => ['B', 'W', 'Gr', 'L'].includes(kindOf(c));
    const sorted = <T,>(xs: T[]) => [...xs].sort();
    const ref = VULCAN_TILES.map((t) => t.code);
    const cornerRef = ref.filter(isCorner);
    let differs = false;
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'vulcan');
      expect(board.hexes).toHaveLength(71);
      const corners: string[] = [];
      const mountainNumbers: number[] = [];
      board.hexes.forEach((h, i) => {
        const expected = ref[i];
        expect({ q: h.q, r: h.r }).toEqual({ q: VULCAN_TILES[i].q, r: VULCAN_TILES[i].r });
        const got = `${code[h.terrain]}${h.token ?? ''}`;
        if (expected === '?') expect(h.fog).toBe(true);
        else if (isCorner(expected)) corners.push(got);
        else if (kindOf(expected) === 'O') {
          expect(h.terrain).toBe('mountains');
          mountainNumbers.push(h.token!);
        } else expect(got).toBe(expected); // ash and the volcano stay put
      });
      // The corners hold the reference's tiles and numbers, shuffled: never a 2, 3, 11 or 12.
      expect(sorted(corners.map(kindOf))).toEqual(sorted(cornerRef.map(kindOf)));
      expect(sorted(corners.map(numberOf))).toEqual(sorted(cornerRef.map(numberOf)));
      expect(sorted(mountainNumbers)).toEqual(sorted(ref.filter((c) => kindOf(c) === 'O').map(numberOf)));
      if (corners.join() !== cornerRef.join()) differs = true;
      // No 6 or 8 next to another (the volcano's 6 included).
      const topo = getTopology(board.hexes);
      for (const h of board.hexes) {
        if (h.token !== 6 && h.token !== 8) continue;
        for (const n of topo.hexes[h.id].neighbors) expect([6, 8]).not.toContain(board.hexes[n].token);
      }
    expect(board.hexes.find((h) => h.q === 0 && h.r === 0)).toMatchObject({ terrain: 'gold', token: 6 });
      expect(board.hexes.filter((h) => h.fog)).toHaveLength(18);
      const start = board.hexes.filter((h) => h.start);
      expect(start).toHaveLength(20);
      expect(start.every((h) => ['hills', 'pasture', 'fields', 'forest'].includes(h.terrain))).toBe(true);
      expect(board.harbors).toHaveLength(12);
      expect(harborsValid(board)).toBe(true);
    }
    expect(differs).toBe(true);
    // Starting settlements: any corner touching a starting tile, up to the desert beside it.
    const s = createGame({ seed: 5, mode: 'classic', players: ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id, color: 'red' as const, isBot: true })), settings: { map: 'vulcan' } });
    const topo = getTopology(s.board.hexes);
    const spots = legalSettlementSpots(s, 0, true);
    for (const v of spots) {
      const hexes = topo.vertices[v].hexes.map((h) => s.board.hexes[h]);
      expect(hexes.some((h) => h.start)).toBe(true);
      expect(hexes.every((h) => h.start || h.terrain === 'desert')).toBe(true);
    }
    expect(spots.some((v) => topo.vertices[v].hexes.some((h) => s.board.hexes[h].terrain === 'desert'))).toBe(true);
  });

  it('numbers every tile but the deserts on every map', () => {
    for (const map of MAP_IDS) {
      for (const seed of seeds.slice(0, 20)) {
        const board = generateBoard({ rng: seed }, map);
        for (const h of board.hexes) expect(h.token === null, `${map} seed ${seed} hex ${h.id} (${h.terrain})`).toBe(h.terrain === 'desert');
        // And no 6 or 8 ever sits next to another.
        const topo = getTopology(board.hexes);
        for (const h of board.hexes) {
          if (h.token !== 6 && h.token !== 8) continue;
          for (const n of topo.hexes[h.id].neighbors) expect([6, 8], `${map} seed ${seed} hex ${h.id}`).not.toContain(board.hexes[n].token);
        }
      }
    }
  });

  it('Four Lakes is the 39-hex pinwheel with four lakes', () => {
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'fourLakes');
      expect(board.hexes).toHaveLength(39);
      expect(counts(board)).toEqual(nonZero(FOUR_LAKES_TERRAIN_COUNTS));
      expect(board.harbors).toHaveLength(11);
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
    for (const map of ['goldRush', 'vulcan', 'heartlake', 'longIsle', 'fourLakes'] as const) {
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
