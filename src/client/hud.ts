'use client';

import { create } from 'zustand';

/** The HUD panels a player can move around (desktop). The top bar and the dock stay put. */
export type HudPanel = 'side' | 'barbarian' | 'players' | 'bank' | 'dice' | 'offers' | 'zoom';
/**
 * Where a panel can go: the top or bottom of the left or right column, or a corner beside the dock
 * (only the small ones fit there: the dice and the 2D board's zoom buttons).
 */
export type HudSlot = 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom' | 'cornerLeft' | 'cornerRight';
export type HudLayout = Record<HudPanel, { slot: HudSlot; order: number }>;
export type HudScale = 'small' | 'medium' | 'large';

export const HUD_PANELS: readonly HudPanel[] = ['side', 'barbarian', 'players', 'bank', 'dice', 'offers', 'zoom'];
export const HUD_SLOTS: readonly HudSlot[] = ['leftTop', 'leftBottom', 'rightTop', 'rightBottom', 'cornerLeft', 'cornerRight'];
export const CORNER_SLOTS: readonly HudSlot[] = ['cornerLeft', 'cornerRight'];

/** How much the HUD grows or shrinks for each size setting (CSS zoom). */
export const HUD_SCALE: Record<HudScale, number> = { small: 0.85, medium: 1, large: 1.15 };

export const PANEL_LABEL: Record<HudPanel, string> = {
  side: 'Log & chat',
  barbarian: 'Barbarians',
  players: 'Players',
  bank: 'Bank',
  dice: 'Dice',
  offers: 'Trade offers',
  zoom: 'Zoom',
};

/**
 * Offers top-left, log/bank/players down the right (the barbarians' progress, in Knights &
 * Barbarians games, right under the log), dice bottom-right and the zoom buttons bottom-left. The
 * barbarians' 0.5 slots them in between in layouts saved before the panel existed, too.
 */
export const DEFAULT_HUD_LAYOUT: HudLayout = {
  offers: { slot: 'leftTop', order: 0 },
  side: { slot: 'rightTop', order: 0 },
  barbarian: { slot: 'rightTop', order: 0.5 },
  bank: { slot: 'rightTop', order: 1 },
  players: { slot: 'rightTop', order: 2 },
  dice: { slot: 'cornerRight', order: 0 },
  zoom: { slot: 'cornerLeft', order: 0 },
};

/** Whether `panel` may sit in `slot`: the corners beside the dock only have room for small panels. */
export function fits(panel: HudPanel, slot: HudSlot): boolean {
  return !CORNER_SLOTS.includes(slot) || panel === 'dice' || panel === 'zoom';
}

/** A stored layout, with anything unknown or misplaced back at its default spot. */
export function sanitizeHudLayout(raw: unknown): HudLayout {
  const out = { ...DEFAULT_HUD_LAYOUT };
  if (!raw || typeof raw !== 'object') return out;
  for (const panel of HUD_PANELS) {
    const e = (raw as Record<string, unknown>)[panel] as { slot?: unknown; order?: unknown } | undefined;
    if (!e || typeof e !== 'object') continue;
    const slot = e.slot as HudSlot;
    if (!HUD_SLOTS.includes(slot) || !fits(panel, slot)) continue;
    out[panel] = { slot, order: typeof e.order === 'number' && Number.isFinite(e.order) ? e.order : 0 };
  }
  return out;
}

/** The panels in `slot`, top to bottom. */
export function slotPanels(layout: HudLayout, slot: HudSlot): HudPanel[] {
  return HUD_PANELS.filter((p) => layout[p].slot === slot).sort((a, b) => layout[a].order - layout[b].order);
}

/** `panel` moved to the end of `slot` (unchanged if it doesn't fit there); orders are renumbered 0..n. */
export function movePanel(layout: HudLayout, panel: HudPanel, slot: HudSlot): HudLayout {
  if (!fits(panel, slot)) return layout;
  const next: HudLayout = { ...layout, [panel]: { slot, order: Number.MAX_SAFE_INTEGER } };
  for (const s of HUD_SLOTS) slotPanels(next, s).forEach((p, i) => (next[p] = { slot: s, order: i }));
  return next;
}

/** Whether the HUD layout editor is showing (in-game, desktop). */
export const useHud = create<{ editing: boolean; startEditing(): void; stopEditing(): void }>((set) => ({
  editing: false,
  startEditing: () => set({ editing: true }),
  stopEditing: () => set({ editing: false }),
}));

/**
 * Where the 2D board's zoom buttons go on wide screens: the element of the `zoom` HUD panel (null
 * while it isn't mounted, e.g. outside a game). The board portals its buttons into it.
 */
export const useZoomHost = create<{ el: HTMLElement | null; set(el: HTMLElement | null): void }>((set) => ({
  el: null,
  set: (el) => set({ el }),
}));
