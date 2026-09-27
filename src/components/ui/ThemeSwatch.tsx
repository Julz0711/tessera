import { PALETTES, type BoardThemeId } from '@/client/themes';

/** A pointy-top hexagon of radius 8 centred on (x, y). */
function hex(x: number, y: number): string {
  const w = 6.93;
  return `M${x} ${y - 8}L${x + w} ${y - 4}V${y + 4}L${x} ${y + 8}L${x - w} ${y + 4}V${y - 4}Z`;
}

/** A tiny preview of a board theme: three of its tiles, side by side like on the board, on its sea. */
export function ThemeSwatch({ theme, size = 34 }: { theme: BoardThemeId; size?: number }) {
  const p = PALETTES[theme];
  // Forest, fields and pasture, unless the theme picks what reads best (Sakura's blossoms…).
  const [left, right, below] = p.swatch?.tiles ?? [p.terrain.forest.top, p.terrain.fields.top, p.terrain.pasture.top];
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 45 36" aria-hidden className="shrink-0 rounded-md">
      <rect width="45" height="36" rx="5" fill={p.swatch?.bg ?? p.sea.deep} />
      <path d={hex(15.5, 12)} fill={left} />
      <path d={hex(29.7, 12)} fill={right} />
      <path d={hex(22.6, 24.6)} fill={below} />
    </svg>
  );
}
