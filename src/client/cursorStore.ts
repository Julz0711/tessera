'use client';

import { create } from 'zustand';
import { RIPPLE_MS, type BoardPoint } from '@/shared/cursors';

interface Cursor extends BoardPoint {
  /** Local clock, ms. */
  at: number;
}

export interface Ripple extends BoardPoint {
  id: number;
  playerId: string;
}
let rippleSeq = 0;

/** Other players' mouse pointers over the board, by player id. Kept apart from the game store: it changes ~10 times a second. */
export const useCursors = create<{
  cursors: Record<string, Cursor>;
  /** Click ripples still playing (each removed after RIPPLE_MS). */
  ripples: Ripple[];
  put(playerId: string, at: BoardPoint | null): void;
  ping(playerId: string, at: BoardPoint): void;
  clear(): void;
}>((set) => ({
  cursors: {},
  ripples: [],
  ping: (playerId, at) => {
    const id = ++rippleSeq;
    set((s) => ({ ripples: [...s.ripples.slice(-11), { id, playerId, x: at.x, y: at.y }] }));
    setTimeout(() => set((s) => ({ ripples: s.ripples.filter((r) => r.id !== id) })), RIPPLE_MS + 60);
  },
  put: (playerId, at) =>
    set((s) => {
      if (!at) {
        if (!(playerId in s.cursors)) return s;
        const { [playerId]: _gone, ...rest } = s.cursors;
        return { cursors: rest };
      }
      return { cursors: { ...s.cursors, [playerId]: { x: at.x, y: at.y, at: Date.now() } } };
    }),
  clear: () => set({ cursors: {}, ripples: [] }),
}));
