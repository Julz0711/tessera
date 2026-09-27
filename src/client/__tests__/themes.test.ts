import { describe, expect, it } from 'vitest';
import { TERRAIN_COLORS } from '../palette';
import { BOARD_THEMES, PALETTES, isBoardTheme } from '../themes';

describe('board themes', () => {
  it('lists every theme once, each with a palette', () => {
    const ids = BOARD_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(PALETTES).sort()).toEqual([...ids].sort());
    for (const id of ids) expect(isBoardTheme(id)).toBe(true);
    expect(isBoardTheme('space')).toBe(false);
    expect(isBoardTheme(undefined)).toBe(false);
  });

  it('keeps gold the same in every theme, so it is always recognisable', () => {
    const { top, side, accent } = TERRAIN_COLORS.gold;
    for (const t of BOARD_THEMES) expect(PALETTES[t.id].terrain.gold).toMatchObject({ top, side, accent });
  });

  it('gives 2D sea patterns as CSS images', () => {
    for (const t of BOARD_THEMES) {
      const pattern = PALETTES[t.id].sea2dPattern;
      if (pattern) expect(pattern).toMatch(/^url\("data:image\/svg\+xml,[^"]+"\)$/);
    }
  });
});
