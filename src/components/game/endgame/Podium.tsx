import { Crown } from 'lucide-react';
import type { GameReport } from '@/engine/report';
import type { PlayerView } from '@/engine/view';
import type { RoomDTO } from '@/shared/protocol';
import { PLAYER_COLORS } from '@/shared/colors';
import { KnightBadge } from '@/components/knight/KnightBadge';
import { SurroundFrame } from '@/components/progression/ItemArt';
import { itemById } from '@/shared/progression';
import { PointIcons } from './PointIcons';

/** Step heights by rank (1st tallest). */
const STEP = [96, 70, 52];

export function PlayerBadge({ seat, view, room, size }: { seat: number; view: PlayerView; room: RoomDTO; size: number }) {
  const seatInfo = room.seats[seat];
  if (!seatInfo) return null;
  const badge = <KnightBadge color={view.players[seat].color} size={size} />;
  return seatInfo.crew ? <SurroundFrame id={seatInfo.crew.loadout.surround} size={size}>{badge}</SurroundFrame> : badge;
}

/** The worn title under a podium name (none for bots and players without one). */
function SeatTitle({ seat, room }: { seat: number; room: RoomDTO }) {
  const id = room.seats[seat]?.crew?.loadout.title;
  const name = id ? itemById(id)?.name : null;
  return name ? <span className="max-w-full truncate text-[11px] font-bold text-ink-soft">{name}</span> : null;
}

/**
 * The top three on steps, ordered 2nd, 1st, 3rd, standing on one floor line. Each player's points
 * sit in a row of their own underneath, so a player with more kinds of points doesn't lift their step.
 */
export function Podium({ order, view, room, report }: { order: number[]; view: PlayerView; room: RoomDTO; report: GameReport }) {
  const top = order.slice(0, 3);
  const places = (top.length >= 3 ? [1, 0, 2] : top.length === 2 ? [1, 0] : [0]).map((rank) => ({ rank, seat: top[rank] }));
  const column = 'flex min-w-0 flex-1 basis-0 flex-col items-center';
  return (
    <div>
      <ol className="flex items-end justify-center gap-1.5 border-b-2 border-ink sm:gap-3">
        {places.map(({ rank, seat }) => {
          const p = view.players[seat];
          const c = PLAYER_COLORS[p.color];
          const delta = report.players[seat].rating?.delta;
          const first = rank === 0;
          return (
            <li key={seat} className={column} style={{ maxWidth: 170 }}>
              {first && <Crown size={22} className="mb-0.5 text-amber-deep" fill="currentColor" aria-label="Winner" />}
              <PlayerBadge seat={seat} view={view} room={room} size={first ? 64 : 52} />
              <div className="mt-1 flex max-w-full items-center gap-1 text-sm font-bold">
                <span className="truncate">{p.name}</span>
                {seat === view.viewer && <span className="text-xs font-bold text-ink-soft">(you)</span>}
              </div>
              <SeatTitle seat={seat} room={room} />
              <div
                className="mt-1.5 flex w-full flex-col items-center justify-center rounded-t-xl border-2 border-b-0 border-ink"
                style={{ height: STEP[rank], background: c.hex, color: c.ink, boxShadow: `inset 0 -6px 0 ${c.dark}55` }}
              >
                <span className={`display font-black leading-none ${first ? 'text-4xl' : 'text-3xl'}`}>{p.vp}</span>
                {delta != null && <span className="mt-0.5 text-[11px] font-bold">{delta > 0 ? '+' : ''}{delta} Elo</span>}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex items-start justify-center gap-1.5 sm:gap-3">
        {places.map(({ seat }) => (
          <div key={seat} className={column} style={{ maxWidth: 170 }}>
            <PointIcons points={report.players[seat].points} color={view.players[seat].color} className="justify-center" />
          </div>
        ))}
      </div>
    </div>
  );
}
