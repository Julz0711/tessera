'use client';

import { create } from 'zustand';
import type { BuildMode } from './targets';

export type Panel = null | 'trade' | 'bank' | 'dev' | 'menu';

interface UiStore {
  mode: BuildMode;
  panel: Panel;
  /** Hex picked for the robber while choosing whom to steal from. */
  robberHex: number | null;
  sideTab: 'log' | 'chat';
  sideOpen: boolean;
  setMode(mode: BuildMode): void;
  setPanel(panel: Panel): void;
  setRobberHex(hex: number | null): void;
  setSide(tab: 'log' | 'chat', open?: boolean): void;
  reset(): void;
}

export const useUi = create<UiStore>((set) => ({
  mode: null,
  panel: null,
  robberHex: null,
  sideTab: 'log',
  sideOpen: true,
  setMode: (mode) => set({ mode, panel: null }),
  setPanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel, mode: null })),
  setRobberHex: (robberHex) => set({ robberHex }),
  setSide: (sideTab, open) => set((s) => ({ sideTab, sideOpen: open ?? (s.sideTab === sideTab ? !s.sideOpen : true) })),
  reset: () => set({ mode: null, panel: null, robberHex: null }),
}));
