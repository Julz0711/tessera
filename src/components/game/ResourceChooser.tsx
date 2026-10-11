'use client';

import { Minus } from 'lucide-react';
import { CARD_COLORS } from '@/client/palette';
import type { Card, PartialHand } from '@/engine/types';
import { MiniArt } from './cardArt';

/**
 * One option: a solid key in the card's own colour with its art and name. `count` (multi-choice)
 * rides on it as a hex badge; `picked` (single-choice) outlines it in amber.
 */
function ResourceKey({
  card,
  count,
  picked,
  note,
  disabled,
  onPress,
}: {
  card: Card;
  count?: number | undefined;
  picked?: boolean;
  /** Small line under the name (what the hand holds). */
  note?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const c = CARD_COLORS[card];
  return (
    <button
      type="button"
      className={`btn relative h-24 w-22 flex-col gap-0.5 px-1 py-1.5 shadow-card ${picked ? 'ring-4 ring-amber' : ''}`}
      style={{ ['--btn-bg' as string]: c.bg, ['--btn-fg' as string]: c.ink }}
      disabled={disabled}
      aria-pressed={picked ?? (count === undefined ? undefined : count > 0)}
      aria-label={`${c.label}${count ? `, ${count} chosen` : ''}${disabled ? ', unavailable' : ''}`}
      onClick={onPress}
    >
      <MiniArt card={card} size={44} />
      <span className="text-[13px] font-black uppercase leading-none tracking-wide">{c.label}</span>
      {note && <span className="text-[10px] font-bold leading-none opacity-80">{note}</span>}
      {!!count && <span className="hex-badge right-1 top-1 w-6 text-xs tabular">{count}</span>}
    </button>
  );
}

/**
 * Pick how many of each card (discards, gold, Year of Plenty, gifts).
 * `max` caps each card: a card capped at 0 is greyed out. `showMax` prints the cap under the name,
 * only for your own hand; bank-sourced choices leave it off, so the bank's stock never shows (the
 * "+" just stops at what is there).
 */
export function ResourceChooser({
  cards,
  value,
  onChange,
  max,
  showMax,
  limitTotal,
}: {
  cards: readonly Card[];
  value: PartialHand;
  onChange: (v: PartialHand) => void;
  max?: PartialHand;
  showMax?: boolean;
  limitTotal?: number;
}) {
  const total = cards.reduce((n, c) => n + (value[c] ?? 0), 0);
  const set = (c: Card, n: number) => onChange({ ...value, [c]: Math.max(0, n) });
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-3">
        {cards.map((c) => {
          const n = value[c] ?? 0;
          const cap = max ? (max[c] ?? 0) : Infinity;
          const canAdd = n < cap && (limitTotal === undefined || total < limitTotal);
          return (
            <div key={c} className="flex flex-col items-center gap-1.5">
              {/* A full key stays pressable (it only ever greys out when there is none to take at all). */}
              <ResourceKey
                card={c}
                count={n}
                note={showMax && max ? `${cap} held` : undefined}
                disabled={cap === 0}
                onPress={() => canAdd && set(c, n + 1)}
              />
              <button type="button" className="btn h-8 w-10 p-0" disabled={n === 0} onClick={() => set(c, n - 1)} aria-label={`Remove one ${CARD_COLORS[c].label}`}>
                <Minus size={16} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button type="button" className="btn btn-ghost px-3 py-1 text-sm" disabled={total === 0} onClick={() => onChange({})}>
          Clear
        </button>
      </div>
    </div>
  );
}

/**
 * Choose one card kind. With `value`/`onChange` it is a radio (the dialog has its own confirm);
 * without `value` a press picks at once. `unavailable` greys a kind out.
 */
export function ResourcePick({
  cards,
  value,
  onChange,
  unavailable,
}: {
  cards: readonly Card[];
  value?: Card | null;
  onChange: (c: Card) => void;
  unavailable?: (c: Card) => boolean;
}) {
  return (
    <div role={value !== undefined ? 'radiogroup' : undefined} className="flex flex-wrap justify-center gap-x-2.5 gap-y-3">
      {cards.map((c) => (
        <ResourceKey key={c} card={c} picked={value === undefined ? undefined : value === c} disabled={unavailable?.(c)} onPress={() => onChange(c)} />
      ))}
    </div>
  );
}
