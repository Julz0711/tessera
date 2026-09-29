import type { Topology } from './board/topology';
import { blockedFor, type Q } from './queries';

/**
 * Length of the longest trail (no edge used twice) through the seat's roads and ships — the Longest
 * Road, or with ships the Longest Trade Route. A trail may end at, but not pass through, a vertex
 * occupied by an opponent's building or knight, and it switches between road and ship only at a vertex
 * holding one of the seat's own buildings.
 */
export function longestRoadLength(s: Q, t: Topology, seat: number): number {
  const ships = s.ships ?? [];
  const used = new Uint8Array(s.roads.length);
  let best = 0;
  const kindOf = (e: number): 0 | 1 | -1 => (s.roads[e] === seat ? 0 : ships[e] === seat ? 1 : -1);

  const dfs = (v: number, len: number, came: 0 | 1 | -1) => {
    if (len > best) best = len;
    if (len > 0 && blockedFor(s, seat, v)) return;
    const own = s.buildings[v]?.owner === seat;
    for (const e of t.vertices[v].edges) {
      const k = kindOf(e);
      if (k < 0 || used[e]) continue;
      if (came >= 0 && k !== came && !own) continue;
      used[e] = 1;
      const edge = t.edges[e];
      dfs(edge.a === v ? edge.b : edge.a, len + 1, k);
      used[e] = 0;
    }
  };

  const starts = new Set<number>();
  for (let e = 0; e < s.roads.length; e++) {
    if (kindOf(e) >= 0) {
      starts.add(t.edges[e].a);
      starts.add(t.edges[e].b);
    }
  }
  for (const v of starts) dfs(v, 0, -1);
  return best;
}
