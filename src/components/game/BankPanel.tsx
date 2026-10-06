'use client';

import { ArrowRight, Landmark } from 'lucide-react';
import { useState } from 'react';
import { CARDS, RESOURCES, bankRatio, type Card } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { CARD_COLORS } from '@/client/palette';
import { api } from '@/client/store';
import { useUi } from '@/client/ui';
import { Modal } from '@/components/ui/Modal';
import { ResourceCard } from './cards';

export function BankPanel({ view }: { view: PlayerView }) {
  const ui = useUi();
  const me = view.viewer!;
  const hand = view.players[me].hand;
  const cards = view.mode === 'ck' ? CARDS : RESOURCES;
  const [give, setGive] = useState<Card | null>(null);
  const [get, setGet] = useState<Card | null>(null);
  const [count, setCount] = useState(1);
  // The cheapest rate the player has: what they need of one card to trade at all.
  const bestRatio = Math.min(...cards.map((c) => bankRatio(view, me, c)));
  const canTrade = cards.some((c) => hand[c] >= bankRatio(view, me, c));
  const ratio = give ? bankRatio(view, me, give) : 0;
  const maxCount = give && get ? Math.min(Math.floor(hand[give] / ratio), view.bank[get]) : 0;

  const trade = async () => {
    if (!give || !get) return;
    const r = await api.act({ type: 'bankTrade', give, get, count: Math.min(count, maxCount) });
    if (r.ok) {
      setCount(1);
      if (hand[give] - ratio * count < ratio) setGive(null);
    }
  };

  return (
    <Modal open onClose={() => ui.setPanel(null)} title="Trade with the bank" wide>
      <div className="grid gap-5">
        <div className="grid gap-2">
          <span className="label">Give</span>
          <div className="flex flex-wrap gap-2.5">
            {cards.map((c) => {
              const r = bankRatio(view, me, c);
              const ok = hand[c] >= r;
              return (
                <div key={c} className="flex flex-col items-center gap-1">
                  <ResourceCard card={c} count={hand[c]} size="sm" selected={give === c} dim={!ok} onClick={ok ? () => (setGive(c), setCount(1), get === c && setGet(null)) : undefined} />
                  <span className={`rounded-md px-1 text-[11px] font-black ${r < 4 ? 'bg-amber' : 'text-ink-faint'}`}>{r}:1</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="grid gap-2">
          <span className="label">Receive</span>
          <div className="flex flex-wrap gap-2.5">
            {cards.map((c) => {
              const ok = view.bank[c] > 0 && c !== give;
              return (
                <div key={c} className="flex flex-col items-center gap-1">
                  <ResourceCard card={c} count={0} size="sm" selected={get === c} dim={!ok} onClick={ok ? () => (setGet(c), setCount(1)) : undefined} />
                  <span className="text-[10px] font-bold text-ink-faint">bank {view.bank[c]}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {canTrade ? (
            <div className="flex items-center gap-2">
              <button type="button" className="btn h-8 w-8 p-0" disabled={count <= 1} onClick={() => setCount((n) => n - 1)}>
                −
              </button>
              <span className="text-sm font-bold">
                {give && get ? (
                  <>
                    {ratio * count} <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-xs border border-ink align-[-1px]" style={{ background: CARD_COLORS[give].bg }} /> {CARD_COLORS[give].label} <ArrowRight size={14} strokeWidth={2.5} className="inline align-[-2px]" aria-hidden /><span className="sr-only">for</span> {count} {CARD_COLORS[get].label}
                  </>
                ) : (
                  'Pick what to give and receive'
                )}
              </span>
              <button type="button" className="btn h-8 w-8 p-0" disabled={count >= maxCount} onClick={() => setCount((n) => n + 1)}>
                +
              </button>
            </div>
          ) : (
            <p className="min-w-0 flex-1 text-sm font-bold text-ink-soft">
              You need {bestRatio} of one card to trade
              {bestRatio > 3 ? ' (3 with a 3:1 harbor, 2 with a matching 2:1 harbor)' : bestRatio === 3 ? ' (2 with a matching 2:1 harbor)' : ''}.
            </p>
          )}
          <button type="button" className="btn btn-primary px-5 py-2" disabled={!give || !get || maxCount < 1} onClick={trade}>
            <Landmark size={16} /> Trade
          </button>
        </div>
      </div>
    </Modal>
  );
}
