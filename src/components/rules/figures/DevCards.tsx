import type { DevCardType } from '@/engine';
import { DEV_DECK } from '@/engine';
import { DevCardFace } from '@/components/game/cards';

const ORDER: DevCardType[] = ['knight', 'victoryPoint', 'roadBuilding', 'yearOfPlenty', 'monopoly'];

/** The development cards with how many of each are in the deck. */
export function DevCardsFigure() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 pt-2">
      {ORDER.map((t) => (
        <DevCardFace key={t} type={t} count={DEV_DECK[t]} size="md" />
      ))}
    </div>
  );
}
