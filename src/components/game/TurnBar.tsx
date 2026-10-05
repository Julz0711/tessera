'use client';

import { statusLine } from '@/client/describe';
import type { PlayerView } from '@/engine/view';
import type { RoomDTO } from '@/shared/protocol';
import { WithKeys } from '@/components/ui/Kbd';
import { useCountdown } from './Dock';

/**
 * The turn pill on wide screens, as on colonist: it sits right on top of the dock, with the turn
 * timer in its own box above the End turn key.
 */
export function TurnBar({ view, room }: { view: PlayerView; room: RoomDTO }) {
  const status = statusLine(view);
  const seconds = useCountdown(room.deadline);
  const low = seconds !== null && seconds <= 10;
  return (
    <div className="flex w-full items-stretch gap-2" aria-live="polite">
      <div
        className={`game-status flex min-w-0 flex-1 items-center justify-center rounded-lg border-2 border-ink px-3 py-1.5 text-center text-[13px] font-extrabold leading-tight ${
          status.mine ? 'bg-amber text-ink' : 'bg-sea-800 text-paper'
        }`}
      >
        <WithKeys text={status.text} />
      </div>
      {seconds !== null && (
        <div
          className={`grid w-22 shrink-0 place-items-center rounded-lg border-2 border-ink font-mono text-sm font-black tabular ${
            low ? 'animate-pulse bg-danger text-paper' : 'bg-sea-800 text-paper'
          }`}
          title="Time left this turn"
        >
          {`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}
        </div>
      )}
    </div>
  );
}
