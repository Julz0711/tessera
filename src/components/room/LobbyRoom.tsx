'use client';

import { Bot, Crown, Pencil, Plus, Shirt, UserRound, Wifi, WifiOff, X } from 'lucide-react';
import { api } from '@/client/store';
import { PLAYER_COLORS } from '@/shared/colors';
import { itemById, itemsIn } from '@/shared/progression';
import type { RoomDTO, SeatDTO } from '@/shared/protocol';
import { KnightBadge } from '@/components/knight/KnightBadge';
import { ItemArt, LevelBadge, SurroundFrame } from '@/components/progression/ItemArt';

/**
 * The lobby as a room: every seat is a spot on the floor where the player stands as their
 * character on a pad ringed in their colour, with their banner beside them and a nameplate below.
 * Open seats are empty pads. Seats sit side by side, so the wall and floor run on as one room.
 * The room is desktop only; phones and tablets get the nameplates as a plain list.
 */

/** Bots have no loadout: they take turns wearing the free placeholders. */
const BOT_LOOKS = itemsIn('character').filter((i) => i.unlock.kind === 'free').map((i) => i.id);

export function Pad({ color, dashed }: { color?: string; dashed?: boolean }) {
  return (
    <svg viewBox="0 0 160 52" className="absolute bottom-3 left-1/2 w-[82%] max-w-[200px] -translate-x-1/2" aria-hidden="true">
      {dashed ? (
        <polygon points="6,22 80,4 154,22 80,40" fill="none" stroke="var(--color-sea-300)" strokeOpacity=".55" strokeWidth="2" strokeDasharray="7 6" strokeLinejoin="round" />
      ) : (
        <>
          <polygon points="6,22 80,4 154,22 154,32 80,50 6,32" fill="#0b2531" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="6,22 80,4 154,22 80,40" fill="#245d73" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />
          <polygon points="28,22 80,9 132,22 80,35" fill="none" stroke={color} strokeWidth="3.5" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

/** One spot of the room's floor: wall above, floor below; alternate spots shade the wall like facets. */
function Spot({ index, children }: { index: number; children: React.ReactNode }) {
  const wall = index % 2 ? '#12384a' : 'var(--color-sea-800)';
  return (
    <div
      className="relative h-60"
      style={{ background: `linear-gradient(180deg, ${wall} 0 56%, var(--color-sea-950) 56% calc(56% + 3px), #143c4e calc(56% + 3px) 100%)` }}
    >
      {children}
    </div>
  );
}

function Figure({ seat, index }: { seat: SeatDTO; index: number }) {
  const character = seat.crew?.loadout.character ?? BOT_LOOKS[index % BOT_LOOKS.length];
  const banner = seat.crew?.loadout.banner ?? null;
  return (
    <>
      <Pad color={PLAYER_COLORS[seat.color].hex} />
      <span className={`absolute bottom-7 left-1/2 -translate-x-[62%] ${seat.connected ? '' : 'opacity-50'}`}>
        <ItemArt id={character} color={seat.color} size={140} />
      </span>
      {banner && (
        <span className="absolute bottom-10 left-[60%]">
          <ItemArt id={banner} color={seat.color} size={96} />
        </span>
      )}
    </>
  );
}

function Nameplate({ seat, onEdit, onRemove, onLook }: { seat: SeatDTO; onEdit?: () => void; onRemove?: () => void; onLook?: () => void }) {
  const title = seat.crew?.loadout.title ? itemById(seat.crew.loadout.title)?.name : null;
  return (
    <div className="paper-flat grid gap-1.5 p-2">
      <div className="flex min-w-0 items-center gap-2">
        <SurroundFrame id={seat.crew?.loadout.surround ?? null} size={40}>
          <KnightBadge color={seat.color} size={40} />
        </SurroundFrame>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate font-bold leading-tight">{seat.name}</span>
            {seat.isHost && <Crown size={14} className="shrink-0 text-amber-deep" aria-label="Host" />}
          </div>
          <div className="flex min-w-0 items-center gap-1 text-[11px] font-bold text-ink-faint">
            {seat.isBot ? (
              <span className="flex items-center gap-1"><Bot size={12} /> Bot</span>
            ) : seat.connected ? (
              <span className="flex items-center gap-1 text-moss"><Wifi size={12} /> {seat.isGuest ? 'Guest' : 'Online'}</span>
            ) : (
              <span className="flex items-center gap-1 text-terracotta"><WifiOff size={12} /> Reconnecting</span>
            )}
          </div>
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} className="btn btn-ghost h-7 w-7 shrink-0 p-0" aria-label={`Remove ${seat.name}`} title="Remove">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="flex min-h-6 items-center gap-1.5">
        {seat.crew && <LevelBadge level={seat.crew.level} size={20} />}
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-ink-soft">{title ?? (seat.isBot ? 'Crewmate' : !seat.isGuest ? <span className="inline-flex items-center gap-1"><UserRound size={11} /> Profile</span> : '')}</span>
        {seat.isYou && <span className="shrink-0 rounded-[4px] bg-ink px-1.5 text-[10px] font-black uppercase tracking-caps text-paper">You</span>}
        {onLook && (
          <button type="button" onClick={onLook} className="btn btn-ghost h-7 w-7 shrink-0 p-0" aria-label="Change your character, banner, title and surround" title="Look">
            <Shirt size={13} />
          </button>
        )}
        {onEdit && (
          <button type="button" onClick={onEdit} className="btn btn-ghost h-7 w-7 shrink-0 p-0" aria-label="Edit your name and colour" title="Name and colour">
            <Pencil size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function OpenSeat({ host }: { host: boolean }) {
  return (
    <div className="grid min-h-[84px] place-items-center gap-1.5 rounded-[6px] border-2 border-dashed border-foam/25 p-2 text-center">
      <span className="text-xs font-bold text-foam/60">Open seat</span>
      {host && (
        <button type="button" className="btn btn-dark gap-1.5 px-2.5 py-1 text-xs leading-none" onClick={() => api.addBot()}>
          <Plus size={14} strokeWidth={2.75} /> Add bot
        </button>
      )}
    </div>
  );
}

type Props = { room: RoomDTO; onEditProfile: () => void; onWardrobe: () => void };

/** Desktop: the room scene with everyone standing as their character. */
function Scene({ room, onEditProfile, onWardrobe }: Props) {
  const host = room.you.isHost;
  const empty = Math.max(0, room.settings.maxPlayers - room.seats.length);
  const spots = room.settings.maxPlayers;
  // Five or six spots only share one row on wide screens; below that they wrap in threes.
  const row = spots > 4 ? 'grid-cols-3 xl:[grid-template-columns:repeat(var(--spots),minmax(0,1fr))]' : '[grid-template-columns:repeat(var(--spots),minmax(0,1fr))]';
  return (
    <div
      className={`hidden overflow-hidden rounded-[6px] border-2 border-ink bg-sea-950 lg:grid ${row}`}
      style={{ '--spots': spots } as React.CSSProperties}
    >
      {room.seats.map((seat, i) => (
        <div key={seat.playerId} className="animate-pop grid content-start">
          <Spot index={i}>
            {seat.isYou ? (
              <button type="button" onClick={onWardrobe} className="group absolute inset-0" aria-label="Change your character, banner, title and surround">
                <Figure seat={seat} index={i} />
                <span className="btn btn-dark absolute right-2 top-2 h-8 gap-1 px-2 text-xs opacity-90 group-hover:opacity-100"><Shirt size={14} /> Look</span>
              </button>
            ) : (
              <Figure seat={seat} index={i} />
            )}
            {host && !seat.isYou && (
              <button type="button" onClick={() => api.removeSeat(seat.playerId)} className="btn btn-dark absolute right-2 top-2 h-8 w-8 p-0" aria-label={`Remove ${seat.name}`} title="Remove">
                <X size={14} />
              </button>
            )}
          </Spot>
          <div className="p-1.5">
            <Nameplate seat={seat} onEdit={seat.isYou ? onEditProfile : undefined} />
          </div>
        </div>
      ))}
      {Array.from({ length: empty }, (_, k) => (
        <div key={`open${k}`} className="grid content-start">
          <Spot index={room.seats.length + k}>
            <Pad dashed />
            <Plus size={22} strokeWidth={3} className="absolute bottom-[1.6rem] left-1/2 -translate-x-1/2 text-sea-300/70" aria-hidden="true" />
          </Spot>
          <div className="p-1.5"><OpenSeat host={host} /></div>
        </div>
      ))}
    </div>
  );
}

/** Phones and tablets: just the nameplates, so the table stays short. */
function List({ room, onEditProfile, onWardrobe }: Props) {
  const host = room.you.isHost;
  const empty = Math.max(0, room.settings.maxPlayers - room.seats.length);
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:hidden">
      {room.seats.map((seat) => (
        <li key={seat.playerId} className="animate-pop">
          <Nameplate seat={seat}
            onEdit={seat.isYou ? onEditProfile : undefined}
            onLook={seat.isYou ? onWardrobe : undefined}
            onRemove={host && !seat.isYou ? () => api.removeSeat(seat.playerId) : undefined} />
        </li>
      ))}
      {Array.from({ length: empty }, (_, k) => <li key={`open${k}`}><OpenSeat host={host} /></li>)}
    </ul>
  );
}

export function LobbyRoom(props: Props) {
  return (
    <>
      <Scene {...props} />
      <List {...props} />
    </>
  );
}
