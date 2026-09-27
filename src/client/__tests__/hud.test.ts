import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_HUD_LAYOUT, HUD_PANELS, HUD_SLOTS, fits, movePanel, sanitizeHudLayout, slotPanels } from '../hud';
import { read } from '../prefs';

describe('hud layout', () => {
  it('starts as the classic screen', () => {
    expect(slotPanels(DEFAULT_HUD_LAYOUT, 'rightTop')).toEqual(['side', 'bank', 'players']);
    expect(slotPanels(DEFAULT_HUD_LAYOUT, 'leftTop')).toEqual(['offers']);
    expect(slotPanels(DEFAULT_HUD_LAYOUT, 'cornerRight')).toEqual(['dice']);
  });

  it('places every panel exactly once', () => {
    const all = HUD_SLOTS.flatMap((s) => slotPanels(DEFAULT_HUD_LAYOUT, s));
    expect(all.sort()).toEqual([...HUD_PANELS].sort());
  });

  it('moves a panel to the end of a slot and renumbers both slots', () => {
    const l = movePanel(DEFAULT_HUD_LAYOUT, 'side', 'leftTop');
    expect(slotPanels(l, 'leftTop')).toEqual(['offers', 'side']);
    expect(slotPanels(l, 'rightTop')).toEqual(['bank', 'players']);
    expect(l.bank.order).toBe(0);
    expect(l.side.order).toBe(1);
  });

  it('moving within the same slot sends the panel to the bottom', () => {
    expect(slotPanels(movePanel(DEFAULT_HUD_LAYOUT, 'side', 'rightTop'), 'rightTop')).toEqual(['bank', 'players', 'side']);
  });

  it('keeps the dock corners for the dice', () => {
    expect(fits('dice', 'cornerLeft')).toBe(true);
    expect(fits('players', 'cornerLeft')).toBe(false);
    expect(movePanel(DEFAULT_HUD_LAYOUT, 'players', 'cornerLeft')).toBe(DEFAULT_HUD_LAYOUT);
    expect(slotPanels(movePanel(DEFAULT_HUD_LAYOUT, 'dice', 'leftBottom'), 'leftBottom')).toEqual(['dice']);
  });

  it('sanitizes stored layouts', () => {
    expect(sanitizeHudLayout(null)).toEqual(DEFAULT_HUD_LAYOUT);
    const l = sanitizeHudLayout({ players: { slot: 'leftBottom', order: 3 }, bank: { slot: 'cornerLeft', order: 0 }, side: { slot: 'nowhere' }, dice: 'x' });
    expect(l.players).toEqual({ slot: 'leftBottom', order: 3 });
    expect(l.bank).toEqual(DEFAULT_HUD_LAYOUT.bank);
    expect(l.side).toEqual(DEFAULT_HUD_LAYOUT.side);
    expect(l.dice).toEqual(DEFAULT_HUD_LAYOUT.dice);
  });
});

describe('prefs', () => {
  afterEach(() => vi.unstubAllGlobals());
  const stored = (v: unknown) => vi.stubGlobal('window', { localStorage: { getItem: () => JSON.stringify(v) } });

  it('reads the HUD and sound settings, dropping bad values', () => {
    stored({ hudScale: 'large', hudLayout: { dice: { slot: 'cornerLeft', order: 0 } }, sfxVolume: { dice: 0.5, win: 7, turn: 'loud' } });
    const p = read();
    expect(p.hudScale).toBe('large');
    expect(p.hudLayout.dice.slot).toBe('cornerLeft');
    expect(p.sfxVolume).toEqual({ dice: 0.5, win: 1 });
  });

  it('falls back to defaults', () => {
    stored({ hudScale: 'huge', sfxVolume: 3 });
    const p = read();
    expect(p.hudScale).toBe('medium');
    expect(p.hudLayout).toEqual(DEFAULT_HUD_LAYOUT);
    expect(p.sfxVolume).toEqual({});
  });
});
