/**
 * Voyagers (ships) heuristics shared by both bots: where a new ship helps most. Ships chase good
 * settlement spots (more so on islands that pay special points), treasures and fog, looking several
 * hops ahead over open water since one ship alone rarely reaches land.
 */
import {
  MAPS,
  canHoldSettlement,
  canHoldShip,
  distanceRuleOk,
  islandsAt,
  legalShipSpots,
  piecesLeft,
  shipsInPlay,
  topo,
  type PlayerView,
} from '@/engine';
import { resourceWeights, vertexScore } from './eval';

/** Empty corner where a settlement could stand, ignoring whether the seat's routes reach it yet. */
export function settleable(view: PlayerView, v: number): boolean {
  const t = topo(view);
  if (view.buildings[v] || view.knights[v]) return false;
  if (t.vertices[v].hexes.some((h) => view.board.hexes[h].fog)) return false;
  return canHoldSettlement(view.board, t, v) && distanceRuleOk(view, v);
}

/** Extra worth of settling `v` for Voyagers scoring: an island the seat hasn't scored yet. */
export function islandBonus(view: PlayerView, seat: number, v: number): number {
  const vp = MAPS[view.settings.map]?.islandVP ?? 0;
  const home = view.homeIslands?.[seat];
  if (!vp || !home) return 0;
  const t = topo(view);
  const scored = new Set<number>();
  view.buildings.forEach((b, w) => {
    if (b?.owner === seat) for (const i of islandsAt(view.board, t, w)) scored.add(i);
  });
  return islandsAt(view.board, t, v).some((i) => !home.includes(i) && !scored.has(i)) ? vp * 4 : 0;
}

const DECAY = 0.75;
const LOOKAHEAD = 6;

export function bestShip(view: PlayerView, seat: number): { edge: number; value: number } | null {
  if (!shipsInPlay(view) || piecesLeft(view, seat).ships <= 0) return null;
  const edges = legalShipSpots(view, seat);
  if (!edges.length) return null;
  const t = topo(view);
  const weights = resourceWeights(view);

  // Goals: settlement spots on the water, untaken treasures, and corners next to fog.
  const goal = new Map<number, number>();
  const add = (v: number, value: number) => goal.set(v, Math.max(goal.get(v) ?? 0, value));
  t.vertices.forEach((vx, v) => {
    if (!vx.edges.some((e) => canHoldShip(view.board, t, e))) return;
    if (settleable(view, v)) add(v, vertexScore(view, seat, v, weights) + islandBonus(view, seat, v));
    if (vx.hexes.some((h) => view.board.hexes[h].fog)) add(v, 6);
  });
  for (const tr of view.board.treasures ?? []) if (tr.takenBy === undefined) add(tr.vertex, 8);

  // Distance from every corner to every goal over edges a ship could use.
  const passable = (e: number) => canHoldShip(view.board, t, e) && view.roads[e] === null && (view.ships[e] === null || view.ships[e] === seat);
  const reach = new Map<number, number>(); // corner → best discounted goal value
  for (const [start, value] of goal) {
    const dist = new Map<number, number>([[start, 0]]);
    const queue = [start];
    while (queue.length) {
      const v = queue.shift()!;
      const d = dist.get(v)!;
      const here = value * DECAY ** d;
      if (here > (reach.get(v) ?? 0)) reach.set(v, here);
      if (d >= LOOKAHEAD) continue;
      for (const e of t.vertices[v].edges) {
        if (!passable(e)) continue;
        const w = t.edges[e].a === v ? t.edges[e].b : t.edges[e].a;
        if (!dist.has(w)) {
          dist.set(w, d + 1);
          queue.push(w);
        }
      }
    }
  }

  let best: { edge: number; value: number } | null = null;
  for (const e of edges) {
    const { a, b } = t.edges[e];
    // The far end is the one not already touching our own pieces.
    const own = (v: number) => view.buildings[v]?.owner === seat || t.vertices[v].edges.some((x) => x !== e && view.ships[x] === seat);
    const ends = [a, b].filter((v) => !own(v));
    const value = Math.max(0, ...ends.map((v) => reach.get(v) ?? 0));
    if (!best || value > best.value) best = { edge: e, value };
  }
  return best;
}
