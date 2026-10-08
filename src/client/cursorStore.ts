'use client';

import { create } from 'zustand';
import type { BoardPoint } from '@/shared/cursors';

interface Cursor extends BoardPoint {
  /** Local clock, ms. */
  at: number;
}

/** Other players' mouse pointers over the board, by player id. Kept apart from the game store: it changes ~10 times a second. */
export const useCursors = create<{
  cursors: Record<string, Cursor>;
  put(playerId: string, at: BoardPoint | null): void;
  clear(): void;
}>((set) => ({
  cursors: {},
  put: (playerId, at) =>
    set((s) => {
      if (!at) {
        if (!(playerId in s.cursors)) return s;
        const { [playerId]: _gone, ...rest } = s.cursors;
        return { cursors: rest };
      }
      return { cursors: { ...s.cursors, [playerId]: { x: at.x, y: at.y, at: Date.now() } } };
    }),
  clear: () => set({ cursors: {} }),
}));
