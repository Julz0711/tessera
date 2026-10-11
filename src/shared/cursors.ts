/** A spot on the board in hex-space units (the topology's x / y, the same on the 2D and 3D boards). */
export interface BoardPoint {
  x: number;
  y: number;
}

/** No board reaches further than this from its centre; anything beyond is junk. */
export const CURSOR_LIMIT = 60;

export function isBoardPoint(v: unknown): v is BoardPoint {
  if (!v || typeof v !== 'object') return false;
  const { x, y } = v as Record<string, unknown>;
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= CURSOR_LIMIT && Math.abs(y) <= CURSOR_LIMIT;
}

/** How long another player's cursor stays after its last update. */
export const CURSOR_SHOW_MS = 3000;

/** How long a click ripple plays on the receiving boards. */
export const RIPPLE_MS = 450;
