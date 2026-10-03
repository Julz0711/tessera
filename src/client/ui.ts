'use client';

import { create } from 'zustand';
import type { Action, DevCardType, PartialHand, ProgressCardType } from '@/engine/types';

export type BuildWhat = 'road' | 'ship' | 'settlement' | 'city' | 'knight' | 'wall';

/** What a click on the board means right now (beyond setup and prompts, which the game decides). */
export type UiMode =
  | null
  | { t: 'build'; what: BuildWhat }
  | { t: 'knightMove'; from: number }
  | { t: 'knightChase'; from: number }
  /** Voyagers: pick one of your open-route ships, then where it sails. */
  | { t: 'shipMove'; from: number | null }
  | { t: 'progress'; card: number; cardType: ProgressCardType; picked: number[] };

/** One thing that can be built on an armed spot. */
export type SideTab = 'log' | 'chat' | 'dice';

export interface BuildOption {
  what: BuildWhat;
  action: Action;
  /** Null when it's free (setup, Road Building). */
  cost: PartialHand | null;
}

/** A board spot clicked once: its build popup stays open until a pick, another spot, a click away or Esc. */
export interface Armed {
  target: 'vertex' | 'edge';
  at: number;
  options: BuildOption[];
  /** Picked from a build mode, which ends once the piece is placed. */
  endsMode: boolean;
}

export type Panel = null | 'trade' | 'bank' | 'improve';

/** A card from the hand opened to read and play (development cards are grouped by type). */
export type CardFocus = { kind: 'dev'; type: DevCardType } | { kind: 'progress'; id: number };

/**
 * The hex picked for the robber (from a 7/knight/bishop or a knight chase), waiting in a popup there
 * for confirmation and the victim choice.
 */
export interface RobberPick {
  hex: number;
  chaseFrom: number | null;
}

interface UiStore {
  mode: UiMode;
  panel: Panel;
  card: CardFocus | null;
  robber: RobberPick | null;
  /** Own knight whose action menu is open. */
  knightMenu: number | null;
  armed: Armed | null;
  sideTab: SideTab;
  sideOpen: boolean;
  setMode(mode: UiMode): void;
  toggleBuild(what: BuildWhat): void;
  setPanel(panel: Panel): void;
  openCard(card: CardFocus | null): void;
  setRobber(pick: RobberPick | null): void;
  setKnightMenu(vertex: number | null): void;
  arm(armed: Armed | null): void;
  setSide(tab: SideTab, open?: boolean): void;
  /** Cancels build modes, panels and pending picks, but leaves an open card open. */
  cancelModes(): void;
  reset(): void;
}

export const useUi = create<UiStore>((set) => ({
  mode: null,
  panel: null,
  card: null,
  robber: null,
  knightMenu: null,
  armed: null,
  sideTab: 'log',
  sideOpen: true,
  setMode: (mode) => set({ mode, panel: null, card: null, knightMenu: null, armed: null, robber: null }),
  toggleBuild: (what) =>
    set((s) => ({
      mode: s.mode?.t === 'build' && s.mode.what === what ? null : { t: 'build', what },
      panel: null,
      card: null,
      knightMenu: null,
      armed: null,
      robber: null,
    })),
  setPanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel, mode: null, card: null, knightMenu: null, armed: null, robber: null })),
  openCard: (card) => set({ card, panel: null, mode: null, knightMenu: null, armed: null, robber: null }),
  setRobber: (robber) => set({ robber }),
  setKnightMenu: (knightMenu) => set({ knightMenu, armed: null, robber: null }),
  arm: (armed) => set({ armed }),
  setSide: (sideTab, open) => set((s) => ({ sideTab, sideOpen: open ?? (s.sideTab === sideTab ? !s.sideOpen : true) })),
  cancelModes: () => set({ mode: null, panel: null, robber: null, knightMenu: null, armed: null }),
  reset: () => set({ mode: null, panel: null, card: null, robber: null, knightMenu: null, armed: null }),
}));

export function buildMode(mode: UiMode): BuildWhat | null {
  return mode?.t === 'build' ? mode.what : null;
}

/**
 * In-game dialogs that stay open while the game moves on (live stats, admin tools): unlike panels,
 * new turns and prompts leave them be.
 */
export type GameDialog = 'stats' | 'admin';
export const useGameDialog = create<{ open: GameDialog | null; show(dialog: GameDialog): void; hide(): void }>((set) => ({
  open: null,
  show: (open) => set({ open }),
  hide: () => set({ open: null }),
}));
