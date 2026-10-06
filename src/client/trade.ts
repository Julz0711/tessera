'use client';

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { hasCards } from '@/engine/hand';
import type { Card, PartialHand, TradeOffer } from '@/engine/types';
import type { PlayerView } from '@/engine/view';
import { usePrefs } from './prefs';
import { api } from './store';
import { useUi } from './ui';

export type TradeSide = 'give' | 'want';

/** The trade being put together in the trade panel. The hand reads it too: cards on the give side leave the hand. */
interface TradeDraft {
  give: PartialHand;
  want: PartialHand;
  /** Asking "?" (the active player only): no want, the others answer with counter-offers. */
  open: boolean;
  setOpen(open: boolean): void;
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
  open: false,
  // "?" and named cards exclude each other.
  setOpen: (open) => set(open ? { open, want: {} } : { open }),
  add: (side, card) => set((s) => (side === 'give' ? { give: bump(s.give, card, 1) } : { want: bump(s.want, card, 1), open: false })),
  remove: (side, card) => set((s) => (side === 'give' ? { give: bump(s.give, card, -1) } : { want: bump(s.want, card, -1) })),
  clear: () => set({ give: {}, want: {}, open: false }),
}));

/** Opens the trade panel with this deal already on the table (a card clicked in the hand, a counter-offer). */
export function openTrade(give: PartialHand, want: PartialHand = {}): void {
  useTradeDraft.setState({ give: { ...give }, want: { ...want }, open: false });
  if (useUi.getState().panel !== 'trade') useUi.getState().setPanel('trade');
}

// However the panel closes (its X, Esc, a new turn, a prompt), the cards go back to the hand.
useUi.subscribe((s, prev) => {
  if (prev.panel === 'trade' && s.panel !== 'trade') useTradeDraft.getState().clear();
});

// ── Auto-decline ─────────────────────────────────────────────────────────────

/** With auto-decline on (a setting), how long an offer you can't afford waits before it declines itself. */
export const AUTO_DECLINE_MS = 5000;

/** An offer to the viewer, unanswered, asking for cards they don't have: what auto-decline turns down. */
export function unaffordableOffer(view: PlayerView, offer: TradeOffer): boolean {
  const me = view.viewer;
  if (me === null || offer.from === me || !offer.to.includes(me)) return false;
  if (offer.accepted.includes(me) || offer.declined.includes(me)) return false;
  return !hasCards(view.players[me].hand, offer.want);
}

/** When each offer's countdown started (shared by the timer and the bar on the offer card). */
const countdowns = new Map<number, number>();

/** Milliseconds left before this offer declines itself (the countdown starts the first time it's asked). */
export function autoDeclineLeft(id: number): number {
  let start = countdowns.get(id);
  if (start === undefined) countdowns.set(id, (start = Date.now()));
  return Math.max(0, start + AUTO_DECLINE_MS - Date.now());
}

/**
 * Runs auto-decline for the viewer: one timer per offer they can't afford, mounted once per game
 * screen (the offers tray can be on screen twice). Getting the cards or answering stops the timer;
 * if it runs out, the offer is declined like a click on Decline would.
 */
export function useAutoDecline(view: PlayerView | null): void {
  const on = usePrefs((p) => p.autoDeclineTrades);
  const counting = on && view?.phase === 'play' ? view.trades.filter((o) => unaffordableOffer(view, o)).map((o) => o.id) : [];
  const key = counting.join(',');
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const want = new Set(key ? key.split(',').map(Number) : []);
    for (const [id, timer] of timers.current) {
      if (want.has(id)) continue;
      clearTimeout(timer);
      timers.current.delete(id);
      countdowns.delete(id);
    }
    for (const id of want) {
      if (timers.current.has(id)) continue;
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          countdowns.delete(id);
          void api.act({ type: 'respondTrade', id, accept: false });
        }, autoDeclineLeft(id)),
      );
    }
  }, [key]);
  useEffect(() => {
    const all = timers.current;
    return () => {
      for (const [id, timer] of all) {
        clearTimeout(timer);
        countdowns.delete(id);
      }
      all.clear();
    };
  }, []);
}
