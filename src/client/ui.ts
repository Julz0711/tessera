'use client';

import { create } from 'zustand';
import type { ProgressCardType } from '@/engine/types';

export type BuildWhat = 'road' | 'settlement' | 'city' | 'knight' | 'wall';

/** What a click on the board means right now (beyond setup and prompts, which the game decides). */
export type UiMode =
  | null
  | { t: 'build'; what: BuildWhat }
  | { t: 'knightMove'; from: number }
  | { t: 'knightChase'; from: number }
  | { t: 'progress'; card: number; cardType: ProgressCardType; picked: number[] };

export type Panel = null | 'trade' | 'bank' | 'dev' | 'improve' | 'progress';

/** A pending robber move waiting for the victim choice (from a 7/knight/bishop or a knight chase). */
export interface RobberPick {
  hex: number;
  chaseFrom: number | null;
}

interface UiStore {
  mode: UiMode;
  panel: Panel;
  robber: RobberPick | null;
  /** Own knight whose action menu is open. */
  knightMenu: number | null;
  sideTab: 'log' | 'chat';
  sideOpen: boolean;
  setMode(mode: UiMode): void;
  toggleBuild(what: BuildWhat): void;
  setPanel(panel: Panel): void;
  setRobber(pick: RobberPick | null): void;
  setKnightMenu(vertex: number | null): void;
  setSide(tab: 'log' | 'chat', open?: boolean): void;
  reset(): void;
}

export const useUi = create<UiStore>((set) => ({
  mode: null,
  panel: null,
  robber: null,
  knightMenu: null,
  sideTab: 'log',
  sideOpen: true,
  setMode: (mode) => set({ mode, panel: null, knightMenu: null }),
  toggleBuild: (what) =>
    set((s) => ({ mode: s.mode?.t === 'build' && s.mode.what === what ? null : { t: 'build', what }, panel: null, knightMenu: null })),
  setPanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel, mode: null, knightMenu: null })),
  setRobber: (robber) => set({ robber }),
  setKnightMenu: (knightMenu) => set({ knightMenu }),
  setSide: (sideTab, open) => set((s) => ({ sideTab, sideOpen: open ?? (s.sideTab === sideTab ? !s.sideOpen : true) })),
  reset: () => set({ mode: null, panel: null, robber: null, knightMenu: null }),
}));

export function buildMode(mode: UiMode): BuildWhat | null {
  return mode?.t === 'build' ? mode.what : null;
}
