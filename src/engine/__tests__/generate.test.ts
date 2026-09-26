import { describe, expect, it } from 'vitest';
import { generateBoard } from '../board/generate';
import { BLACK_FOREST_HEX_COORDS, LARGE_HEX_COORDS, STANDARD_HEX_COORDS, getTopology } from '../board/topology';
import { applyAction } from '../apply';
import { legalSetupRoads, legalSettlementSpots } from '../queries';
import { createGame } from '../state';
import { viewFor } from '../view';
import { BLACK_FOREST_TOKENS, TERRAIN_RESOURCE, HARBOR_KINDS, LARGE_HARBOR_KINDS, LARGE_NUMBER_TOKENS, LARGE_TERRAIN_COUNTS, NUMBER_TOKENS, TERRAIN_COUNTS } from '../constants';

const topo = getTopology(STANDARD_HEX_COORDS);

describe('generateBoard', () => {
  const seeds = Array.from({ length: 200 }, (_, i) => i * 7919 + 1);

  it('uses the standard terrain and token distribution', () => {
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed });
      const counts: Record<string, number> = {};
      for (const h of board.hexes) counts[h.terrain] = (counts[h.terrain] ?? 0) + 1;
      expect(counts).toEqual(Object.fromEntries(Object.entries(TERRAIN_COUNTS).filter(([, n]) => n > 0)));
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

describe('generateBoard (large 5–6 player map)', () => {
  const large = getTopology(LARGE_HEX_COORDS);
  const seeds = Array.from({ length: 60 }, (_, i) => i * 104729 + 3);

  it('has 30 hexes with the extension terrain, tokens and harbors', () => {
    expect(LARGE_HEX_COORDS).toHaveLength(30);
    for (const seed of seeds) {
      const board = generateBoard({ rng: seed }, 'large');
      const counts: Record<string, number> = {};
      for (const h of board.hexes) counts[h.terrain] = (counts[h.terrain] ?? 0) + 1;
      expect(counts).toEqual(Object.fromEntries(Object.entries(LARGE_TERRAIN_COUNTS).filter(([, n]) => n > 0)));
      const tokens = board.hexes.flatMap((h) => (h.token === null ? [] : [h.token])).sort((a, b) => a - b);
      expect(tokens).toEqual([...LARGE_NUMBER_TOKENS].sort((a, b) => a - b));
      expect(board.harbors.map((h) => h.kind).sort()).toEqual([...LARGE_HARBOR_KINDS].sort());
      // Harbors sit on distinct coast edges that never share a corner.
      const corners = board.harbors.flatMap((h) => [large.edges[h.edge].a, large.edges[h.edge].b]);
      expect(new Set(corners).size).toBe(corners.length);
      for (const h of board.harbors) expect(large.coast).toContain(h.edge);
    }
  });
});

describe('generateBoard (Black Forest)', () => {
  const bf = getTopology(BLACK_FOREST_HEX_COORDS);

  it('rings a desert lake island with visible forest and hides the rest under fog', () => {
    expect(BLACK_FOREST_HEX_COORDS).toHaveLength(55);
    for (let seed = 1; seed < 40; seed++) {
      const board = generateBoard({ rng: seed * 7717 }, 'blackForest');
      const visible = board.hexes.filter((h) => !h.fog);
      const fog = board.hexes.filter((h) => h.fog);
      expect(visible.filter((h) => h.terrain === 'desert')).toHaveLength(1);
      expect(visible.filter((h) => h.terrain === 'forest')).toHaveLength(24);
      expect(fog).toHaveLength(30);
      const counts: Record<string, number> = {};
      for (const h of fog) counts[h.terrain] = (counts[h.terrain] ?? 0) + 1;
      expect(counts).toEqual({ hills: 7, pasture: 7, fields: 7, mountains: 7, gold: 2 });
      for (const h of fog.filter((x) => x.terrain === 'gold')) expect([6, 8]).toContain(h.token);
      // The starting forest has colonist's numbers, dealt at random; 6s and 8s never side by side.
      const forest = visible.filter((h) => h.terrain === 'forest');
      const tokens = forest.map((h) => h.token!);
      expect([...tokens].sort((x, y) => x - y)).toEqual([...BLACK_FOREST_TOKENS].sort((x, y) => x - y));
      for (const h of board.hexes) {
        if (h.token !== 6 && h.token !== 8) continue;
        for (const n of bf.hexes[h.id].neighbors) expect([6, 8]).not.toContain(board.hexes[n].token);
      }
      expect(board.harbors).toHaveLength(6);
      for (const h of board.harbors) {
        expect(h.kind).toBe('lumber');
        expect(bf.coast).toContain(h.edge);
      }
    }
  });

  it('pays out what a starting road uncovers in the fog', () => {
    const players = [0, 1].map((i) => ({ id: `p${i}`, name: `P${i}`, color: (['red', 'blue'] as const)[i], isBot: false }));
    const start = createGame({ seed: 11, mode: 'classic', players, settings: { map: 'blackForest' } });
    const seat = start.setup!.order[0];
    // Find a starting settlement whose road can run into the fog, then build them.
    for (const v of legalSettlementSpots(start, seat, true)) {
      const placed = applyAction(start, seat, { type: 'buildSettlement', vertex: v });
      if (!placed.ok) continue;
      const s = placed.state;
      const t = getTopology(s.board.hexes);
      const edge = legalSetupRoads(s).find((e) => [t.edges[e].a, t.edges[e].b].some((x) => t.vertices[x].hexes.some((h) => s.board.hexes[h].fog)));
      if (edge === undefined) continue;
      const found = [t.edges[edge].a, t.edges[edge].b].flatMap((x) => t.vertices[x].hexes).filter((h, i, all) => all.indexOf(h) === i && s.board.hexes[h].fog);
      const after = applyAction(s, seat, { type: 'buildRoad', edge });
      expect(after.ok).toBe(true);
      if (!after.ok) return;
      const paying = found.filter((h) => TERRAIN_RESOURCE[s.board.hexes[h].terrain]);
      expect(Object.values(after.state.players[seat].hand).reduce((a, b) => a + b, 0)).toBe(paying.length);
      expect(after.events.some((e) => e.type === 'received' && e.reason === 'discovery')).toBe(paying.length > 0);
      return;
    }
    throw new Error('no starting road reaches the fog on this board');
  });

  it('leaves the gold fields out when gold is switched off', () => {
    for (let seed = 1; seed < 40; seed++) {
      const board = generateBoard({ rng: seed * 7717 }, 'blackForest', { gold: false });
      const fog = board.hexes.filter((h) => h.fog);
      expect(fog).toHaveLength(30);
      expect(board.hexes.some((h) => h.terrain === 'gold')).toBe(false);
      for (const h of fog) expect(h.token).not.toBeNull();
    }
    const players = [0, 1].map((i) => ({ id: `p${i}`, name: `P${i}`, color: (['red', 'blue'] as const)[i], isBot: false }));
    const s = createGame({ seed: 3, mode: 'classic', players, settings: { map: 'blackForest', gold: false } });
    expect(s.settings.gold).toBe(false);
    expect(s.board.hexes.some((h) => h.terrain === 'gold')).toBe(false);
  });

  it('keeps fogged tiles secret in player views', () => {
    const players = [0, 1, 2].map((i) => ({ id: `p${i}`, name: `P${i}`, color: (['red', 'blue', 'white'] as const)[i], isBot: false }));
    const s = createGame({ seed: 42, mode: 'classic', players, settings: { map: 'blackForest' } });
    const view = viewFor(s, 0);
    const hidden = view.board.hexes.filter((h) => h.fog);
    expect(hidden).toHaveLength(30);
    for (const h of hidden) {
      expect(h.terrain).toBe('desert');
      expect(h.token).toBeNull();
    }
    expect(s.board.hexes.filter((h) => h.terrain === 'gold')).toHaveLength(2);

    // Once the game is over the whole map is shown.
    const ended = viewFor({ ...s, phase: 'ended' }, 0);
    expect(ended.board.hexes.some((h) => h.fog)).toBe(false);
    expect(ended.board.hexes.filter((h) => h.terrain === 'gold')).toHaveLength(2);
  });
});
