import { describe, expect, it } from 'vitest';
import { fit, fitTray } from '../Hand';

describe('hand card size', () => {
  it('keeps the big cards while the hand is small', () => {
    expect(fit('xl', 0)).toBe('xl');
    expect(fit('xl', 5)).toBe('xl');
  });

  it('steps down so a full Knights & Barbarians hand still fits', () => {
    // Eight resource and commodity kinds, with progress cards on top of them.
    expect(fit('xl', 8)).toBe('md');
    expect(fit('xl', 11)).toBe('sm');
    expect(fit('xl', 14)).toBe('xs');
  });

  it('never grows past the size the screen allows', () => {
    expect(fit('md', 1)).toBe('md');
    expect(fit('md', 9)).toBe('sm');
  });
});

describe('hand tray fit', () => {
  // All eight Knights & Barbarians kinds, two of each, plus three progress cards.
  const counts = [2, 2, 2, 2, 2, 2, 2, 2];

  it('keeps full-size fanned cards when there is room', () => {
    expect(fitTray(1200, counts, 3, 2)).toEqual({ size: 'md', fan: true });
  });

  it('stops fanning before it shrinks the cards', () => {
    // md fanned needs 20 + 11 * 68 + 2 * 13 + 8 * 7 = 850px; md flat 794px.
    expect(fitTray(820, counts, 3, 2)).toEqual({ size: 'md', fan: false });
  });

  it('shrinks the cards when even flat ones do not fit', () => {
    expect(fitTray(640, counts, 3, 2)).toEqual({ size: 'sm', fan: false });
    expect(fitTray(100, counts, 3, 2)).toEqual({ size: 'xs', fan: false });
  });
});
