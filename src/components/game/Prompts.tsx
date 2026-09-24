'use client';

import { SkipForward } from 'lucide-react';
import { useState } from 'react';
import { CARDS, RESOURCES, handTotal, robberVictims, type PartialHand, type Prompt } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { api } from '@/client/store';
import { useUi } from '@/client/ui';
import { PLAYER_COLORS } from '@/shared/colors';
import { Modal } from '@/components/ui/Modal';
import { CardPicker } from './cards';

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

export function VictimDialog({ view, hex }: { view: PlayerView; hex: number }) {
  const ui = useUi();
  const me = view.viewer!;
  const victims = robberVictims(view, me, hex);
  return (
    <Modal open onClose={() => ui.setRobberHex(null)} title="Steal from…">
      <div className="grid gap-2">
        {victims.map((seat) => {
          const p = view.players[seat];
          const c = PLAYER_COLORS[p.color];
          return (
            <button
              key={seat}
              type="button"
              className="btn justify-between px-4 py-3"
              style={{ ['--btn-bg' as string]: c.hex, ['--btn-fg' as string]: c.ink }}
              onClick={async () => {
                ui.setRobberHex(null);
                await api.act({ type: 'moveRobber', hex, victim: seat });
              }}
            >
              <span className="text-lg">{p.name}</span>
              <span className="text-sm">{p.handCount} cards</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export function FreeRoadsBanner({ count }: { count: number }) {
  return (
    <div className="paper animate-pop flex items-center gap-3 px-4 py-2">
      <span className="font-extrabold">
        Place {count} free road{count === 1 ? '' : 's'}
      </span>
      <button type="button" className="btn btn-ghost px-2 py-1 text-sm" onClick={() => api.act({ type: 'skipFreeRoads' })}>
        <SkipForward size={14} /> Skip
      </button>
    </div>
  );
}
