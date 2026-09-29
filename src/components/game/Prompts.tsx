'use client';

import { SkipForward } from 'lucide-react';
import { useState } from 'react';
import { CARDS, RESOURCES, handTotal, type PartialHand, type Prompt } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { api } from '@/client/store';
import { Modal } from '@/components/ui/Modal';
import { CardPicker } from './cards';

/** Gold (Black Forest): any resources from the bank, one per settlement (two per city) on the field. */
export function GoldDialog({ view, prompt }: { view: PlayerView; prompt: Extract<Prompt, { kind: 'goldPick' }> }) {
  const [sel, setSel] = useState<PartialHand>({});
  const [busy, setBusy] = useState(false);
  const total = handTotal(sel);
  const need = Math.min(prompt.count, RESOURCES.reduce((n, r) => n + view.bank[r], 0));
  return (
    <Modal open dismissable={false} title="Gold!">
      <p className="mb-4 text-sm text-ink-soft">
        Choose {need} resource{need === 1 ? '' : 's'} from the bank.
      </p>
      <CardPicker cards={RESOURCES} value={sel} onChange={setSel} max={view.bank} limitTotal={need} />
      <div className="mt-5 flex items-center justify-between">
        <span className="text-sm font-bold text-ink-soft">
          {total}/{need} chosen
        </span>
        <button
          type="button"
          className="btn btn-primary px-5 py-2"
          disabled={total !== need || busy}
          onClick={async () => {
            setBusy(true);
            await api.act({ type: 'pickGold', cards: sel });
            setBusy(false);
          }}
        >
          Take
        </button>
      </div>
    </Modal>
  );
}

export function DiscardDialog({ view, prompt }: { view: PlayerView; prompt: Extract<Prompt, { kind: 'discard' }> }) {
  const me = view.viewer!;
  const hand = view.players[me].hand;
  const [sel, setSel] = useState<PartialHand>({});
  const [busy, setBusy] = useState(false);
  const total = handTotal(sel);
  const cards = view.mode === 'ck' ? CARDS : RESOURCES;
  return (
    <Modal open dismissable={false} title={`Discard ${prompt.count} cards`}>
      <p className="mb-4 text-sm text-ink-soft">
        {prompt.reason === 'saboteur'
          ? 'A saboteur struck! Choose the cards you give up.'
          : `A 7 was rolled and you hold ${view.players[me].handCount} cards. Choose ${prompt.count} to return to the bank.`}
      </p>
      <CardPicker cards={cards} value={sel} onChange={setSel} max={hand} limitTotal={prompt.count} />
      <div className="mt-5 flex items-center justify-between">
        <span className="text-sm font-bold text-ink-soft">
          {total}/{prompt.count} selected
        </span>
        <button
          type="button"
          className="btn btn-primary px-5 py-2"
          disabled={total !== prompt.count || busy}
          onClick={async () => {
            setBusy(true);
            await api.act({ type: 'discard', cards: sel });
            setBusy(false);
          }}
        >
          Discard
        </button>
      </div>
    </Modal>
  );
}

export function FreeRoadsBanner({ count, ships = false }: { count: number; ships?: boolean }) {
  return (
    <div className="paper animate-pop flex items-center gap-3 px-4 py-2">
      <span className="font-extrabold">
        Place {count} free road{count === 1 ? '' : 's'}{ships ? ' or ship' + (count === 1 ? '' : 's') : ''}
      </span>
      <button type="button" className="btn btn-ghost px-2 py-1 text-sm" onClick={() => api.act({ type: 'skipFreeRoads' })}>
        <SkipForward size={14} /> Skip
      </button>
    </div>
  );
}
