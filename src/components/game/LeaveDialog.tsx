'use client';

import { Bot, DoorOpen, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { PlayerView } from '@/engine/view';
import type { RoomDTO } from '@/shared/protocol';
import { PLAYER_COLORS } from '@/shared/colors';
import { KnightBadge } from '@/components/knight/KnightBadge';
import { toast } from '@/client/store';
import { formatCode } from '@/components/room/Lobby';
import { Modal } from '@/components/ui/Modal';

const PLACES = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

/**
 * Asks before a seated player walks away from a running game, and says what happens to their seat.
 * Rendered at the page root: the top bar's layer would otherwise put it under the dock.
 */
export function LeaveDialog({ view, room, onStay, onLeave }: { view: PlayerView; room: RoomDTO; onStay: () => void; onLeave: () => Promise<void> }) {
  const [leaving, setLeaving] = useState(false);
  const me = view.viewer!;
  const p = view.players[me];
  const knight = room.seats[me]?.knight;
  // Standing by the points everyone can see; ties share a place.
  const place = view.players.filter((o) => o.publicVP > p.publicVP).length;
  const tied = view.players.some((o, i) => i !== me && o.publicVP === p.publicVP);
  const myTurn = view.turn.seat === me;
  const humans = room.seats.filter((s, i) => i !== me && !s.isBot).length;

  return createPortal(
    <Modal open onClose={onStay} title="Leave the table?">
      <div className="grid gap-4">
        <div className="flex items-center gap-3 rounded-xl bg-paper-2 p-3">
          {knight ? <KnightBadge knight={knight} color={p.color} size={56} /> : <span className="h-14 w-14 rounded-full" style={{ background: PLAYER_COLORS[p.color].hex }} />}
          <div className="grid gap-0.5">
            <span className="display text-lg font-black leading-tight">{p.name}</span>
            <span className="text-sm text-ink-soft">
              {place === 0 && !tied ? 'In the lead' : `${tied ? 'Tied for ' : ''}${PLACES[place]}${tied ? '' : ' place'}`} with <b className="text-ink">{p.publicVP}</b> of {view.settings.vpToWin} points
            </span>
          </div>
        </div>

        <ul className="grid gap-2 text-sm">
          <li className="flex gap-2.5">
            <Bot size={18} className="mt-0.5 shrink-0 text-ink-soft" />
            <span>
              Autopilot takes your seat and plays on for you{myTurn ? ', starting with this turn' : ''}
              {humans > 0 ? `, so the game goes on for the ${humans === 1 ? 'other player' : `other ${humans} players`}` : ''}.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Undo2 size={18} className="mt-0.5 shrink-0 text-ink-soft" />
            <span>
              Changed your mind? Open the invite link again (room <b className="font-mono tracking-wider">{formatCode(room.code)}</b>) to take your seat back.
            </span>
          </li>
        </ul>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-primary px-5 py-2" onClick={onStay} autoFocus>
            Keep playing
          </button>
          <button
            type="button"
            className="btn btn-danger px-4 py-2"
            disabled={leaving}
            onClick={async () => {
              setLeaving(true);
              try {
                await onLeave();
              } catch {
                // Usually a dropped connection: let them try again.
                setLeaving(false);
                toast("Couldn't leave the game. Try again.", 'error');
              }
            }}
          >
            <DoorOpen size={16} /> Leave game
          </button>
        </div>
      </div>
    </Modal>,
    document.body,
  );
}
