'use client';

import { create } from 'zustand';

export type SettingsTab = 'board' | 'gameplay' | 'interface' | 'audio' | 'language';

/** Whether the global settings overlay is open, and which tab it's showing. */
export const useSettingsUI = create<{
  open: boolean;
  tab: SettingsTab;
  show(tab?: SettingsTab): void;
  hide(): void;
}>((set) => ({
  open: false,
  tab: 'board',
  show: (tab) => set((s) => ({ open: true, tab: tab ?? s.tab })),
  hide: () => set({ open: false }),
}));
