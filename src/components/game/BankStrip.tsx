'use client';

import { Landmark } from 'lucide-react';
import { COMMODITIES, RESOURCES } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { CARD_COLORS } from '@/client/palette';
import { DevCardGlyph } from '@/components/ui/Glyphs';
import { MiniArt } from './cardArt';

/** What's left in the bank (and the development deck), like a card tray on the table. */
export function BankStrip({ view }: { view: PlayerView }) {
  const cards = view.mode === 'ck' ? [...RESOURCES, ...COMMODITIES] : RESOURCES;
  return (
    <div className="paper-flat flex items-center gap-1.5 px-2 py-1.5" title="Cards left in the bank" data-bank-anchor>
      <Landmark size={18} className="mx-0.5 shrink-0 text-ink-soft" aria-label="Bank" />
      {cards.map((c) => {
        const col = CARD_COLORS[c];
        const low = view.bank[c] <= 3;
        return (
          <span
            key={c}
            className="flex flex-1 flex-col items-center rounded-md border border-ink/40 py-0.5"
            style={{ background: col.bg, color: col.ink }}
            title={`${col.label}: ${view.bank[c]} left`}
          >
            <MiniArt card={c} size={17} />
            <span className={`text-[11px] font-black tabular ${low ? 'underline decoration-2' : ''}`}>{view.bank[c]}</span>
          </span>
        );
      })}
      {view.mode === 'classic' && (
        <span className="flex flex-1 flex-col items-center rounded-md border border-ink/40 bg-sea-600 py-0.5 text-paper" title={`Development cards: ${view.devDeckCount} left`}>
          <DevCardGlyph size={13} strokeWidth={2.2} />
          <span className="text-[11px] font-black tabular">{view.devDeckCount}</span>
        </span>
      )}
    </div>
  );
}
