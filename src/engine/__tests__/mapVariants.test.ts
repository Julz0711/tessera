import { describe, expect, it } from 'vitest';
import { simulateGame } from '@/bots/simulate';
import { applyAction } from '../apply';
import { generateBoard } from '../board/generate';
import { VULCAN_TILES, getTopology } from '../board/topology';
import { FOUR_LAKES_TERRAIN_COUNTS, GOLD_RUSH_TERRAIN_COUNTS, HEARTLAKE_NUMBER_TOKENS, HEARTLAKE_TERRAIN_COUNTS, MAX_PLAYERS, TERRAIN_COUNTS } from '../constants';
import { legalSettlementSpots, legalSetupRoads } from '../queries';
import { MAPS, mapSupports } from '../maps';
import { createGame } from '../state';
import { viewFor } from '../view';
import { victoryPoints } from '../vp';
import { MAP_IDS, type Action, type Board, type GameState, type Terrain } from '../types';

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
  it('keeps map metadata complete and enforces compatibility tags', () => {
    expect(Object.keys(MAPS)).toEqual([...MAP_IDS]);
    for (const map of MAP_IDS) {
      expect(MAPS[map].id).toBe(map);
      expect(MAPS[map].name).not.toBe('');
      expect(MAPS[map].blurb).not.toBe('');
      expect(MAPS[map].requires).toContain('base');
      expect(mapSupports(map, 'classic')).toBe(true);
      expect(mapSupports(map, 'ck')).toBe(true);
      expect(MAX_PLAYERS[map]).toBe(MAPS[map].maxPlayers);
    }
  });

  it('Gold Rush rings seven fogged hexes, one of them gold', () => {
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'goldRush');
      expect(board.hexes).toHaveLength(31);
      const fog = board.hexes.filter((h) => h.fog);
      expect(fog).toHaveLength(7);
      for (const h of fog) expect(Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(h.q + h.r))).toBeLessThanOrEqual(1);
      expect(fog.filter((h) => h.terrain === 'gold')).toHaveLength(1);
      expect(board.hexes.filter((h) => h.terrain === 'gold')).toHaveLength(1);
      // The gold is always a 6 or an 8, and the fog hides nothing worse than a 4 or a 10.
      for (const h of board.hexes.filter((x) => x.terrain === 'gold')) expect([6, 8], `seed ${seed}`).toContain(h.token);
      for (const h of fog) expect([4, 5, 6, 8, 9, 10], `seed ${seed} hex ${h.id}`).toContain(h.token);
      // The ring is numbered like an island of its own.
      const ringTokens = board.hexes.filter((h) => !h.fog && h.token !== null).map((h) => h.token!);
      expect(ringTokens.sort((a, b) => a - b)).toEqual([2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 12]);
      expect(counts({ ...board, hexes: board.hexes.filter((h) => !h.fog) })).toEqual(nonZero(GOLD_RUSH_TERRAIN_COUNTS));
      expect(board.harbors).toHaveLength(9);
      expect(harborsValid(board)).toBe(true);
    }
  });

  it('keeps everyone to the same starting corners, whatever the starting roads uncover', () => {
    const touchesFog = (s: GameState, v: number) => getTopology(s.board.hexes).vertices[v].hexes.some((h) => s.board.hexes[h].fog);
    for (const map of ['goldRush', 'blackForest', 'vulcan'] as const) {
      for (const seed of [1, 2, 3]) {
        const players = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id, color: 'red' as const, isBot: false }));
        let s = createGame({ seed, mode: 'classic', players, settings: { map } });
        const t = getTopology(s.board.hexes);
        const corners = new Set(legalSettlementSpots(s, 0, true));
        const fogged = new Set(s.board.hexes.filter((h) => h.fog).map((h) => h.id));
        const act = (seat: number, action: Action) => {
          const r = applyAction(s, seat, action);
          if (!r.ok) throw new Error(`${map} seed ${seed}: ${action.type} rejected: ${r.error}`);
          s = r.state;
        };
        const intoFog = (e: number) => [t.edges[e].a, t.edges[e].b].some((w) => touchesFog(s, w));
        while (s.phase === 'setup') {
          const seat = s.setup!.order[s.setup!.index];
          const spots = legalSettlementSpots(s, seat, true);
          for (const v of spots) expect(corners.has(v), `${map} seed ${seed}: corner ${v} opened up`).toBe(true);
          // Players' own views agree (the board shows what was uncovered).
          expect(legalSettlementSpots(viewFor(s, seat), seat, true)).toEqual(spots);
          // Settle where a road can run into the fog, and send the road there.
          const v = spots.find((x) => t.vertices[x].edges.some((e) => s.roads[e] === null && intoFog(e))) ?? spots[0];
          act(seat, { type: 'buildSettlement', vertex: v });
          const roads = legalSetupRoads(s);
          act(seat, { type: 'buildRoad', edge: roads.find(intoFog) ?? roads[0] });
          for (const p of s.pending) if (p.kind === 'goldPick') act(p.seat, { type: 'pickGold', cards: { brick: p.count } });
        }
        // The starting roads did uncover tiles, yet no starting settlement touches one.
        expect(s.board.hexes.some((h) => fogged.has(h.id) && !h.fog), `${map} seed ${seed}`).toBe(true);
        for (const [v, b] of s.buildings.entries()) {
          if (b) expect(t.vertices[v].hexes.some((h) => fogged.has(h)), `${map} seed ${seed}: settlement ${v}`).toBe(false);
        }
      }
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
      // Each corner (left/right of the volcano, above/below it) gets exactly one 6 or 8.
      const reds = [0, 0, 0, 0];
      board.hexes.forEach((h, i) => {
        if (isCorner(ref[i]) && (h.token === 6 || h.token === 8)) reds[(h.q + h.r / 2 > 0 ? 1 : 0) + (h.r > 0 ? 2 : 0)]++;
      });
      expect(reds).toEqual([1, 1, 1, 1]);
      const cornerReds = board.hexes.filter((h, i) => isCorner(ref[i]) && (h.token === 6 || h.token === 8)).map((h) => h.token);
      expect(sorted(cornerReds)).toEqual([6, 6, 8, 8]);
      // The mountains around the volcano only ever get a 4, 5, 9 or 10.
      const volcano = board.hexes.find((h) => h.terrain === 'gold')!;
      const ring = getTopology(board.hexes).hexes[volcano.id].neighbors.map((n) => board.hexes[n]);
      expect(ring.every((h) => h.terrain === 'mountains' && [4, 5, 9, 10].includes(h.token!))).toBe(true);
      // The fog never hides a desert.
      expect(board.hexes.filter((h) => h.fog).every((h) => h.terrain !== 'desert' && h.token !== null)).toBe(true);
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
