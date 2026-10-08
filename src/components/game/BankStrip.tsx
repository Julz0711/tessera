'use client';

import { Landmark } from 'lucide-react';
import { COMMODITIES, RESOURCES } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { CARD_COLORS } from '@/client/palette';
import { DevCardGlyph } from '@/components/ui/Glyphs';
import { MiniArt } from './cardArt';

const PER_LAYER = 5;
/** The tallest stack drawn: a full 6-player dev deck would otherwise tower over the strip. */
const MAX_LAYERS = 6;
const STEP = 2;

const layersOf = (n: number) => Math.min(MAX_LAYERS, Math.ceil(n / PER_LAYER));
const fill = (n: number) => (n <= 0 ? 'none' : n <= PER_LAYER ? 'running low' : 'plenty');

/**
 * One pile of cards: the tile is the top card, one card below it per 5 left (each peeking out above the one in front, so the pile grows taller, never wider).
 * `reserve` layers of room are always kept so the strip doesn't change height as the pile shrinks.
 */
function Pile({ n, reserve, label, bg, ink, children }: { n: number; reserve: number; label: string; bg: string; ink: string; children: React.ReactNode }) {
  const layers = layersOf(n);
  const empty = n <= 0;
  const room = STEP * (reserve - 1);
  return (
    <span className="min-w-0 flex-1" style={{ paddingTop: room }} role="img" aria-label={`${label}: ${fill(n)}`}>
      <span className="relative block">
        {Array.from({ length: layers - 1 }, (_, k) => layers - 1 - k).map((d) => (
          <span
            key={d}
            aria-hidden
            className="absolute inset-0 rounded-md border-2 border-ink"
            style={{ background: `color-mix(in srgb, ${bg} ${100 - d * 6}%, black)`, transform: `translateY(${-d * STEP}px)` }}
          />
        ))}
        <span
          className={`relative flex flex-col items-center rounded-md py-1 ${empty ? 'border-2 border-dashed border-ink/40 opacity-50 grayscale' : 'border-2 border-ink'}`}
          style={{ background: empty ? 'transparent' : bg, color: empty ? undefined : ink }}
        >
          {children}
        </span>
      </span>
    </span>
  );
}

/** What's left in the bank (and the development deck), as card piles: a layer per 5 cards, never the exact count. */
export function BankStrip({ view }: { view: PlayerView }) {
  const cards = view.mode === 'ck' ? [...RESOURCES, ...COMMODITIES] : RESOURCES;
  const classic = view.mode === 'classic';
  // Fixed room for the biggest pile: a full resource bank is 24 (5 layers), the dev deck can run longer.
  const reserve = classic ? MAX_LAYERS : 5;
  return (
    <div className="paper-flat flex items-end gap-1.5 px-2 py-1.5" title="Cards left in the bank" data-bank-anchor>
      <Landmark size={18} className="mx-0.5 mb-1.5 shrink-0 text-ink-soft" aria-label="Bank" />
      {cards.map((c) => {
        const col = CARD_COLORS[c];
        return (
          <Pile key={c} n={view.bank[c]} reserve={reserve} label={col.label} bg={col.bg} ink={col.ink}>
            <MiniArt card={c} size={17} />
          </Pile>
        );
      })}
      {classic && (
        <Pile n={view.devDeckCount} reserve={reserve} label="Development cards" bg="var(--color-sea-600)" ink="var(--color-paper)">
          <DevCardGlyph size={17} strokeWidth={2.2} />
        </Pile>
      )}
    </div>
  );
}
