'use client';

import { create } from 'zustand';
import type { DevCardType, PartialHand, ProgressCardType } from '@/engine/types';

export type BuildWhat = 'road' | 'settlement' | 'city' | 'knight' | 'wall';

/** What a click on the board means right now (beyond setup and prompts, which the game decides). */
export type UiMode =
  | null
  | { t: 'build'; what: BuildWhat }
  | { t: 'knightMove'; from: number }
  | { t: 'knightChase'; from: number }
  | { t: 'progress'; card: number; cardType: ProgressCardType; picked: number[] }
  /** A build-hint spot clicked once, waiting for a second click (or Build) to confirm. */
  | { t: 'confirm'; what: 'road' | 'settlement' | 'city'; at: number };

export type Panel = null | 'trade' | 'bank' | 'improve';

/** A card from the hand opened to read and play (development cards are grouped by type). */
export type CardFocus = { kind: 'dev'; type: DevCardType } | { kind: 'progress'; id: number };

/** A pending robber move waiting for the victim choice (from a 7/knight/bishop or a knight chase). */
export interface RobberPick {
  hex: number;
  chaseFrom: number | null;
}

interface UiStore {
  mode: UiMode;
  panel: Panel;
  card: CardFocus | null;
  /** Cards to give, pre-picked when the trade panel is opened from the hand. */
  tradeGive: PartialHand | null;
  robber: RobberPick | null;
  /** Own knight whose action menu is open. */
  knightMenu: number | null;
  sideTab: 'log' | 'chat';
  sideOpen: boolean;
  setMode(mode: UiMode): void;
  toggleBuild(what: BuildWhat): void;
  setPanel(panel: Panel): void;
  openCard(card: CardFocus | null): void;
  /** Opens the trade panel with these cards already on the give side. */
  openTrade(give: PartialHand): void;
  setRobber(pick: RobberPick | null): void;
  setKnightMenu(vertex: number | null): void;
  setSide(tab: 'log' | 'chat', open?: boolean): void;
  /** Cancels build modes, panels and pending picks, but leaves an open card open. */
  cancelModes(): void;
  reset(): void;
}

export const useUi = create<UiStore>((set) => ({
  mode: null,
  panel: null,
  card: null,
  tradeGive: null,
  robber: null,
  knightMenu: null,
  sideTab: 'log',
  sideOpen: true,
  setMode: (mode) => set({ mode, panel: null, card: null, knightMenu: null }),
  toggleBuild: (what) =>
    set((s) => ({ mode: s.mode?.t === 'build' && s.mode.what === what ? null : { t: 'build', what }, panel: null, card: null, knightMenu: null })),
  setPanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel, tradeGive: null, mode: null, card: null, knightMenu: null })),
  openTrade: (tradeGive) => set({ panel: 'trade', tradeGive, mode: null, card: null, knightMenu: null }),
  openCard: (card) => set({ card, panel: null, mode: null, knightMenu: null }),
  setRobber: (robber) => set({ robber }),
  setKnightMenu: (knightMenu) => set({ knightMenu }),
  setSide: (sideTab, open) => set((s) => ({ sideTab, sideOpen: open ?? (s.sideTab === sideTab ? !s.sideOpen : true) })),
  cancelModes: () => set({ mode: null, panel: null, robber: null, knightMenu: null }),
  reset: () => set({ mode: null, panel: null, card: null, robber: null, knightMenu: null }),
}));

export function buildMode(mode: UiMode): BuildWhat | null {
  return mode?.t === 'build' || mode?.t === 'confirm' ? mode.what : null;
}
