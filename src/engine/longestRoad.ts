import type { Topology } from './board/topology';
import { blockedFor, type Q } from './queries';

/**
 * Length of the longest trail (no edge used twice) in the seat's road network. A trail may end
 * at, but not pass through, a vertex occupied by an opponent's building or knight.
 */
export function longestRoadLength(s: Q, t: Topology, seat: number): number {
  const used = new Uint8Array(s.roads.length);
  let best = 0;

  const dfs = (v: number, len: number) => {
    if (len > best) best = len;
    if (len > 0 && blockedFor(s, seat, v)) return;
    for (const e of t.vertices[v].edges) {
      if (s.roads[e] !== seat || used[e]) continue;
      used[e] = 1;
      const edge = t.edges[e];
      dfs(edge.a === v ? edge.b : edge.a, len + 1);
      used[e] = 0;
    }
  };

  const starts = new Set<number>();
  s.roads.forEach((owner, e) => {
    if (owner === seat) {
      starts.add(t.edges[e].a);
      starts.add(t.edges[e].b);
    }
  });
  for (const v of starts) dfs(v, 0);
  return best;
}
