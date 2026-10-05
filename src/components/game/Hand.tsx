'use client';

import { COMMODITIES, RESOURCES, handLimit, handTotal, type Card, type DevCardType } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { openTrade, useTradeDraft } from '@/client/trade';
import { useUi } from '@/client/ui';
import { CardStack, DevCardFace, ProgressCardFace, type CardSize } from './cards';
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
export function Hand({ view, max = 'md' }: { view: PlayerView; /** The biggest the cards may get; a full hand shrinks below it. */ max?: CardSize }) {
  const ui = useUi();
  const draft = useTradeDraft();
  const p = view.players[view.viewer!];
  const ck = view.mode === 'ck';
  // While trading, cards put up on the give side have left the hand.
  const trading = ui.panel === 'trade';
  const count = (c: Card) => p.hand[c] - (trading ? Math.min(draft.give[c] ?? 0, p.hand[c]) : 0);
  const held = (ck ? [...RESOURCES, ...COMMODITIES] : RESOURCES).filter((c) => count(c) > 0);
  const dev = ck
    ? []
    : DEV_ORDER.map((type) => ({ type, cards: p.devCards.filter((c) => c.type === type) })).filter((g) => g.cards.length > 0);
  const special = ck ? p.progress.length : dev.length;
  // Clicking a card starts a trade with it (or, while trading, puts it up), whenever the Trade button would work.
  const canTrade = view.phase === 'play' && view.turn.rolled && view.pending.length === 0;
  // Over the hand limit: a 7 now would cost half the hand, so the stacks warn in red.
  const total = handTotal(p.hand);
  const limit = handLimit(view, view.viewer!);
  const over = view.phase === 'play' && total > limit;
  // Everything in hand has to fit beside the dock without scrolling: with all eight kinds in
  // Knights & Barbarians, plus progress cards, the cards step down a size instead.
  const size = fit(max, held.length + special);

  return (
    // The inner row is only as wide as its cards, so it centres when it fits and scrolls from the
    // first card when it doesn't.
    <div className="max-w-full overflow-x-auto scroll-thin" data-hand-anchor>
      <div className={`${max === 'xl' ? '' : 'mx-auto'} flex w-max items-end gap-2.5 px-3 pb-2 pt-3 sm:gap-3`}>
        {held.length === 0 && special === 0 && !trading && (
          <div className={`grid place-items-center rounded-lg border-2 border-dashed border-white/20 px-5 text-xs font-bold text-foam/60 ${max === 'xl' ? 'h-27.5' : 'h-18 sm:h-20'}`}>
            No cards in hand
          </div>
        )}
        {held.length > 0 && (
          <div
            className={`-mx-1.5 -my-1 flex items-end gap-2.5 rounded-xl px-1.5 py-1 transition-colors sm:gap-3 ${over ? 'bg-danger/25 ring-2 ring-danger/70' : ''}`}
            title={over ? `${total} cards, over your limit of ${limit}: a 7 would cost you ${Math.floor(total / 2)}` : undefined}
          >
            {held.map((c) => (
              <CardStack
                key={c}
                card={c}
                size={size}
                count={count(c)}
                held={p.hand[c]}
                warn={over}
                onClick={canTrade ? () => (trading ? draft.add('give', c) : openTrade({ [c]: 1 })) : undefined}
              />
            ))}
          </div>
        )}
        {held.length > 0 && special > 0 && <span aria-hidden className="h-12 w-px self-center bg-white/20" />}
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
