import type { Board } from '../types';
import type { Topology } from './topology';

/**
 * Land/sea helpers (Voyagers). Sea hexes are ordinary hexes with `terrain: 'sea'`; nothing here changes
 * boards without them. Board edges with no hex behind them are treated as open water, as the frame is in
 * the Seafarers rules, so a land hex on the rim still has a coast.
 */
/** Open water. A fogged hex counts as land until revealed, so legality never leaks what the fog hides. */
export const isSeaHex = (board: Pick<Board, 'hexes'>, hex: number): boolean => board.hexes[hex].terrain === 'sea' && !board.hexes[hex].fog;

/** Land hexes touching a vertex: settlements need at least one. */
export function landHexesAt(board: Pick<Board, 'hexes'>, t: Topology, v: number): number[] {
  return t.vertices[v].hexes.filter((h) => !isSeaHex(board, h));
}

export const canHoldSettlement = (board: Pick<Board, 'hexes'>, t: Topology, v: number): boolean => landHexesAt(board, t, v).length > 0;

export type EdgeKind = 'land' | 'coast' | 'sea';

/**
 * `land`: only roads. `sea`: only ships. `coast`: land on one side and water on the other, so either piece
 * fits (but never both: one piece per edge). A rim edge of a land hex counts as coast.
 */
export function edgeKind(board: Pick<Board, 'hexes'>, t: Topology, e: number): EdgeKind {
  const hexes = t.edges[e].hexes;
  const land = hexes.filter((h) => !isSeaHex(board, h)).length;
  const open = 2 - hexes.length; // sides with no hex at all
  const water = hexes.length - land + open;
  if (land === 0) return 'sea';
  return water === 0 ? 'land' : 'coast';
}

export const canHoldRoad = (board: Pick<Board, 'hexes'>, t: Topology, e: number): boolean => edgeKind(board, t, e) !== 'sea';
export const canHoldShip = (board: Pick<Board, 'hexes'>, t: Topology, e: number): boolean => edgeKind(board, t, e) !== 'land';

const islandCache = new WeakMap<object, number[]>();

/**
 * Island index per hex (land hexes joined through land neighbours), -1 for sea. Terrain never
 * changes, so this is worked out once per board. Fog hides terrain from views but not from the
 * server's state, where scoring happens.
 */
export function islandsOf(board: Pick<Board, 'hexes'>, t: Topology): number[] {
  let out = islandCache.get(board.hexes);
  if (out) return out;
  const ids: number[] = board.hexes.map(() => -1);
  let next = 0;
  for (const h of board.hexes) {
    if (ids[h.id] !== -1 || h.terrain === 'sea') continue;
    const stack = [h.id];
    ids[h.id] = next;
    while (stack.length) {
      const cur = stack.pop()!;
      for (const n of t.hexes[cur].neighbors) {
        if (ids[n] === -1 && board.hexes[n].terrain !== 'sea') {
          ids[n] = next;
          stack.push(n);
        }
      }
    }
    next++;
  }
  islandCache.set(board.hexes, (out = ids));
  return out;
}

/** Islands a vertex stands on (a corner can touch two islands only across a strait of one edge). */
export function islandsAt(board: Pick<Board, 'hexes'>, t: Topology, v: number): number[] {
  const islands = islandsOf(board, t);
  return [...new Set(t.vertices[v].hexes.map((h) => islands[h]).filter((i) => i >= 0))];
}
