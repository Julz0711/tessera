'use client';

import { create } from 'zustand';
import type { Card, PartialHand } from '@/engine/types';
import { CARDS } from '@/engine/types';

/**
 * Flying cards: short animations that carry cards between places on screen (the board, the bank,
 * a player's panel, your hand) so you see who got what. Places are found by data attributes:
 * `data-board-anchor`, `data-bank-anchor`, `data-hand-anchor` and `data-seat-anchor="<seat>"`.
 */
export interface Flight {
  id: number;
  /** The card's face, or null for a face-down card (hidden information). */
  card: Card | null;
  from: { x: number; y: number };
  to: { x: number; y: number };
  delay: number;
  /** Headed for your own hand: drawn bigger, so you see what you got. */
  big: boolean;
}

interface FxStore {
  flights: Flight[];
  remove(id: number): void;
}

export const useFx = create<FxStore>((set) => ({
  flights: [],
  remove: (id) => set((s) => ({ flights: s.flights.filter((f) => f.id !== id) })),
}));

let nextId = 1;

/** Where a place is on screen right now (the first visible match), optionally with a little scatter. */
function point(selectors: string[], scatter = 0): { x: number; y: number } | null {
  if (typeof document === 'undefined') return null;
  for (const el of selectors.flatMap((sel) => [...document.querySelectorAll(sel)])) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return { x: r.left + r.width / 2 + (Math.random() - 0.5) * scatter, y: r.top + r.height / 2 + (Math.random() - 0.5) * scatter };
    }
  }
  return null;
}

export type Place = 'board' | 'bank' | { seat: number } | { hex: number };

/**
 * The on-screen spot for a place; your own seat is your hand, and a card lands on its own stack there.
 * The bank is its strip on wide screens and the dock's Bank button where that strip is hidden.
 */
function placeSelectors(place: Place, me: number | null, card: Card | null = null): string[] {
  if (place === 'board') return ['[data-board-anchor]'];
  if (place === 'bank') return ['[data-bank-anchor]'];
  // A single tile is only on screen in the 2D board; the 3D board falls back to its middle.
  if ('hex' in place) return [`[data-hex-anchor="${place.hex}"]`, '[data-board-anchor]'];
  if (place.seat !== me) return [`[data-seat-anchor="${place.seat}"]`];
  return card ? [`[data-hand-card="${card}"]`, '[data-hand-anchor]'] : ['[data-hand-anchor]'];
}

/** Lists a hand as individual cards (at most `cap`, so a big monopoly doesn't flood the screen). */
export function cardList(h: PartialHand, cap = 5): Card[] {
  const out: Card[] = [];
  for (const c of CARDS) for (let i = 0; i < (h[c] ?? 0) && out.length < cap; i++) out.push(c);
  return out;
}

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Sends cards flying from one place to another, one after the other. */
export function fly(from: Place, to: Place, cards: (Card | null)[], me: number | null, delay = 0): void {
  if (!cards.length || reducedMotion()) return;
  const flights: Flight[] = [];
  const toMe = typeof to === 'object' && 'seat' in to && to.seat === me;
  cards.forEach((card, i) => {
    const a = point(placeSelectors(from, me, card), from === 'board' ? 160 : typeof from === 'object' && 'hex' in from ? 30 : 16);
    const b = point(placeSelectors(to, me, card), toMe ? 6 : 12);
    if (!a || !b) return;
    flights.push({ id: nextId++, card, from: a, to: b, delay: delay + i * 90, big: toMe });
  });
  if (flights.length) useFx.setState((s) => ({ flights: [...s.flights.slice(-40), ...flights] }));
}
