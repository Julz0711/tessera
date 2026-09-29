import type { Board } from '../types';
import type { Topology } from './topology';

/**
 * Land/sea helpers (Voyagers). Sea hexes are ordinary hexes with `terrain: 'sea'`; nothing here changes
 * boards without them. Board edges with no hex behind them are treated as open water, as the frame is in
 * the Seafarers rules, so a land hex on the rim still has a coast.
 */
export const isSeaHex = (board: Pick<Board, 'hexes'>, hex: number): boolean => board.hexes[hex].terrain === 'sea';

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
