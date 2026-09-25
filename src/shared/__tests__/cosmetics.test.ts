import { describe, expect, it } from 'vitest';
import { clampCosmetics, FRAMES, isUnlocked, NO_UNLOCKS, sanitizeCosmetics, TITLES } from '../cosmetics';

describe('cosmetics', () => {
  it('sanitizes unknown ids to the default', () => {
    expect(sanitizeCosmetics({ frame: 'diamond', title: 'emperor' })).toEqual({ frame: 'none', title: null });
    expect(sanitizeCosmetics(null)).toEqual({ frame: 'none', title: null });
    expect(sanitizeCosmetics({ frame: 'wood', title: 'settler' })).toEqual({ frame: 'wood', title: 'settler' });
  });

  it('unlocks by games played, games won and rating', () => {
    const stats = { gamesPlayed: 12, gamesWon: 5, rating: 1120 };
    expect(clampCosmetics({ frame: 'iron', title: 'baron' }, stats)).toEqual({ frame: 'iron', title: 'baron' });
    expect(clampCosmetics({ frame: 'gold', title: 'duke' }, stats)).toEqual({ frame: 'none', title: null });
    expect(clampCosmetics({ frame: 'emerald', title: 'champion' }, stats)).toEqual({ frame: 'emerald', title: null });
    // No rating (guests) never unlocks rating rewards.
    expect(clampCosmetics({ frame: 'emerald' }, { ...stats, rating: null }).frame).toBe('none');
  });

  it('gives new players something to pick', () => {
    expect(FRAMES.filter((f) => isUnlocked(f.req, NO_UNLOCKS)).length).toBeGreaterThan(1);
    expect(TITLES.filter((t) => isUnlocked(t.req, NO_UNLOCKS)).length).toBeGreaterThan(0);
    expect(new Set(FRAMES.map((f) => f.id)).size).toBe(FRAMES.length);
    expect(new Set(TITLES.map((t) => t.id)).size).toBe(TITLES.length);
  });
});
