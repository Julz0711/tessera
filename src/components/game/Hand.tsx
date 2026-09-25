'use client';

import { COMMODITIES, RESOURCES, type DevCardType } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { useUi } from '@/client/ui';
import { CardStack, DevCardFace, ProgressCardFace } from './cards';
import { canPlayProgress } from './ck/ProgressCardDialog';
import { canPlayDev } from './DevCardDialog';

const DEV_ORDER: DevCardType[] = ['knight', 'roadBuilding', 'yearOfPlenty', 'monopoly', 'victoryPoint'];

/**
 * The viewer's hand, laid out like cards on the table: a fanned stack for each resource or
 * commodity held, then development or progress cards face up. Cards playable right now are ringed;
 * clicking one opens it.
 */
export function Hand({ view }: { view: PlayerView }) {
  const ui = useUi();
  const p = view.players[view.viewer!];
  const ck = view.mode === 'ck';
  const held = (ck ? [...RESOURCES, ...COMMODITIES] : RESOURCES).filter((c) => p.hand[c] > 0);
  const dev = ck
    ? []
    : DEV_ORDER.map((type) => ({ type, cards: p.devCards.filter((c) => c.type === type) })).filter((g) => g.cards.length > 0);
  const special = ck ? p.progress.length : dev.length;

  return (
    // The inner row is only as wide as its cards, so it centres when it fits and scrolls from the
    // first card when it doesn't.
    <div className="max-w-full overflow-x-auto scroll-thin">
      <div className="mx-auto flex w-max items-end gap-2.5 px-3 pb-2 pt-3 sm:gap-3">
        {held.length === 0 && special === 0 && (
          <div className="grid h-18 place-items-center rounded-lg border-2 border-dashed border-white/20 px-5 text-xs font-bold text-foam/60 sm:h-20">
            No cards in hand
          </div>
        )}
        {held.map((c) => (
          <CardStack key={c} card={c} count={p.hand[c]} />
        ))}
        {held.length > 0 && special > 0 && <span aria-hidden className="h-12 w-px self-center bg-white/20" />}
        {dev.map(({ type, cards }) => (
          <DevCardFace
            key={type}
            type={type}
            count={cards.length}
            fresh={type !== 'victoryPoint' && cards.every((c) => c.boughtOn >= view.turn.n)}
            glow={canPlayDev(view, type)}
            onClick={() => ui.openCard({ kind: 'dev', type })}
          />
        ))}
        {ck &&
          p.progress.map((card) => (
            <ProgressCardFace key={card.id} card={card} glow={canPlayProgress(view, card)} onClick={() => ui.openCard({ kind: 'progress', id: card.id })} />
          ))}
      </div>
    </div>
  );
}
