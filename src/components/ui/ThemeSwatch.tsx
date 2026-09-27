import { PALETTES, type BoardThemeId } from '@/client/themes';

/** A pointy-top hexagon of radius 8 centred on (x, y). */
function hex(x: number, y: number): string {
  const w = 6.93;
  return `M${x} ${y - 8}L${x + w} ${y - 4}V${y + 4}L${x} ${y + 8}L${x - w} ${y + 4}V${y - 4}Z`;
}

/** A tiny preview of a board theme: three of its tiles, side by side like on the board, on its sea. */
export function ThemeSwatch({ theme, size = 34 }: { theme: BoardThemeId; size?: number }) {
  const p = PALETTES[theme];
  // Sakura's forest reads as its blossoms, not its green ground.
  const forest = theme === 'sakura' ? p.terrain.forest.accent : p.terrain.forest.top;
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 45 36" aria-hidden className="shrink-0 rounded-md">
      <rect width="45" height="36" rx="5" fill={p.sea.deep} />
      <path d={hex(15.5, 12)} fill={forest} />
      <path d={hex(29.7, 12)} fill={p.terrain.fields.top} />
      <path d={hex(22.6, 24.6)} fill={p.terrain.pasture.top} />
    </svg>
  );
}
