import { HARBOR_COAST_SLOTS, HARBOR_KINDS, NUMBER_TOKENS, TERRAIN_COUNTS } from '../constants';
import { shuffle, type RngHolder } from '../rng';
import type { Board, Hex, Terrain } from '../types';
import { STANDARD_HEX_COORDS, getTopology, type Topology } from './topology';

const isRed = (t: number | null) => t === 6 || t === 8;

function tokensValid(topo: Topology, tokens: (number | null)[]): boolean {
  for (const h of topo.hexes) {
    const t = tokens[h.id];
    if (t === null) continue;
    for (const n of h.neighbors) {
      const u = tokens[n];
      if (u === null) continue;
      if (t === u) return false;
      if (isRed(t) && isRed(u)) return false;
    }
  }
  return true;
}

/** Random "balanced" standard board: no adjacent 6/8 and no adjacent equal numbers. */
export function generateBoard(rng: RngHolder): Board {
  const topo = getTopology(STANDARD_HEX_COORDS);

  const terrains: Terrain[] = [];
  for (const [terrain, count] of Object.entries(TERRAIN_COUNTS) as [Terrain, number][]) {
    for (let i = 0; i < count; i++) terrains.push(terrain);
  }
  shuffle(rng, terrains);

  const landIds = topo.hexes.filter((h) => terrains[h.id] !== 'desert').map((h) => h.id);
  let tokens: (number | null)[] = [];
  for (let attempt = 0; attempt < 5000; attempt++) {
    const bag = shuffle(rng, [...NUMBER_TOKENS]);
    tokens = topo.hexes.map(() => null);
    landIds.forEach((id, i) => (tokens[id] = bag[i]));
    if (tokensValid(topo, tokens)) break;
  }

  const hexes: Hex[] = topo.hexes.map((h) => ({
    id: h.id,
    q: h.q,
    r: h.r,
    terrain: terrains[h.id],
    token: tokens[h.id],
  }));

  const kinds = shuffle(rng, [...HARBOR_KINDS]);
  const harbors = HARBOR_COAST_SLOTS.map((slot, i) => ({ edge: topo.coast[slot], kind: kinds[i] }));

  return { hexes, harbors };
}
