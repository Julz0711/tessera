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
    expect(fitTray(1200, counts, 3, 2)).toEqual({ size: 'md', fan: true, step: 7 });
  });

  it('tightens the stacks, then lays them flat, before it shrinks the cards', () => {
    // md flat needs 20 + 11 * 68 + 2 * 13 = 794px; the 8 slivers share what is left.
    expect(fitTray(820, counts, 3, 2)).toEqual({ size: 'md', fan: true, step: 3 });
    expect(fitTray(800, counts, 3, 2)).toEqual({ size: 'md', fan: false, step: 0 });
  });

  it('shrinks the cards when even flat ones do not fit', () => {
    expect(fitTray(640, counts, 3, 2)).toEqual({ size: 'sm', fan: false, step: 0 });
    expect(fitTray(100, counts, 3, 2)).toEqual({ size: 'xs', fan: false, step: 0 });
  });
});
