'use client';

import { Minus, Plus } from 'lucide-react';
import type { Card, PartialHand } from '@/engine/types';
import { CARD_COLORS } from '@/client/palette';
import { CARD_GLYPH } from '@/components/ui/Glyphs';

/** Small inline chip (log lines, trade summaries). */
export function CardChip({ card, n }: { card: Card; n?: number }) {
  const c = CARD_COLORS[card];
  const Glyph = CARD_GLYPH[card];
  return (
    <span
      className="mx-0.5 inline-flex translate-y-[2px] items-center gap-0.5 rounded-md border border-black/30 px-1 text-[11px] font-black leading-[18px]"
      style={{ background: c.bg, color: c.ink }}
      title={c.label}
    >
      {n !== undefined && n > 1 && <span>{n}</span>}
      <Glyph size={13} strokeWidth={2.2} />
    </span>
  );
}

export function CardList({ cards }: { cards: PartialHand }) {
  const entries = Object.entries(cards).filter(([, n]) => (n ?? 0) > 0) as [Card, number][];
  if (!entries.length) return <span className="text-ink-faint">nothing</span>;
  return (
    <span>
      {entries.map(([c, n]) => (
        <CardChip key={c} card={c} n={n} />
      ))}
    </span>
  );
}

/** A playing card in the hand. */
export function ResourceCard({
  card,
  count,
  size = 'md',
  onClick,
  selected,
  dim,
}: {
  card: Card;
  count: number;
  size?: 'sm' | 'md';
  onClick?: () => void;
  selected?: boolean;
  dim?: boolean;
}) {
  const c = CARD_COLORS[card];
  const Glyph = CARD_GLYPH[card];
  const dims = size === 'sm' ? 'h-14 w-10' : 'h-18 w-13 sm:h-20 sm:w-14';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={`${c.label}: ${count}`}
      className={`relative flex shrink-0 flex-col items-center justify-center rounded-lg border-2 border-ink ${dims} transition ${
        dim || count === 0 ? 'opacity-35' : ''
      } ${selected ? '-translate-y-2 ring-4 ring-amber' : ''} ${onClick ? 'hover:-translate-y-1' : ''}`}
      style={{ background: c.bg, color: c.ink, boxShadow: '0 3px 0 0 #1f1a14' }}
    >
      <Glyph size={size === 'sm' ? 20 : 26} strokeWidth={2} />
      <span className="mt-0.5 text-[9px] font-black uppercase tracking-wider opacity-80">{c.label}</span>
      {count > 0 && (
        <span className="absolute -right-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full border-2 border-ink bg-paper px-1 text-xs font-black text-ink">
          {count}
        </span>
      )}
    </Tag>
  );
}

/** +/- picker for choosing how many of each card (discards, trades). */
export function CardPicker({
  cards,
  value,
  onChange,
  max,
  limitTotal,
}: {
  cards: readonly Card[];
  value: PartialHand;
  onChange: (v: PartialHand) => void;
  /** Per-card maximum (e.g. what you hold); undefined = unlimited. */
  max?: PartialHand;
  limitTotal?: number;
}) {
  const total = cards.reduce((n, c) => n + (value[c] ?? 0), 0);
  const set = (c: Card, n: number) => onChange({ ...value, [c]: Math.max(0, n) });
  return (
    <div className="flex flex-wrap gap-2">
      {cards.map((c) => {
        const n = value[c] ?? 0;
        const cap = max ? (max[c] ?? 0) : Infinity;
        const canAdd = n < cap && (limitTotal === undefined || total < limitTotal);
        return (
          <div key={c} className="flex flex-col items-center gap-1">
            <ResourceCard card={c} count={n} size="sm" onClick={canAdd ? () => set(c, n + 1) : undefined} dim={cap === 0} />
            <div className="flex items-center gap-1">
              <button type="button" className="btn h-6 w-6 p-0" disabled={n === 0} onClick={() => set(c, n - 1)} aria-label={`Less ${c}`}>
                <Minus size={12} />
              </button>
              <button type="button" className="btn h-6 w-6 p-0" disabled={!canAdd} onClick={() => set(c, n + 1)} aria-label={`More ${c}`}>
                <Plus size={12} />
              </button>
            </div>
            {max && <span className="text-[10px] font-bold text-ink-faint">of {cap}</span>}
          </div>
        );
      })}
    </div>
  );
}
