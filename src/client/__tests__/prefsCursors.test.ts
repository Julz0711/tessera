import { describe, expect, it } from 'vitest';
import { sanitizePrefs } from '../prefs';

describe('pointer prefs', () => {
  it('shows others by default and shares nothing', () => {
    const p = sanitizePrefs({});
    expect(p.seeCursors).toBe(true);
    expect(p.shareCursor).toBe(false);
  });

  it('carries the old shareCursors switch over as sharing', () => {
    expect(sanitizePrefs({ shareCursors: true }).shareCursor).toBe(true);
    expect(sanitizePrefs({ shareCursors: false }).shareCursor).toBe(false);
    expect(sanitizePrefs({ shareCursors: true }).seeCursors).toBe(true);
  });

  it('prefers the new keys', () => {
    const p = sanitizePrefs({ shareCursors: true, shareCursor: false, seeCursors: false });
    expect(p.shareCursor).toBe(false);
    expect(p.seeCursors).toBe(false);
  });
});
