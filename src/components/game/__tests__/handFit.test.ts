import { describe, expect, it } from 'vitest';
import { fit } from '../Hand';

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
