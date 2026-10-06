'use client';

import { useEffect, useState } from 'react';
import { COMMODITIES, RESOURCES, handLimit, handTotal, type Card, type DevCardType } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { openTrade, useTradeDraft } from '@/client/trade';
import { useUi } from '@/client/ui';
import { CardStack, DevCardFace, MAX_SLIVERS, ProgressCardFace, stackStep, type CardSize } from './cards';
import { canPlayProgress } from './ck/ProgressCardDialog';
import { canPlayDev } from './DevCardDialog';

const DEV_ORDER: DevCardType[] = ['knight', 'roadBuilding', 'yearOfPlenty', 'monopoly', 'victoryPoint'];

/** How many stacks each size still fits in the hand's share of the screen. */
const FITS: [CardSize, number][] = [
  ['xl', 5],
  ['md', 8],
  ['sm', 11],
  ['xs', Infinity],
];

/** Card widths in px on wide screens, for fitting the hand tray to the room it has. */
const CARD_W: Partial<Record<CardSize, number>> = { xs: 32, sm: 40, md: 52 };
const GAP = 12;

/** The least a stacked card may peek out by and still read as a stack, in px. */
const MIN_STEP = 3;
/** How far a stack's extra cards may reach into the gap before it (they sit tighter, like Colonist's), in px. */
export const TUCK = 8;

/**
 * The hand's layout for `room` px: the biggest card size whose cards fit side by side, with each
 * kind's extra cards peeking out to the left of it by as much as the room left over (and part of
 * the gap before it) allows, the full `stackStep` at most. Short of even a sliver of room, the cards lie flat with their counts.
 */
export function fitTray(room: number, counts: number[], special: number, rules: number, max: CardSize = 'md'): { size: CardSize; fan: boolean; step: number } {
  const flat = (size: CardSize) => 20 + (counts.length + special) * (CARD_W[size]! + GAP) + rules * (1 + GAP);
  const slivers = counts.reduce((n, c) => n + Math.min(c - 1, MAX_SLIVERS), 0);
  const tucked = counts.filter((c) => c > 1).length * TUCK;
  const sizes = (['md', 'sm', 'xs'] as const).filter((s) => s !== 'md' || max !== 'sm');
  for (const size of sizes) {
    if (room < flat(size)) continue;
    const spare = room - flat(size) + tucked;
    const step = slivers ? Math.min(stackStep(size), Math.floor(spare / slivers)) : stackStep(size);
    return step >= MIN_STEP ? { size, fan: true, step } : { size, fan: false, step: 0 };
  }
  return { size: 'xs', fan: false, step: 0 };
}

/** The biggest size no larger than `max` that fits `stacks` cards. */
export function fit(max: CardSize, stacks: number): CardSize {
  const from = FITS.findIndex(([s]) => s === max);
  return FITS.slice(from).find(([, n]) => stacks <= n)?.[0] ?? 'xs';
}

/**
 * The viewer's hand, laid out like cards on the table: a fanned stack for each resource or
 * commodity held, then development or progress cards face up. Cards playable right now are ringed;
 * clicking one opens it.
 */
export function Hand({
  view,
  max = 'md',
  tray = false,
  room,
}: {
  view: PlayerView;
  /** The biggest the cards may get; a full hand shrinks below it. */
  max?: CardSize;
  /** Laid out on the white hand tray (wide screens) rather than straight on the board. */
  tray?: boolean;
  /** The tray's room in px: the cards shrink, then stop fanning, to fit it. */
  room?: number;
}) {
  const ui = useUi();
  // Without a measured room the hand spans the screen above the dock, so the viewport is its room.
  const [screen, setScreen] = useState<number>();
  useEffect(() => {
    if (room !== undefined) return;
    const update = () => setScreen(window.innerWidth - (tray ? 16 : 24));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [tray, room]);
  const fitRoom = room ?? screen;
  const draft = useTradeDraft();
  const p = view.players[view.viewer!];
  const ck = view.mode === 'ck';
  // While trading, cards put up on the give side have left the hand.
  const trading = ui.panel === 'trade';
  const count = (c: Card) => p.hand[c] - (trading ? Math.min(draft.give[c] ?? 0, p.hand[c]) : 0);
  const resources = RESOURCES.filter((c) => count(c) > 0);
  const commodities = ck ? COMMODITIES.filter((c) => count(c) > 0) : [];
  const held = [...resources, ...commodities];
  const dev = ck
    ? []
    : DEV_ORDER.map((type) => ({ type, cards: p.devCards.filter((c) => c.type === type) })).filter((g) => g.cards.length > 0);
  const special = ck ? p.progress.length : dev.length;
  // Clicking a card starts a trade with it on your turn (as the Trade key would), or puts it up
  // while a trade is open, a counter-offer to someone else's included.
  const canTrade = view.phase === 'play' && view.turn.rolled && view.pending.length === 0 && (view.turn.seat === view.viewer || trading);
  // Over the hand limit: a 7 now would cost half the hand, so the stacks warn in red.
  const total = handTotal(p.hand);
  const limit = handLimit(view, view.viewer!);
  const over = view.phase === 'play' && total > limit;
  // Everything in hand has to fit beside the dock without scrolling: with all eight kinds in
  // Knights & Barbarians, plus progress cards, the cards step down a size instead.
  const rules = (commodities.length && resources.length ? 1 : 0) + (held.length && special ? 1 : 0);
  const { size, fan, step } =
    fitRoom !== undefined ? fitTray(fitRoom, held.map((c) => count(c)), special, rules, max) : { size: fit(max, held.length + special), fan: true, step: undefined };

  return (
    // The inner row is only as wide as its cards, so it centres when it fits and scrolls from the
    // first card when it doesn't.
    <div className="max-w-full overflow-x-auto scroll-thin" data-hand-anchor>
      <div className={`${tray ? 'px-2.5 pb-1.5 pt-2' : 'mx-auto px-3 pb-2 pt-3'} flex w-max items-end gap-2.5 sm:gap-3`}>
        {held.length === 0 && special === 0 && !trading && (
          <div className={`grid place-items-center rounded-lg border-2 border-dashed px-5 text-xs font-bold ${tray ? 'border-ink/20 text-ink-faint' : 'border-white/20 text-foam/60'} ${max === 'xl' ? 'h-27.5' : 'h-18'}`}>
            No cards in hand
          </div>
        )}
        {held.length > 0 && (
          <div
            className={`-my-1 flex items-end gap-2.5 rounded-lg px-1.5 py-1 transition-colors sm:gap-3 ${over ? 'bg-danger/25 ring-2 ring-inset ring-danger/70' : ''}`}
            title={over ? `${total} cards, over your limit of ${limit}: a 7 would cost you ${Math.floor(total / 2)}` : undefined}
          >
            {held.map((c) => [
              // Knights & Barbarians: a thin rule between the resources and the commodities.
              c === commodities[0] && resources.length > 0 && <span key="rule" aria-hidden className={`h-12 w-px self-center ${tray ? 'bg-ink/15' : 'bg-white/20'}`} />,
              <CardStack
                key={c}
                card={c}
                size={size}
                count={count(c)}
                held={p.hand[c]}
                warn={over}
                fan={fan}
                step={step}
                tuck={tray ? TUCK : 0}
                onClick={canTrade ? () => (trading ? draft.add('give', c) : openTrade({ [c]: 1 })) : undefined}
              />,
            ])}
          </div>
        )}
        {held.length > 0 && special > 0 && <span aria-hidden className={`h-12 w-px self-center ${tray ? 'bg-ink/15' : 'bg-white/20'}`} />}
        {dev.map(({ type, cards }) => (
          <DevCardFace
            key={type}
            type={type}
            size={size}
            count={cards.length}
            fresh={type !== 'victoryPoint' && cards.every((c) => c.boughtOn >= view.turn.n)}
            glow={canPlayDev(view, type)}
            onClick={() => ui.openCard({ kind: 'dev', type })}
          />
        ))}
        {ck &&
          p.progress.map((card) => (
            <ProgressCardFace key={card.id} card={card} size={size} glow={canPlayProgress(view, card)} onClick={() => ui.openCard({ kind: 'progress', id: card.id })} />
          ))}
      </div>
    </div>
  );
}
