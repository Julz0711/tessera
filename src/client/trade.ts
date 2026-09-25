'use client';

import { create } from 'zustand';
import type { Card, PartialHand } from '@/engine/types';
import { useUi } from './ui';

export type TradeSide = 'give' | 'want';

/** The trade being put together in the trade panel. The hand reads it too: cards on the give side leave the hand. */
interface TradeDraft {
  give: PartialHand;
  want: PartialHand;
  add(side: TradeSide, card: Card): void;
  remove(side: TradeSide, card: Card): void;
  clear(): void;
}

function bump(h: PartialHand, card: Card, by: number): PartialHand {
  return { ...h, [card]: Math.max(0, (h[card] ?? 0) + by) };
}

export const useTradeDraft = create<TradeDraft>((set) => ({
  give: {},
  want: {},
  add: (side, card) => set((s) => (side === 'give' ? { give: bump(s.give, card, 1) } : { want: bump(s.want, card, 1) })),
  remove: (side, card) => set((s) => (side === 'give' ? { give: bump(s.give, card, -1) } : { want: bump(s.want, card, -1) })),
  clear: () => set({ give: {}, want: {} }),
}));

/** Opens the trade panel with this deal already on the table (a card clicked in the hand, a counter-offer). */
export function openTrade(give: PartialHand, want: PartialHand = {}): void {
  useTradeDraft.setState({ give: { ...give }, want: { ...want } });
  if (useUi.getState().panel !== 'trade') useUi.getState().setPanel('trade');
}

// However the panel closes (its X, Esc, a new turn, a prompt), the cards go back to the hand.
useUi.subscribe((s, prev) => {
  if (prev.panel === 'trade' && s.panel !== 'trade') useTradeDraft.getState().clear();
});
