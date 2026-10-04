import { EventDie } from '@/components/game/Dice';
import type { EventFace } from '@/engine/types';

const FACES: EventFace[] = ['ship', 'ship', 'ship', 'trade', 'politics', 'science'];

/** Rulebook figure: the event die's six faces, three barbarian ships and the three city gates. */
export function EventDieFigure() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {FACES.map((f, i) => (
        <EventDie key={i} face={f} size={46} />
      ))}
    </div>
  );
}
