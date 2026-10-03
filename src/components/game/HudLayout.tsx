'use client';

import { Check, GripHorizontal, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DEFAULT_HUD_LAYOUT, HUD_SCALE, PANEL_LABEL, fits, movePanel, slotPanels, useHud, type HudPanel, type HudSlot } from '@/client/hud';
import { usePrefs } from '@/client/prefs';

export type HudSide = 'left' | 'right';

const SLOT_LABEL: Record<HudSlot, string> = {
  leftTop: 'Left · top',
  leftBottom: 'Left · bottom',
  rightTop: 'Right · top',
  rightBottom: 'Right · bottom',
  cornerLeft: 'Corner',
  cornerRight: 'Corner',
};

interface Drag {
  panel: HudPanel;
  x: number;
  y: number;
  over: HudSlot | null;
}

/** The slot under a point: every slot marks its drop area with `data-hud-drop`. */
function slotAt(x: number, y: number): HudSlot | null {
  for (const el of document.querySelectorAll<HTMLElement>('[data-hud-drop]')) {
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el.dataset.hudDrop as HudSlot;
  }
  return null;
}

/**
 * The wide-screen HUD: a column down each side (a top and a bottom group) and a corner on each side
 * of the dock, holding the panels wherever the player put them. In edit mode every panel gets a
 * handle to drag it onto another slot.
 */
export function DesktopHud({
  render,
  skip,
}: {
  render: (panel: HudPanel, side: HudSide) => React.ReactNode;
  /** Panels this game has no use for (the barbarians in Classic): left out, editing included. */
  skip?: (panel: HudPanel) => boolean;
}) {
  const layout = usePrefs((s) => s.hudLayout);
  const zoom = HUD_SCALE[usePrefs((s) => s.hudScale)];
  const editing = useHud((s) => s.editing);
  const [drag, setDrag] = useState<Drag | null>(null);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && useHud.getState().stopEditing();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  const item = (panel: HudPanel, side: HudSide) => (
    <div key={panel} className={`pointer-events-auto ${panel === 'side' && !editing ? 'flex min-h-0 flex-col' : 'shrink-0'} ${drag?.panel === panel ? 'opacity-40' : ''}`}>
      {editing && (
        <div
          className="mb-1 flex cursor-grab touch-none select-none items-center gap-1.5 rounded-lg border-2 border-ink bg-amber px-2 py-1 text-xs font-black uppercase tracking-wider text-ink shadow-[0_2px_0_0_#000] active:cursor-grabbing"
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            setDrag({ panel, x: e.clientX, y: e.clientY, over: null });
          }}
          onPointerMove={(e) => {
            if (!drag) return;
            const over = slotAt(e.clientX, e.clientY);
            setDrag({ ...drag, x: e.clientX, y: e.clientY, over: over && fits(panel, over) ? over : null });
          }}
          onPointerUp={() => {
            if (drag?.over) usePrefs.getState().set({ hudLayout: movePanel(layout, panel, drag.over) });
            setDrag(null);
          }}
          onPointerCancel={() => setDrag(null)}
        >
          <GripHorizontal size={14} /> {PANEL_LABEL[panel]}
        </div>
      )}
      {/* An empty panel (no offers, dice not rolled yet) still shows where it is while editing. */}
      <div className={editing ? 'flex min-h-10 min-w-24 flex-col rounded-xl empty:border-2 empty:border-dashed empty:border-foam/40' : 'contents'}>
        {render(panel, side)}
      </div>
    </div>
  );

  const group = (slot: HudSlot, side: HudSide, extra = '') => {
    const blocked = drag && !fits(drag.panel, slot);
    return (
      <div
        data-hud-drop={editing ? slot : undefined}
        className={`flex flex-col gap-2 ${editing ? '' : 'min-h-0'} ${extra} ${
          editing ? `min-h-24 rounded-2xl p-1.5 outline-2 outline-dashed ${drag?.over === slot ? 'bg-amber/15 outline-amber' : 'outline-foam/40'} ${blocked ? 'opacity-40' : ''}` : ''
        }`}
      >
        {/* mb-auto keeps the label on top in a bottom group too (those stack their panels at the bottom). */}
        {editing && <span className={`pointer-events-none px-1 ${slot.endsWith('Bottom') ? 'mb-auto' : ''} text-[10px] font-black uppercase tracking-wider text-foam/60`}>{SLOT_LABEL[slot]}</span>}
        {slotPanels(layout, slot)
          .filter((p) => !skip?.(p))
          .map((p) => item(p, side))}
      </div>
    );
  };

  const column = (side: HudSide) => (
    // The pl-4 / pr-4 strip on the board side is room for the current player's card to stick out into.
    <div
      className={`pointer-events-none absolute bottom-25 top-16 hidden w-76 flex-col gap-2 overflow-y-auto overflow-x-hidden scroll-thin lg:flex ${
        side === 'right' ? 'right-2 pl-4' : 'left-2 pr-4'
      } ${editing ? 'z-40' : 'z-10'}`}
      style={{ zoom }}
    >
      {group(side === 'left' ? 'leftTop' : 'rightTop', side, editing ? 'flex-[1_0_auto] justify-start' : '')}
      {!editing && <div className="flex-1" />}
      {group(side === 'left' ? 'leftBottom' : 'rightBottom', side, editing ? 'flex-[1_0_auto] justify-end' : '')}
    </div>
  );

  return (
    <>
      {column('left')}
      {column('right')}
      <div className={`absolute bottom-2 left-2 hidden lg:block ${editing ? 'z-40' : 'z-20'}`} style={{ zoom }}>
        {group('cornerLeft', 'left', editing ? 'min-w-40' : '')}
      </div>
      <div className={`absolute bottom-2 right-2 hidden lg:block ${editing ? 'z-40' : 'z-20'}`} style={{ zoom }}>
        {group('cornerRight', 'right', editing ? 'min-w-40' : '')}
      </div>

      {editing && (
        <div className="paper animate-pop fixed left-1/2 top-20 z-50 hidden -translate-x-1/2 items-center gap-3 px-4 py-2.5 lg:flex">
          <span className="text-sm font-bold">Drag a panel by its handle onto a slot.</span>
          <button type="button" className="btn px-3 py-1.5 text-sm" onClick={() => usePrefs.getState().set({ hudLayout: DEFAULT_HUD_LAYOUT })}>
            <RotateCcw size={15} /> Reset
          </button>
          <button type="button" className="btn btn-primary px-3 py-1.5 text-sm" onClick={() => useHud.getState().stopEditing()}>
            <Check size={15} /> Done
          </button>
        </div>
      )}
      {drag && (
        <div
          className="pointer-events-none fixed z-[70] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-ink bg-amber px-2 py-1 text-xs font-black uppercase tracking-wider text-ink shadow-[0_3px_0_0_#000]"
          style={{ left: drag.x, top: drag.y }}
        >
          {PANEL_LABEL[drag.panel]}
        </div>
      )}
    </>
  );
}
