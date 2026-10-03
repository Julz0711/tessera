'use client';

import { ChartColumn, MessageSquare, ScrollText } from 'lucide-react';
import { useState } from 'react';
import type { PlayerView } from '@/engine/view';
import { useGame } from '@/client/store';
import { useGameDialog, type SideTab } from '@/client/ui';
import { ChatPanel } from '@/components/room/ChatPanel';
import { Modal } from '@/components/ui/Modal';
import { DiceHistogram } from './DiceStats';
import { LogPanel } from './LogPanel';

const TABS: { id: SideTab; label: string; icon: React.ReactNode }[] = [
  { id: 'log', label: 'Game log', icon: <ScrollText size={15} /> },
  { id: 'chat', label: 'Chat', icon: <MessageSquare size={15} /> },
  { id: 'dice', label: 'Dice', icon: <ChartColumn size={15} /> },
];

/** Log and chat as top-bar buttons on phones, opening one sheet whose tabs also reach the dice statistics. */
export function MobileSide({ view }: { view: PlayerView }) {
  const [open, setOpen] = useState<SideTab | null>(null);
  const unread = useGame((s) => s.unread);
  const button = (id: SideTab, label: string, icon: React.ReactNode) => (
    <button key={id} type="button" className="btn btn-dark relative h-10 w-10 p-0" onClick={() => setOpen(id)} aria-label={label} aria-haspopup="dialog">
      {icon}
      {id === 'chat' && unread > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-ink bg-amber" />}
    </button>
  );
  return (
    <>
      {button('log', 'Game log', <ScrollText size={17} />)}
      {button('chat', 'Chat', <MessageSquare size={17} />)}
      <Modal open={open !== null} onClose={() => setOpen(null)} title="At the table">
        <div role="tablist" className="mb-3 flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={open === t.id}
              onClick={() => setOpen(t.id)}
              className={`btn flex-1 gap-1.5 px-2 py-1.5 text-sm ${open === t.id ? 'btn-primary' : ''}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="mobile-side-content flex flex-col rounded-xl bg-sea-900 p-3 text-paper">
          {open === 'log' && <LogPanel view={view} className="min-h-0 flex-1" />}
          {open === 'chat' && <ChatPanel className="min-h-0 flex-1" dark />}
          {open === 'dice' && (
            <div className="scroll-thin grid min-h-0 flex-1 content-start gap-2 overflow-y-auto">
              {view.stats ? <DiceHistogram dice={view.stats.dice} compact /> : <p className="text-sm text-foam/40">No rolls recorded for this game.</p>}
              <button
                type="button"
                className="btn justify-self-start px-3 py-1.5 text-xs"
                onClick={() => {
                  setOpen(null);
                  useGameDialog.getState().show('stats');
                }}
              >
                <ChartColumn size={14} /> Full stats
              </button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
