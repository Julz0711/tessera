import { describe, expect, it } from 'vitest';
import { dealStats, generateBoard } from '../board/generate';
import { getTopology } from '../board/topology';
import { MAP_IDS, type MapId } from '../types';

const seeds = Array.from({ length: 100 }, (_, i) => i * 7919 + 5);
/** Maps whose gold fields hold a fixed 6 or 8: two of them side by side are the map's own doing. */
const FIXED_GOLD = new Set<MapId>(['blackForest', 'goldRush', 'vulcan', 'citadel', 'zealand']);
const red = (t: number) => t === 6 || t === 8;

describe('number tokens on every map', () => {
  for (const map of MAP_IDS) {
    // Only Black Forest and Zealand deal differently without gold.
    for (const gold of map === 'blackForest' || map === 'zealand' ? [true, false] : [true]) {
      it(`${map}${gold ? '' : ' (no gold)'}: no equal numbers and no 6/8 touch`, () => {
        const before = dealStats.fallbacks;
        for (const seed of seeds) {
          const board = generateBoard({ rng: seed }, map, { gold });
          const topo = getTopology(board.hexes);
          for (const h of board.hexes) {
            if (h.token === null) continue;
            for (const n of topo.hexes[h.id].neighbors) {
              const o = board.hexes[n];
              if (o.token === null) continue;
              if (FIXED_GOLD.has(map) && h.terrain === 'gold' && o.terrain === 'gold') continue;
              expect(h.token === o.token, `${map} seed ${seed}: ${h.token} next to ${o.token}`).toBe(false);
              expect(red(h.token) && red(o.token), `${map} seed ${seed}: ${h.token} next to ${o.token}`).toBe(false);
            }
          }
        }
        expect(dealStats.fallbacks, 'a valid deal was always found').toBe(before);
      });
    }
  }
});
