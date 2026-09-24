/** Heuristic evaluation helpers shared by the bot strategies. */
import {
  CARDS,
  PIPS,
  RESOURCES,
  TERRAIN_RESOURCE,
  bankRatio,
  harborKinds,
  topo,
  type Card,
  type Hand,
  type PartialHand,
  type PlayerView,
  type Resource,
} from '@/engine';

export const BASE_WEIGHT: Record<Resource, number> = { brick: 1.1, lumber: 1.1, wool: 0.85, grain: 1.0, ore: 1.0 };

/** Total pips per resource on the board (for scarcity weighting). */
export function boardPips(view: PlayerView): Record<Resource, number> {
  const out: Record<Resource, number> = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 };
  for (const h of view.board.hexes) {
    const res = TERRAIN_RESOURCE[h.terrain];
    if (res && h.token) out[res] += PIPS[h.token];
  }
  return out;
}

export function resourceWeights(view: PlayerView): Record<Resource, number> {
  const pips = boardPips(view);
  const avg = RESOURCES.reduce((n, r) => n + pips[r], 0) / RESOURCES.length;
  const out = { ...BASE_WEIGHT };
  for (const r of RESOURCES) out[r] *= Math.min(1.4, Math.max(0.75, avg / Math.max(1, pips[r])));
  return out;
}

/** Pips a seat already collects per resource (settlement 1×, city 2×). */
export function productionOf(view: PlayerView, seat: number): Record<Resource, number> {
  const t = topo(view);
  const out: Record<Resource, number> = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 };
  view.buildings.forEach((b, v) => {
    if (!b || b.owner !== seat) return;
    for (const h of t.vertices[v].hexes) {
      const hex = view.board.hexes[h];
      const res = TERRAIN_RESOURCE[hex.terrain];
      if (res && hex.token && h !== view.robber) out[res] += PIPS[hex.token] * (b.city ? 2 : 1);
    }
  });
  return out;
}

/** Value of settling on vertex `v` for `seat`. */
export function vertexScore(view: PlayerView, seat: number, v: number, weights = resourceWeights(view)): number {
  const t = topo(view);
  const have = productionOf(view, seat);
  const seen = new Set<Resource>();
  let score = 0;
  for (const h of t.vertices[v].hexes) {
    const hex = view.board.hexes[h];
    const res = TERRAIN_RESOURCE[hex.terrain];
    if (!res || !hex.token) continue;
    const pips = PIPS[hex.token];
    // Diminishing returns for resources we already produce a lot of.
    const saturation = 1 / (1 + have[res] / 10);
    score += pips * weights[res] * saturation * (h === view.robber ? 0.5 : 1);
    seen.add(res);
  }
  score += seen.size * 1.2;
  for (const res of RESOURCES) if (seen.has(res) && have[res] === 0) score += 1.5;
  const harbor = view.board.harbors.find((hb) => {
    const e = t.edges[hb.edge];
    return e.a === v || e.b === v;
  });
  if (harbor) {
    if (harbor.kind === 'any') score += 1.2;
    else score += 0.6 + (have[harbor.kind] + (seen.has(harbor.kind) ? 5 : 0)) / 5;
  }
  return score;
}

export function deficit(hand: PartialHand, cost: PartialHand): number {
  let n = 0;
  for (const c of CARDS) n += Math.max(0, (cost[c] ?? 0) - (hand[c] ?? 0));
  return n;
}

/**
 * Tries to find one bank trade that reduces the deficit for `cost` using only surplus cards.
 * Returns null when no helpful trade exists.
 */
export function bankTradeToward(
  view: PlayerView,
  seat: number,
  hand: Hand,
  cost: PartialHand,
  allowed: readonly Card[] = RESOURCES,
): { give: Card; get: Card } | null {
  const missing = allowed.filter((c) => (cost[c] ?? 0) > hand[c] && view.bank[c] > 0);
  if (!missing.length) return null;
  let best: { give: Card; get: Card; spare: number } | null = null;
  for (const give of allowed) {
    const ratio = bankRatio(view, seat, give);
    const spare = hand[give] - (cost[give] ?? 0);
    if (spare < ratio) continue;
    const get = missing[0];
    const score = spare - ratio;
    if (!best || score > best.spare) best = { give, get, spare: score };
  }
  return best ? { give: best.give, get: best.get } : null;
}

export function hasHarbor(view: PlayerView, seat: number, card: Card): boolean {
  return harborKinds(view, seat).has(card as Resource);
}
