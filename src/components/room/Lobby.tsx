'use client';

import { Bot, Check, Copy, Crown, Eye, LogOut, Pencil, Play, Plus, Share2, UserRound, Wifi, WifiOff, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FEATURES } from '@/config/features';
import { usePrefs } from '@/client/prefs';
import { api, toast, useGame } from '@/client/store';
import type { MapId, PlayerColor } from '@/engine/types';
import { TURN_TIMER_OPTIONS, type RoomDTO, type RoomSettings, type SeatDTO } from '@/shared/protocol';
import { PLAYER_COLORS } from '@/shared/colors';
import { KnightBadge } from '@/components/knight/KnightBadge';
import { Modal } from '@/components/ui/Modal';
import { Logomark } from '@/components/ui/Logomark';
import { ProfileFields, type ProfileDraft } from '@/components/profile/ProfileFields';
import { ChatPanel } from './ChatPanel';
import { MapPreview } from './MapPreview';

export function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function RoomHeader({ room, onLeave }: { room: RoomDTO; onLeave: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== 'undefined' ? `${window.location.origin}/r/${room.code}` : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast(link);
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: 'Join my game', url: link });
    } catch {
      /* user cancelled */
    }
  };
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onLeave} className="btn btn-dark px-3 py-2 text-sm" title="Leave room">
          <LogOut size={16} /> Leave
        </button>
        <Logomark size={30} />
      </div>
      <div className="flex items-center gap-2">
        <div className="glass flex items-center gap-3 px-3 py-1.5">
          <span className="label-light">Room</span>
          <span className="font-mono text-lg font-black tracking-[0.2em] text-paper">{formatCode(room.code)}</span>
        </div>
        <button type="button" onClick={copy} className="btn btn-primary px-3 py-2 text-sm">
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy invite link'}
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button type="button" onClick={share} className="btn px-3 py-2 text-sm sm:hidden" aria-label="Share">
            <Share2 size={16} />
          </button>
        )}
      </div>
    </header>
  );
}

function SeatCard({ seat, canRemove, onEdit }: { seat: SeatDTO; canRemove: boolean; onEdit?: () => void }) {
  const c = PLAYER_COLORS[seat.color];
  return (
    <li className="paper-flat animate-pop flex items-center gap-3 p-2.5 pr-3" style={{ boxShadow: `inset 6px 0 0 ${c.hex}` }}>
      <KnightBadge knight={seat.knight} color={seat.color} size={54} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-lg font-extrabold">{seat.name}</span>
          {seat.isHost && <Crown size={16} className="shrink-0 text-amber-deep" aria-label="Host" />}
          {seat.isYou && <span className="rounded bg-ink px-1.5 text-[10px] font-black uppercase tracking-wider text-paper">You</span>}
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-faint">
          {seat.isBot ? (
            <span className="flex items-center gap-1">
              <Bot size={12} /> Bot
            </span>
          ) : seat.isGuest ? (
            <span>Guest</span>
          ) : (
            <span className="flex items-center gap-1">
              <UserRound size={12} /> Profile
            </span>
          )}
          {!seat.isBot &&
            (seat.connected ? (
              <span className="flex items-center gap-1 text-moss">
                <Wifi size={12} /> online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-terracotta">
                <WifiOff size={12} /> reconnecting
              </span>
            ))}
        </div>
      </div>
      {onEdit && (
        <button type="button" onClick={onEdit} className="btn btn-ghost h-9 w-9 p-0" aria-label="Edit your look">
          <Pencil size={16} />
        </button>
      )}
      {canRemove && (
        <button type="button" onClick={() => api.removeSeat(seat.playerId)} className="btn btn-ghost h-9 w-9 p-0" aria-label={`Remove ${seat.name}`}>
          <X size={16} />
        </button>
      )}
    </li>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
  format,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  disabled?: boolean;
  format?: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`rounded-lg border-2 px-3 py-1 text-sm font-bold transition disabled:cursor-default ${
            value === o ? 'border-ink bg-ink text-paper' : 'border-ink/20 bg-white/40 enabled:hover:border-ink/60'
          } ${disabled && value !== o ? 'opacity-40' : ''}`}
        >
          {format ? format(o) : String(o)}
        </button>
      ))}
    </div>
  );
}

const MAP_OPTIONS: readonly MapId[] = ['standard', 'large', 'blackForest'];
const MAP_LABELS: Record<MapId, string> = { standard: 'Standard', large: 'Large (5–6)', blackForest: 'Black Forest' };

function MapSegmented({ value, onChange, disabled }: { value: MapId; onChange: (v: MapId) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MAP_OPTIONS.map((o) => (
        <button
          key={o}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition disabled:cursor-default ${
            value === o ? 'border-ink bg-ink text-paper' : 'border-ink/20 bg-white/40 enabled:hover:border-ink/60'
          } ${disabled && value !== o ? 'opacity-40' : ''}`}
        >
          <MapPreview map={o} size={64} />
          {MAP_LABELS[o]}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <label className={`flex items-center justify-between gap-3 ${disabled ? '' : 'cursor-pointer'}`}>
      <span className="text-sm font-bold">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full border-2 border-ink transition ${checked ? 'bg-moss' : 'bg-paper-3'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full border-2 border-ink bg-paper transition-all ${checked ? 'left-5.5' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

function SettingsPanel({ room }: { room: RoomDTO }) {
  const host = room.you.isHost;
  const s = room.settings;
  const set = (patch: Partial<RoomSettings>) => api.settings(patch);
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <span className="label">Mode</span>
        <Segmented
          value={s.mode}
          options={FEATURES.citiesAndKnights ? (['classic', 'ck'] as const) : (['classic'] as const)}
          format={(m) => (m === 'classic' ? 'Classic' : 'Cities & Knights')}
          onChange={(mode) => set({ mode })}
          disabled={!host}
        />
      </div>
      <div className="grid gap-1.5">
        <span className="label">Map</span>
        <MapSegmented value={s.map ?? 'standard'} onChange={(map) => set({ map })} disabled={!host} />
      </div>
      <div className="grid gap-1.5">
        <span className="label">Seats</span>
        <Segmented
          value={s.maxPlayers}
          options={((s.map ?? 'standard') === 'standard' ? [2, 3, 4] : [2, 3, 4, 5, 6]) as readonly number[]}
          onChange={(maxPlayers) => set({ maxPlayers })}
          disabled={!host}
        />
      </div>
      <div className="grid gap-1.5">
        <span className="label">Points to win</span>
        <div className="flex items-center gap-2">
          <button type="button" className="btn h-8 w-8 p-0" disabled={!host || s.vpToWin <= 3} onClick={() => set({ vpToWin: s.vpToWin - 1 })} aria-label="Fewer points">
            −
          </button>
          <span className="display w-10 text-center text-2xl font-black tabular">{s.vpToWin}</span>
          <button type="button" className="btn h-8 w-8 p-0" disabled={!host || s.vpToWin >= 20} onClick={() => set({ vpToWin: s.vpToWin + 1 })} aria-label="More points">
            +
          </button>
        </div>
      </div>
      <div className="grid gap-1.5">
        <span className="label">Turn timer</span>
        <Segmented value={s.turnTimer} options={TURN_TIMER_OPTIONS} format={(t) => (t === 0 ? 'Off' : `${t}s`)} onChange={(turnTimer) => set({ turnTimer })} disabled={!host} />
      </div>
      <Toggle label="Friendly robber (spares players with ≤ 2 points)" checked={s.friendlyRobber} onChange={(friendlyRobber) => set({ friendlyRobber })} disabled={!host} />
      <Toggle label="Allow spectators" checked={s.allowSpectators} onChange={(allowSpectators) => set({ allowSpectators })} disabled={!host} />
    </div>
  );
}

export function Lobby({ room }: { room: RoomDTO }) {
  const router = useRouter();
  const prefs = usePrefs();
  const [editing, setEditing] = useState<ProfileDraft | null>(null);
  const [starting, setStarting] = useState(false);
  const me = room.seats.find((s) => s.isYou);
  const host = room.you.isHost;
  const empty = Math.max(0, room.settings.maxPlayers - room.seats.length);

  const leave = async () => {
    await api.leaveRoom();
    router.push('/');
  };
  const saveProfile = async () => {
    if (!editing) return;
    const r = await api.profile(editing);
    if (r.ok) {
      prefs.set({ name: editing.name, color: editing.color, knight: editing.knight });
      setEditing(null);
    }
  };
  const start = async () => {
    setStarting(true);
    await api.start();
    setStarting(false);
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:py-8">
      <RoomHeader room={room} onLeave={leave} />
      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <section className="grid content-start gap-4">
          <div className="flex items-end justify-between">
            <h1 className="display text-4xl font-black text-paper">The table</h1>
            <span className="label-light">
              {room.seats.length}/{room.settings.maxPlayers} seated
            </span>
          </div>
          <ul className="grid gap-2.5">
            {room.seats.map((seat) => (
              <SeatCard
                key={seat.playerId}
                seat={seat}
                canRemove={host && !seat.isYou}
                onEdit={seat.isYou ? () => setEditing({ name: seat.name, color: seat.color, knight: seat.knight }) : undefined}
              />
            ))}
            {Array.from({ length: empty }, (_, i) => (
              <li key={`empty${i}`} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-foam/25 p-3 text-foam/55">
                <span className="text-sm font-semibold">Waiting for a friend…</span>
                {host && (
                  <button type="button" className="btn btn-dark px-3 py-1.5 text-sm" onClick={() => api.addBot()}>
                    <Plus size={14} /> <Bot size={15} /> Add bot
                  </button>
                )}
              </li>
            ))}
          </ul>
          {room.spectators.length > 0 && (
            <p className="flex items-center gap-2 text-sm text-foam/60">
              <Eye size={15} /> Watching: {room.spectators.map((s) => s.name + (s.isYou ? ' (you)' : '')).join(', ')}
            </p>
          )}
          <div className="glass flex min-h-56 flex-col p-3 lg:min-h-64">
            <span className="label-light mb-2">Chat</span>
            <ChatPanel className="flex-1" dark />
          </div>
        </section>

        <aside className="paper grid content-start gap-5 self-start p-5">
          <div>
            <h2 className="display text-2xl font-black">Game settings</h2>
            {!host && <p className="text-sm text-ink-faint">Only the host can change these.</p>}
          </div>
          <SettingsPanel room={room} />
          {host ? (
            <button type="button" className="btn btn-primary w-full py-3.5 text-lg" onClick={start} disabled={starting || room.seats.length < 2}>
              <Play size={20} fill="currentColor" /> {room.seats.length < 2 ? 'Add a player or bot' : 'Start game'}
            </button>
          ) : (
            <p className="rounded-xl bg-paper-2 px-4 py-3 text-center text-sm font-bold text-ink-soft">Waiting for the host to start…</p>
          )}
          {!me && room.you.isSpectator && <p className="text-center text-xs text-ink-faint">You are watching this game.</p>}
        </aside>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Your look" wide>
        {editing && (
          <>
            <ProfileFields
              value={editing}
              onChange={setEditing}
              takenColors={room.seats.filter((s) => !s.isYou).map((s) => s.color as PlayerColor)}
            />
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn px-4 py-2" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary px-5 py-2" onClick={saveProfile}>
                Save
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
